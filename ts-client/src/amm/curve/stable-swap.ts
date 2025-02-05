import { BN } from '@coral-xyz/anchor';
import { BorshCoder, Idl } from '@project-serum/anchor';
import { Fraction, Percent, ZERO, Fees, computeD, computeY, normalizedTradeFee } from './stable-swap-math';
import { AccountInfo, PublicKey } from '@solana/web3.js';
import { OutResult, SwapCurve, TradeDirection, getPriceImpact } from '.';
import { CURVE_TYPE_ACCOUNTS } from '../constants';
import MarinadeIDL from '../marinade-finance.json';
import { Depeg, DepegType, PoolFees, StakePool, StakePoolLayout, TokenMultiplier } from '../types';

// Precision for base pool virtual price
const PRECISION = new BN(1_000_000);
const BASE_CACHE_EXPIRE = new BN(60 * 10);

const N_COINS = BigInt(2);

export class StableSwap implements SwapCurve {
  constructor(
    private amp: number,
    private tokenMultiplier: TokenMultiplier,
    public depeg: Depeg,
    private extraAccounts: Map<String, AccountInfo<Buffer>>,
    private onChainTime: BN,
    private stakePoolPubkey: PublicKey,
  ) { }

  private getBasePoolVirtualPrice(depegType: DepegType): BN {
    if (depegType['marinade']) {
      const account = this.extraAccounts.get(CURVE_TYPE_ACCOUNTS.marinade.toBase58());
      const coder = new BorshCoder(MarinadeIDL as any as Idl);
      const stake = coder.accounts.decode('State', account!.data);
      const msolPrice = stake.msolPrice as BN;
      return msolPrice.mul(PRECISION).div(new BN(0x1_0000_0000));
    }
    if (depegType['lido']) {
      const account = this.extraAccounts.get(CURVE_TYPE_ACCOUNTS.lido.toBase58());
      //https://github.com/meteora-ag/mercurial-dynamic-amm/blob/main/programs/amm/tests/test_depeg_price.rs#L33
      const stSolSupply = new BN(account!.data.readBigInt64LE(73).toString());
      const stSolBalance = new BN(account!.data.readBigInt64LE(81).toString());
      return stSolBalance.mul(PRECISION).div(stSolSupply);
    }
    if (depegType['splStake']) {
      const account = this.extraAccounts.get(this.stakePoolPubkey.toBase58());
      const stakePool: StakePool = StakePoolLayout.decode(account!.data);
      return stakePool.totalLamports.mul(PRECISION).div(stakePool.poolTokenSupply);
    }
    throw new Error('UnsupportedBasePool');
  }

  private updateDepegInfoIfExpired() {
    if (!this.depeg.depegType['none']) {
      const expired = this.onChainTime.toNumber() > this.depeg.baseCacheUpdated.add(BASE_CACHE_EXPIRE).toNumber();
      if (expired) {
        this.depeg.baseVirtualPrice = this.getBasePoolVirtualPrice(this.depeg.depegType);
        this.depeg.baseCacheUpdated = new BN(this.onChainTime);
      }
    }
  }

  private upscaleTokenA(tokenAAmount: BN): BN {
    const { tokenAMultiplier } = this.tokenMultiplier;
    const normalizedTokenAAmount = tokenAAmount.mul(tokenAMultiplier);
    if (!this.depeg.depegType['none']) {
      return normalizedTokenAAmount.mul(PRECISION);
    }
    return normalizedTokenAAmount;
  }

  private downscaleTokenA(tokenAAmount: BN): BN {
    const { tokenAMultiplier } = this.tokenMultiplier;
    const denormalizedTokenAAmount = tokenAAmount.div(tokenAMultiplier);
    if (!this.depeg.depegType['none']) {
      return denormalizedTokenAAmount.div(PRECISION);
    }
    return denormalizedTokenAAmount;
  }

  private upscaleTokenB(tokenBAmount: BN): BN {
    const { tokenBMultiplier } = this.tokenMultiplier;
    const normalizedTokenBAmount = tokenBAmount.mul(tokenBMultiplier);
    if (!this.depeg.depegType['none']) {
      return normalizedTokenBAmount.mul(this.depeg.baseVirtualPrice);
    }
    return normalizedTokenBAmount;
  }

  private downscaleTokenB(tokenBAmount: BN): BN {
    const { tokenBMultiplier } = this.tokenMultiplier;
    const denormalizedTokenBAmount = tokenBAmount.div(tokenBMultiplier);
    if (!this.depeg.depegType['none']) {
      return denormalizedTokenBAmount.div(this.depeg.baseVirtualPrice);
    }
    return denormalizedTokenBAmount;
  }

  private computeOutAmountWithoutSlippage(
    sourceAmount: BN,
    swapSourceAmount: BN,
    swapDestinationAmount: BN,
    invariantD: BN,
  ): BN {
    const SIXTEEN = new BN(16);
    const FOUR = new BN(4);
    const TWO = new BN(2);
    const amp = new BN(this.amp);
    const a = amp.mul(SIXTEEN);
    const b = a;
    const c = invariantD.mul(FOUR).sub(invariantD.mul(amp).mul(SIXTEEN));

    const numerator = TWO.mul(a)
      .mul(swapSourceAmount)
      .add(b.mul(swapDestinationAmount))
      .add(c)
      .mul(swapDestinationAmount);

    const denominator = a.mul(swapSourceAmount).add(TWO.mul(b).mul(swapDestinationAmount).add(c)).mul(swapSourceAmount);

    return sourceAmount.mul(numerator).div(denominator);
  }

  computeOutAmount(
    sourceAmount: BN,
    swapSourceAmount: BN,
    swapDestinationAmount: BN,
    tradeDirection: TradeDirection,
  ): OutResult {
    this.updateDepegInfoIfExpired();
    const [upscaledSourceAmount, upscaledSwapSourceAmount, upscaledSwapDestinationAmount] =
      tradeDirection == TradeDirection.AToB
        ? [
          this.upscaleTokenA(sourceAmount),
          this.upscaleTokenA(swapSourceAmount),
          this.upscaleTokenB(swapDestinationAmount),
        ]
        : [
          this.upscaleTokenB(sourceAmount),
          this.upscaleTokenB(swapSourceAmount),
          this.upscaleTokenA(swapDestinationAmount),
        ];

    const invariantD = computeD(
      BigInt(this.amp),
      BigInt(upscaledSwapSourceAmount.toString()),
      BigInt(upscaledSwapDestinationAmount.toString()),
    );

    const newSwapSourceAmount = BigInt(upscaledSwapSourceAmount.toString()) + BigInt(upscaledSourceAmount.toString());
    const newSwapDestinationAmount = computeY(BigInt(this.amp), newSwapSourceAmount, invariantD);

    let outAmount = upscaledSwapDestinationAmount.sub(new BN(newSwapDestinationAmount.toString())).sub(new BN(1));

    let outAmountWithoutSlippage = this.computeOutAmountWithoutSlippage(
      upscaledSourceAmount,
      upscaledSwapSourceAmount,
      upscaledSwapDestinationAmount,
      new BN(invariantD.toString()),
    );

    [outAmount, outAmountWithoutSlippage] =
      tradeDirection == TradeDirection.AToB
        ? [this.downscaleTokenB(outAmount), this.downscaleTokenB(outAmountWithoutSlippage)]
        : [this.downscaleTokenA(outAmount), this.downscaleTokenA(outAmountWithoutSlippage)];

    return {
      outAmount,
      priceImpact: getPriceImpact(outAmount, outAmountWithoutSlippage),
    };
  }

  computeD(tokenAAmount: BN, tokenBAmount: BN): BN {
    this.updateDepegInfoIfExpired();
    const upscaledTokenAAmount = this.upscaleTokenA(tokenAAmount);
    const upscaledTokenBAmount = this.upscaleTokenB(tokenBAmount);
    const invariantD = new BN(
      computeD(
        BigInt(this.amp),
        BigInt(upscaledTokenAAmount.toString()),
        BigInt(upscaledTokenBAmount.toString()),
      ).toString(),
    );
    if (!this.depeg.depegType['none']) {
      return invariantD.div(PRECISION);
    }
    return invariantD;
  }

  computeInAmount(destAmount: BN, swapSourceAmount: BN, swapDestinationAmount: BN, tradeDirection: TradeDirection): BN {
    this.updateDepegInfoIfExpired();
    const [upscaledDestAmount, upscaledSwapSourceAmount, upscaledSwapDestinationAmount] =
      tradeDirection == TradeDirection.AToB
        ? [
          this.upscaleTokenB(destAmount),
          this.upscaleTokenA(swapSourceAmount),
          this.upscaleTokenB(swapDestinationAmount),
        ]
        : [
          this.upscaleTokenA(destAmount),
          this.upscaleTokenB(swapSourceAmount),
          this.upscaleTokenA(swapDestinationAmount),
        ];

    const invariantD = computeD(
      BigInt(this.amp),
      BigInt(upscaledSwapSourceAmount.toString()),
      BigInt(upscaledSwapDestinationAmount.toString()),
    );

    const newSwapDestAmount = BigInt(upscaledSwapDestinationAmount.toString()) - BigInt(upscaledDestAmount.toString());
    const newSwapSourceAmount = computeY(BigInt(this.amp), newSwapDestAmount, invariantD);
    const inAmount = new BN(newSwapSourceAmount.toString()).sub(swapSourceAmount);

    return tradeDirection == TradeDirection.AToB ? this.downscaleTokenA(inAmount) : this.downscaleTokenB(inAmount);
  }

  computeImbalanceDeposit(
    depositAAmount: BN,
    depositBAmount: BN,
    swapTokenAAmount: BN,
    swapTokenBAmount: BN,
    lpSupply: BN,
    fees: PoolFees,
  ): BN {
    this.updateDepegInfoIfExpired();

    const [upscaledDepositAAmount, upscaledDepositBAmount, upscaledSwapTokenAAmount, upscaledSwapTokenBAmount] = [
      this.upscaleTokenA(depositAAmount),
      this.upscaleTokenB(depositBAmount),
      this.upscaleTokenA(swapTokenAAmount),
      this.upscaleTokenB(swapTokenBAmount),
    ];
    const { mintAmount } = calculateEstimatedMintAmount(
      BigInt(this.amp),
      Helper.toFees(fees),
      BigInt(lpSupply.toString()),
      [BigInt(upscaledSwapTokenAAmount.toString()), BigInt(upscaledSwapTokenBAmount.toString())],
      BigInt(upscaledDepositAAmount.toString()),
      BigInt(upscaledDepositBAmount.toString()),
    );

    return new BN(mintAmount.toString());
  }

  computeWithdrawOne(
    lpAmount: BN,
    lpSupply: BN,
    swapTokenAAmount: BN,
    swapTokenBAmount: BN,
    fees: PoolFees,
    tradeDirection: TradeDirection,
  ): BN {
    this.updateDepegInfoIfExpired();
    const [upscaledSwapTokenAAmount, upscaledSwapTokenBAmount] = [
      this.upscaleTokenA(swapTokenAAmount),
      this.upscaleTokenB(swapTokenBAmount),
    ];

    const { withdrawAmountBeforeFees } = calculateEstimatedWithdrawOneAmount({
      ampFactor: BigInt(this.amp),
      feeInfo: Helper.toFees(fees),
      lpTotalSupply: BigInt(lpSupply.toString()),
      poolTokenAmount: BigInt(lpAmount.toString()),
      reserves: [BigInt(upscaledSwapTokenAAmount.toString()), BigInt(upscaledSwapTokenBAmount.toString())],
      tradeDirection,
    });

    // Before withdrawal fee
    return tradeDirection == TradeDirection.AToB
      ? this.downscaleTokenB(new BN(withdrawAmountBeforeFees.toString()))
      : this.downscaleTokenA(new BN(withdrawAmountBeforeFees.toString()));
  }

  getRemainingAccounts() {
    let accounts: Array<{
      pubkey: PublicKey;
      isWritable: boolean;
      isSigner: boolean;
    }> = [];

    if ('marinade' in this.depeg.depegType) {
      accounts.push({
        pubkey: CURVE_TYPE_ACCOUNTS.marinade,
        isWritable: false,
        isSigner: false,
      });
    }

    if ('lido' in this.depeg.depegType) {
      accounts.push({
        pubkey: CURVE_TYPE_ACCOUNTS.lido,
        isWritable: false,
        isSigner: false,
      });
    }

    if (!this.stakePoolPubkey.equals(PublicKey.default)) {
      accounts.push({
        pubkey: this.stakePoolPubkey,
        isWritable: false,
        isSigner: false,
      });
    }

    return accounts;
  }
}

function calculateEstimatedWithdrawOneAmount({
  ampFactor,
  feeInfo,
  lpTotalSupply,
  reserves,
  poolTokenAmount,
  tradeDirection,
}: {
  ampFactor: bigint;
  feeInfo: Fees;
  lpTotalSupply: bigint;
  reserves: [bigint, bigint];
  poolTokenAmount: bigint;
  tradeDirection: TradeDirection;
}): {
  withdrawAmount: bigint;
  withdrawAmountBeforeFees: bigint;
  swapFee: bigint;
  withdrawFee: bigint;
  lpSwapFee: bigint;
  lpWithdrawFee: bigint;
  adminSwapFee: bigint;
  adminWithdrawFee: bigint;
} {
  if (poolTokenAmount == ZERO) {
    return {
      withdrawAmount: ZERO,
      withdrawAmountBeforeFees: ZERO,
      swapFee: ZERO,
      withdrawFee: ZERO,
      lpSwapFee: ZERO,
      lpWithdrawFee: ZERO,
      adminSwapFee: ZERO,
      adminWithdrawFee: ZERO,
    };
  }

  const [baseReserves, quoteReserves] =
    tradeDirection == TradeDirection.BToA ? [reserves[0], reserves[1]] : [reserves[1], reserves[0]];

  const d_0 = computeD(ampFactor, baseReserves, quoteReserves);
  const d_1 = d_0 - poolTokenAmount * d_0 / lpTotalSupply;

  const new_y = computeY(ampFactor, quoteReserves, d_1);

  // expected_base_amount = swap_base_amount * d_1 / d_0 - new_y;
  const expected_base_amount = baseReserves * d_1 / d_0 - new_y;
  // expected_quote_amount = swap_quote_amount - swap_quote_amount * d_1 / d_0;
  const expected_quote_amount = quoteReserves - quoteReserves * d_1 / d_0;
  // new_base_amount = swap_base_amount - expected_base_amount * fee / fee_denominator;
  const new_base_amount = new Fraction(baseReserves.toString(), 1).subtract(
    normalizedTradeFee(feeInfo, N_COINS, expected_base_amount),
  );
  // new_quote_amount = swap_quote_amount - expected_quote_amount * fee / fee_denominator;
  const new_quote_amount = new Fraction(quoteReserves.toString(), 1).subtract(
    normalizedTradeFee(feeInfo, N_COINS, expected_quote_amount),
  );
  const dy = new_base_amount.subtract(computeY(ampFactor, BigInt(new_quote_amount.toFixed(0)), d_1).toString());
  const dy_0 = baseReserves - new_y;

  // lp fees
  const swapFee = new Fraction(dy_0.toString(), 1).subtract(dy);
  const withdrawFee = dy.multiply(feeInfo.withdraw.asFraction);

  // admin fees
  const adminSwapFee = swapFee.multiply(feeInfo.adminTrade.asFraction);
  const adminWithdrawFee = withdrawFee.multiply(feeInfo.adminWithdraw.asFraction);

  // final LP fees
  const lpSwapFee = swapFee.subtract(adminSwapFee);
  const lpWithdrawFee = withdrawFee.subtract(adminWithdrawFee);

  // final withdraw amount
  const withdrawAmount = dy.subtract(withdrawFee).subtract(swapFee);

  // final quantities
  return {
    withdrawAmount: BigInt(withdrawAmount.toFixed(0)),
    withdrawAmountBeforeFees: BigInt(dy.toFixed(0)),
    swapFee: BigInt(swapFee.toFixed(0)),
    withdrawFee: BigInt(withdrawFee.toFixed(0)),
    lpSwapFee: BigInt(lpSwapFee.toFixed(0)),
    lpWithdrawFee: BigInt(lpWithdrawFee.toFixed(0)),
    adminSwapFee: BigInt(adminSwapFee.toFixed(0)),
    adminWithdrawFee: BigInt(adminWithdrawFee.toFixed(0)),
  };
}

function calculateEstimatedMintAmount(
  ampFactor: bigint,
  feeInfo: Fees,
  lpTotalSupply: bigint,
  reserves: [bigint, bigint],
  depositAmountA: bigint,
  depositAmountB: bigint,
): {
  mintAmountBeforeFees: bigint;
  mintAmount: bigint;
  fees: bigint;
} {
  if (depositAmountA == ZERO && depositAmountB == ZERO) {
    return {
      mintAmountBeforeFees: ZERO,
      mintAmount: ZERO,
      fees: ZERO,
    };
  }

  const amp = ampFactor;
  const [reserveA, reserveB] = reserves;
  const d0 = computeD(amp, reserveA, reserveB);

  const d1 = computeD(amp, reserveA + depositAmountA, reserveB + depositAmountB);
  if (d1 < d0) {
    throw new Error('New D cannot be less than previous D');
  }

  const oldBalances = reserves.map((r) => r);
  const newBalances = [reserveA + depositAmountA, reserveB + depositAmountB] as const;
  const adjustedBalances = newBalances.map((newBalance, i) => {
    const oldBalance = oldBalances[i];
    const idealBalance = new Fraction(d1, d0).multiply(oldBalance);
    const difference = idealBalance.subtract(newBalance);
    const diffAbs = difference.greaterThan(0) ? difference : difference.multiply(-1);
    const fee = normalizedTradeFee(feeInfo, N_COINS, BigInt(diffAbs.toFixed(0)));
    return newBalance - BigInt(fee.toFixed(0));
  }) as [bigint, bigint];
  const d2 = computeD(amp, adjustedBalances[0], adjustedBalances[1]);

  const lpSupply = lpTotalSupply;
  const mintAmountRaw = lpSupply * (d2 - d0) / d0;
  const mintAmountRawBeforeFees = lpSupply * (d1 - d0) / d0;

  const fees = mintAmountRawBeforeFees - mintAmountRaw;

  return {
    mintAmount: mintAmountRaw,
    mintAmountBeforeFees: mintAmountRawBeforeFees,
    fees,
  };
}

// Helper class to convert the type to the type from saber stable calculator
class Helper {
  public static toFees(fees: PoolFees): Fees {
    return {
      adminTrade: new Percent(fees.protocolTradeFeeNumerator, fees.protocolTradeFeeDenominator),
      trade: new Percent(fees.tradeFeeNumerator, fees.tradeFeeDenominator),
      adminWithdraw: new Percent(0, 100),
      withdraw: new Percent(0, 100),
    };
  }
}
