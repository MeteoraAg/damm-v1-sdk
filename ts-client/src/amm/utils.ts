import {
  getAmountByShare,
  calculateWithdrawableAmount,
  VaultState,
  getUnmintAmount,
  IDL as VaultIDL,
  VaultIdl,
  PROGRAM_ID as VAULT_PROGRAM_ID,
} from '@meteora-ag/vault-sdk';
import { STAKE_FOR_FEE_PROGRAM_ID, IDL as StakeForFeeIDL, StakeForFee as StakeForFeeIdl } from '@meteora-ag/m3m3';
import { AnchorProvider, BN, Program } from '@coral-xyz/anchor';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  AccountLayout,
  NATIVE_MINT,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  RawAccount,
  createCloseAccountInstruction,
  getMinimumBalanceForRentExemptMint,
  MintLayout,
  createInitializeMintInstruction,
} from '@solana/spl-token';
import {
  AccountInfo,
  Connection,
  Keypair,
  ParsedAccountData,
  PublicKey,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import invariant from 'invariant';
import {
  CURVE_TYPE_ACCOUNTS,
  ERROR,
  PROGRAM_ID,
  VIRTUAL_PRICE_PRECISION,
  PERMISSIONLESS_AMP,
  STABLE_SWAP_DEFAULT_TRADE_FEE_BPS,
  CONSTANT_PRODUCT_DEFAULT_TRADE_FEE_BPS,
  METAPLEX_PROGRAM,
  SEEDS,
  U64_MAX,
} from './constants';
import { ConstantProductSwap, StableSwap, SwapCurve, TradeDirection } from './curve';
import {
  ActivationType,
  AmmProgram,
  ConstantProductCurve,
  DepegLido,
  DepegMarinade,
  DepegNone,
  DepegSplStake,
  ParsedClockState,
  PoolFees,
  PoolInformation,
  PoolState,
  StableSwapCurve,
  SwapQuoteParam,
  SwapResult,
  TokenMultiplier,
} from './types';
import { Amm as AmmIdl, IDL as AmmIDL } from './idl';
import Decimal from 'decimal.js';
import {
  createCreateMetadataAccountV3Instruction,
  CreateMetadataAccountV3InstructionAccounts,
  CreateMetadataAccountV3InstructionArgs,
  DataV2,
  PROGRAM_ID as PROGRAM_ID_META,
} from '@metaplex-foundation/mpl-token-metadata';

export const createProgram = (connection: Connection, programId?: string) => {
  const provider = new AnchorProvider(connection, {} as any, AnchorProvider.defaultOptions());
  const ammProgram = new Program<AmmIdl>(AmmIDL, programId ?? PROGRAM_ID, provider);
  const vaultProgram = new Program<VaultIdl>(VaultIDL, VAULT_PROGRAM_ID, provider);
  const stakeForFeeProgram = new Program<StakeForFeeIdl>(StakeForFeeIDL, STAKE_FOR_FEE_PROGRAM_ID, provider);

  return { provider, ammProgram, vaultProgram, stakeForFeeProgram };
};

/**
 * It takes an amount and a slippage rate, and returns the maximum amount that can be received with
 * that slippage rate
 * @param {BN} amount - The amount of tokens you want to buy.
 * @param {number} slippageRate - The maximum percentage of slippage you're willing to accept. (Max to 2 decimal place)
 * @returns The maximum amount of tokens that can be bought with the given amount of ETH, given the
 * slippage rate.
 */
export const getMaxAmountWithSlippage = (amount: BN, slippageRate: number) => {
  const slippage = ((100 + slippageRate) / 100) * 10000;
  return amount.mul(new BN(slippage)).div(new BN(10000));
};

/**
 * It takes an amount and a slippage rate, and returns the minimum amount that will be received after
 * slippage
 * @param {BN} amount - The amount of tokens you want to sell.
 * @param {number} slippageRate - The percentage of slippage you're willing to accept. (Max to 2 decimal place)
 * @returns The minimum amount that can be received after slippage is applied.
 */
export const getMinAmountWithSlippage = (amount: BN, slippageRate: number) => {
  const slippage = ((100 - slippageRate) / 100) * 10000;
  return amount.mul(new BN(slippage)).div(new BN(10000));
};

export const getAssociatedTokenAccount = (tokenMint: PublicKey, owner: PublicKey) => {
  return getAssociatedTokenAddressSync(tokenMint, owner, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
};

export const getOrCreateATAInstruction = async (
  tokenMint: PublicKey,
  owner: PublicKey,
  connection: Connection,
  payer?: PublicKey,
): Promise<[PublicKey, TransactionInstruction?]> => {
  let toAccount;
  try {
    toAccount = await getAssociatedTokenAccount(tokenMint, owner);
    const account = await connection.getAccountInfo(toAccount);
    if (!account) {
      const ix = createAssociatedTokenAccountInstruction(
        payer || owner,
        toAccount,
        owner,
        tokenMint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );
      return [toAccount, ix];
    }
    return [toAccount, undefined];
  } catch (e) {
    /* handle error */
    console.error('Error::getOrCreateATAInstruction', e);
    throw e;
  }
};

export const deriveLockEscrowPda = (pool: PublicKey, owner: PublicKey, ammProgram: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.LOCK_ESCROW), pool.toBuffer(), owner.toBuffer()],
    ammProgram,
  );
};

export const wrapSOLInstruction = (from: PublicKey, to: PublicKey, amount: bigint): TransactionInstruction[] => {
  return [
    SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: to,
      lamports: amount,
    }),
    new TransactionInstruction({
      keys: [
        {
          pubkey: to,
          isSigner: false,
          isWritable: true,
        },
      ],
      data: Buffer.from(new Uint8Array([17])),
      programId: TOKEN_PROGRAM_ID,
    }),
  ];
};

export const unwrapSOLInstruction = async (owner: PublicKey, receiver: PublicKey) => {
  const wSolATAAccount = await getAssociatedTokenAccount(NATIVE_MINT, owner);
  if (wSolATAAccount) {
    const closedWrappedSolInstruction = createCloseAccountInstruction(
      wSolATAAccount,
      receiver ? receiver : owner,
      owner,
      [],
    );
    return closedWrappedSolInstruction;
  }
  return null;
};

export const deserializeAccount = (data: Buffer | undefined): RawAccount | undefined => {
  if (data == undefined || data.length == 0) {
    return undefined;
  }

  const accountInfo = AccountLayout.decode(data);

  return accountInfo;
};

export const getOnchainTime = async (connection: Connection) => {
  const parsedClock = await connection.getParsedAccountInfo(SYSVAR_CLOCK_PUBKEY);

  const parsedClockAccount = (parsedClock.value!.data as ParsedAccountData).parsed as ParsedClockState;

  const currentTime = parsedClockAccount.info.unixTimestamp;
  return currentTime;
};

/**
 * Compute "actual" amount deposited to vault (precision loss)
 * @param depositAmount
 * @param beforeAmount
 * @param vaultLpBalance
 * @param vaultLpSupply
 * @param vaultTotalAmount
 * @returns
 */
export const computeActualDepositAmount = (
  depositAmount: BN,
  beforeAmount: BN,
  vaultLpBalance: BN,
  vaultLpSupply: BN,
  vaultTotalAmount: BN,
): BN => {
  if (depositAmount.eq(new BN(0))) return depositAmount;

  const vaultLpMinted = depositAmount.mul(vaultLpSupply).div(vaultTotalAmount);
  vaultLpSupply = vaultLpSupply.add(vaultLpMinted);
  vaultTotalAmount = vaultTotalAmount.add(depositAmount);
  vaultLpBalance = vaultLpBalance.add(vaultLpMinted);

  const afterAmount = vaultLpBalance.mul(vaultTotalAmount).div(vaultLpSupply);

  return afterAmount.sub(beforeAmount);
};

/**
 * Compute pool information, Typescript implementation of https://github.com/meteora-ag/mercurial-dynamic-amm/blob/main/programs/amm/src/lib.rs#L960
 * @param {number} currentTime - the on solana chain time in seconds (SYSVAR_CLOCK_PUBKEY)
 * @param {BN} poolVaultALp - The amount of LP tokens in the pool for token A
 * @param {BN} poolVaultBLp - The amount of Lp tokens in the pool for token B,
 * @param {BN} vaultALpSupply - The total amount of Vault A LP tokens in the pool.
 * @param {BN} vaultBLpSupply - The total amount of Vault B LP token in the pool.
 * @param {BN} poolLpSupply - The total amount of LP tokens in the pool.
 * @param {SwapCurve} swapCurve - SwapCurve - the swap curve used to calculate the virtual price
 * @param {VaultState} vaultA - VaultState of vault A
 * @param {VaultState} vaultB - VaultState of Vault B
 * @returns an object of type PoolInformation.
 */
export const calculatePoolInfo = (
  currentTimestamp: BN,
  poolVaultALp: BN,
  poolVaultBLp: BN,
  vaultALpSupply: BN,
  vaultBLpSupply: BN,
  poolLpSupply: BN,
  swapCurve: SwapCurve,
  vaultA: VaultState,
  vaultB: VaultState,
) => {
  const vaultAWithdrawableAmount = calculateWithdrawableAmount(currentTimestamp.toNumber(), vaultA);
  const vaultBWithdrawableAmount = calculateWithdrawableAmount(currentTimestamp.toNumber(), vaultB);

  const tokenAAmount = getAmountByShare(poolVaultALp, vaultAWithdrawableAmount, vaultALpSupply);
  const tokenBAmount = getAmountByShare(poolVaultBLp, vaultBWithdrawableAmount, vaultBLpSupply);

  const d = swapCurve.computeD(tokenAAmount, tokenBAmount);
  const virtualPriceBigNum = poolLpSupply.isZero() ? new BN(0) : d.mul(VIRTUAL_PRICE_PRECISION).div(poolLpSupply);
  const virtualPrice = new Decimal(virtualPriceBigNum.toString()).div(VIRTUAL_PRICE_PRECISION.toString()).toNumber();
  const virtualPriceRaw = poolLpSupply.isZero() ? new BN(0) : new BN(1).shln(64).mul(d).div(poolLpSupply);

  const poolInformation: PoolInformation = {
    tokenAAmount,
    tokenBAmount,
    virtualPrice,
    virtualPriceRaw,
  };

  return poolInformation;
};

export const calculateProtocolTradingFee = (amount: BN, poolState: PoolState): BN => {
  const { protocolTradeFeeDenominator, protocolTradeFeeNumerator } = poolState.fees;
  return amount.mul(protocolTradeFeeNumerator).div(protocolTradeFeeDenominator);
};

export const calculateTradingFee = (amount: BN, poolState: PoolState): BN => {
  const { tradeFeeDenominator, tradeFeeNumerator } = poolState.fees;
  return amount.mul(tradeFeeNumerator).div(tradeFeeDenominator);
};

export const calculateUnclaimedLockEscrowFee = (
  totalLockedAmount: BN,
  lpPerToken: BN,
  unclaimedFeePending: BN,
  currentVirtualPrice: BN,
): BN => {
  if (currentVirtualPrice.isZero()) {
    return new BN(0);
  }
  let newFee = totalLockedAmount.mul(currentVirtualPrice.sub(lpPerToken)).div(currentVirtualPrice);
  return newFee.add(unclaimedFeePending);
};

/**
 * "Calculate the maximum amount of tokens that can be swapped out of a pool."
 *
 * @param {PublicKey} tokenMint - The mint that want to swap out
 * @param {PublicKey} tokenAMint - The public key of the token A mint.
 * @param {PublicKey} tokenBMint - The public key of the token B mint.
 * @param {BN} tokenAAmount - The amount of token A that the user wants to swap out.
 * @param {BN} tokenBAmount - The amount of token B that the user wants to swap out.
 * @param {BN} vaultAReserve - The amount of tokenA that the vault has in reserve.
 * @param {BN} vaultBReserve - The amount of tokenB that the vault has in reserve.
 * @returns The max amount of tokens that can be swapped out.
 */
export const calculateMaxSwapOutAmount = (
  tokenMint: PublicKey,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey,
  tokenAAmount: BN,
  tokenBAmount: BN,
  vaultAReserve: BN,
  vaultBReserve: BN,
) => {
  invariant(tokenMint.equals(tokenAMint) || tokenMint.equals(tokenBMint), ERROR.INVALID_MINT);

  const [outTotalAmount, outReserveBalance] = tokenMint.equals(tokenAMint)
    ? [tokenAAmount, vaultAReserve]
    : [tokenBAmount, vaultBReserve];

  return outTotalAmount.gt(outReserveBalance) ? outReserveBalance : outTotalAmount;
};

export const getStakePubkey = (poolState: PoolState): PublicKey | null => {
  // Stable swap curve, and depeg type is not "none"
  if ('stable' in poolState.curveType && !('none' in poolState.curveType['stable'].depeg.depegType)) {
    const depegType = poolState.curveType['stable'].depeg.depegType;
    if (depegType['marinade']) {
      return CURVE_TYPE_ACCOUNTS.marinade;
    } else if (depegType['lido']) {
      return CURVE_TYPE_ACCOUNTS.lido;
    } else if (depegType['splStake']) {
      return poolState.stake;
    }
  }
  return null;
};

/**
 * It gets the account info that are used in depeg Pool
 * @param {Connection} connection - Connection - The connection to the Solana cluster
 * @param {PoolState[]} poolsState - Array of PoolState
 * @returns A map of the depeg accounts.
 */
export const getDepegAccounts = async (
  connection: Connection,
  poolsState: PoolState[],
): Promise<Map<String, AccountInfo<Buffer>>> => {
  const stakePoolPubkeys = new Set<PublicKey>();

  for (const p of poolsState) {
    const stakePubkey = getStakePubkey(p);
    if (stakePubkey != null) {
      stakePoolPubkeys.add(stakePubkey);
    }
  }

  const depegAccounts = new Map<String, AccountInfo<Buffer>>();
  const stakePoolKeys = [...stakePoolPubkeys];
  const accountBuffers = await chunkedGetMultipleAccountInfos(connection, stakePoolKeys);

  for (const [i, key] of stakePoolKeys.entries()) {
    if (accountBuffers[i] != null) {
      depegAccounts.set(key.toBase58(), accountBuffers[i]!);
    }
  }

  return depegAccounts;
};

export interface VaultAssociatedAccountStates {
  vault: VaultState;
  reserve: BN;
  lpSupply: BN;
}

export type SwapQuoteParams2 = {
  vaultA?: VaultAssociatedAccountStates;
  vaultB?: VaultAssociatedAccountStates;
  currentTime: number;
};

export const calculateSwapQuoteForGoingToCreateMemecoinPool = (
  inAmountLamport: BN,
  tokenADepositAmount: BN,
  tokenBDepositAmount: BN,
  aToB: boolean,
  fees: PoolFees,
  params: SwapQuoteParams2,
) => {
  interface LocalStates {
    vaultStates: VaultAssociatedAccountStates;
    poolVaultLp: BN;
  }

  const { currentTime } = params;
  const vaultA: LocalStates | undefined = params.vaultA
    ? { vaultStates: params.vaultA, poolVaultLp: new BN(0) }
    : undefined;
  const vaultB: LocalStates | undefined = params.vaultB
    ? { vaultStates: params.vaultB, poolVaultLp: new BN(0) }
    : undefined;

  invariant(vaultA || vaultB, 'Must one side have vault');
  invariant(!vaultA || !vaultB, 'Must one side have vault');

  const getTokenAmountAfterDepositVault = (amount: BN, states?: LocalStates) => {
    // No vault
    if (!states) {
      return amount;
    }

    const vaultWithdrawableAmount = calculateWithdrawableAmount(currentTime, states.vaultStates.vault);
    const lpMinted = getUnmintAmount(amount, vaultWithdrawableAmount, states.vaultStates.lpSupply);

    states.vaultStates.lpSupply = states.vaultStates.lpSupply.add(lpMinted);
    states.vaultStates.vault.totalAmount = states.vaultStates.vault.totalAmount.add(amount);
    states.poolVaultLp = states.poolVaultLp.add(lpMinted);

    return getAmountByShare(
      states.poolVaultLp,
      calculateWithdrawableAmount(currentTime, states.vaultStates.vault),
      states.vaultStates.lpSupply,
    );
  };

  const getTokenAmountAfterWithdrawVault = (amount: BN, states?: LocalStates) => {
    // No vault
    if (!states) {
      return amount;
    }

    const vaultWithdrawableAmount = calculateWithdrawableAmount(currentTime, states.vaultStates.vault);
    const lpBurned = getUnmintAmount(amount, vaultWithdrawableAmount, states.vaultStates.lpSupply);

    states.vaultStates.lpSupply = states.vaultStates.lpSupply.sub(lpBurned);
    states.vaultStates.vault.totalAmount = states.vaultStates.vault.totalAmount.sub(amount);
    states.poolVaultLp = states.poolVaultLp.sub(lpBurned);

    return getAmountByShare(
      states.poolVaultLp,
      calculateWithdrawableAmount(currentTime, states.vaultStates.vault),
      states.vaultStates.lpSupply,
    );
  };

  const tokenAAmount = getTokenAmountAfterDepositVault(tokenADepositAmount, vaultA);
  const tokenBAmount = getTokenAmountAfterDepositVault(tokenBDepositAmount, vaultB);

  const [sourceAmount, swapSourceAmount, swapDestinationAmount, sourceVault, destinationVault] = aToB
    ? [inAmountLamport, tokenAAmount, tokenBAmount, vaultA, vaultB]
    : [inAmountLamport, tokenBAmount, tokenAAmount, vaultB, vaultA];

  const tradeFee = sourceAmount.mul(fees.tradeFeeNumerator).div(fees.tradeFeeDenominator);
  const protocolFee = tradeFee.mul(fees.protocolTradeFeeNumerator).div(fees.protocolTradeFeeDenominator);
  const sourceAmountLessProtocolFee = sourceAmount.sub(protocolFee);

  const beforeSwapSourceAmount = swapSourceAmount;
  const afterSwapSourceAmount = sourceVault
    ? getTokenAmountAfterDepositVault(sourceAmountLessProtocolFee, sourceVault)
    : sourceAmountLessProtocolFee;

  const actualSourceAmount = afterSwapSourceAmount.sub(beforeSwapSourceAmount);
  const sourceAmountLessFee = actualSourceAmount.sub(tradeFee.sub(protocolFee));

  const curve = new ConstantProductSwap();
  const { outAmount: destinationAmount } = curve.computeOutAmount(
    sourceAmountLessFee,
    swapSourceAmount,
    swapDestinationAmount,
    aToB ? TradeDirection.AToB : TradeDirection.BToA,
  );

  const afterDestinationAmount = destinationVault
    ? getTokenAmountAfterWithdrawVault(destinationAmount, destinationVault)
    : destinationAmount;

  return {
    amountOut: afterDestinationAmount,
    fee: sourceAmountLessProtocolFee,
  };
};

/**
 * It calculates the amount of tokens you will receive after swapping your tokens
 * @param {PublicKey} inTokenMint - The mint of the token you're swapping in.
 * @param {BN} inAmountLamport - The amount of the input token you want to swap.
 * @param {SwapQuoteParam} params - SwapQuoteParam
 * @param {PoolState} params.poolState - pool state that fetch from program
 * @param {VaultState} params.vaultA - vault A state that fetch from vault program
 * @param {VaultState} params.vaultB - vault B state that fetch from vault program
 * @param {BN} params.poolVaultALp - The amount of LP tokens in the pool for token A (`PoolState.aVaultLp` accountInfo)
 * @param {BN} params.poolVaultBLp - The amount of LP tokens in the pool for token B (`PoolState.bVaultLp` accountInfo)
 * @param {BN} params.vaultALpSupply - vault A lp supply (`VaultState.lpMint` accountInfo)
 * @param {BN} params.vaultBLpSupply - vault B lp supply (`VaultState.lpMint` accountInfo)
 * @param {BN} params.vaultAReserve - vault A reserve (`VaultState.tokenVault` accountInfo)
 * @param {BN} params.vaultBReserve - vault B reserve (`VaultState.tokenVault` accountInfo)
 * @param {BN} params.currentTime - on chain time (use `SYSVAR_CLOCK_PUBKEY`)
 * @param {BN} params.currentSlot - on chain slot (use `SYSVAR_CLOCK_PUBKEY`)
 * @param {BN} params.depegAccounts - A map of the depeg accounts. (get from `getDepegAccounts` util)
 * @returns The amount of tokens that will be received after the swap.
 */
export const calculateSwapQuote = (
  inTokenMint: PublicKey,
  inAmountLamport: BN,
  params: SwapQuoteParam,
  swapInitiator?: PublicKey,
): SwapResult => {
  const {
    vaultA,
    vaultB,
    vaultALpSupply,
    vaultBLpSupply,
    poolState,
    poolVaultALp,
    poolVaultBLp,
    currentTime,
    depegAccounts,
    vaultAReserve,
    vaultBReserve,
    currentSlot,
  } = params;

  const { tokenAMint, tokenBMint } = poolState;
  invariant(inTokenMint.equals(tokenAMint) || inTokenMint.equals(tokenBMint), ERROR.INVALID_MINT);
  invariant(poolState.enabled, 'Pool disabled');

  let swapCurve: SwapCurve;
  if ('stable' in poolState.curveType) {
    const { amp, depeg, tokenMultiplier } = poolState.curveType['stable'] as any;
    swapCurve = new StableSwap(
      amp.toNumber(),
      tokenMultiplier,
      depeg,
      depegAccounts,
      new BN(currentTime),
      poolState.stake,
    );
  } else {
    // Bootstrapping pool
    const activationType = poolState.bootstrapping.activationType;
    const currentPoint = activationType == ActivationType.Timestamp ? new BN(currentTime) : new BN(currentSlot);
    const canQuoteEarlier = swapInitiator ? swapInitiator.equals(poolState.bootstrapping.whitelistedVault) : false;
    if (!canQuoteEarlier) {
      invariant(currentPoint.gte(poolState.bootstrapping.activationPoint), 'Swap is disabled');
    }

    swapCurve = new ConstantProductSwap();
  }

  const vaultAWithdrawableAmount = calculateWithdrawableAmount(currentTime, vaultA);
  const vaultBWithdrawableAmount = calculateWithdrawableAmount(currentTime, vaultB);

  const tokenAAmount = getAmountByShare(poolVaultALp, vaultAWithdrawableAmount, vaultALpSupply);
  const tokenBAmount = getAmountByShare(poolVaultBLp, vaultBWithdrawableAmount, vaultBLpSupply);

  const isFromAToB = inTokenMint.equals(tokenAMint);
  const [
    sourceAmount,
    swapSourceVaultLpAmount,
    swapSourceAmount,
    swapDestinationAmount,
    swapSourceVault,
    swapDestinationVault,
    swapSourceVaultLpSupply,
    swapDestinationVaultLpSupply,
    tradeDirection,
  ] = isFromAToB
    ? [
        inAmountLamport,
        poolVaultALp,
        tokenAAmount,
        tokenBAmount,
        vaultA,
        vaultB,
        vaultALpSupply,
        vaultBLpSupply,
        TradeDirection.AToB,
      ]
    : [
        inAmountLamport,
        poolVaultBLp,
        tokenBAmount,
        tokenAAmount,
        vaultB,
        vaultA,
        vaultBLpSupply,
        vaultALpSupply,
        TradeDirection.BToA,
      ];

  const tradeFee = calculateTradingFee(sourceAmount, poolState);
  // Protocol fee is a cut of trade fee
  const protocolFee = calculateProtocolTradingFee(tradeFee, poolState);
  const tradeFeeAfterProtocolFee = tradeFee.sub(protocolFee);

  const sourceVaultWithdrawableAmount = calculateWithdrawableAmount(currentTime, swapSourceVault);

  const beforeSwapSourceAmount = swapSourceAmount;
  const sourceAmountLessProtocolFee = sourceAmount.sub(protocolFee);

  // Get vault lp minted when deposit to the vault
  const sourceVaultLp = getUnmintAmount(
    sourceAmountLessProtocolFee,
    sourceVaultWithdrawableAmount,
    swapSourceVaultLpSupply,
  );

  const sourceVaultTotalAmount = sourceVaultWithdrawableAmount.add(sourceAmountLessProtocolFee);

  const afterSwapSourceAmount = getAmountByShare(
    sourceVaultLp.add(swapSourceVaultLpAmount),
    sourceVaultTotalAmount,
    swapSourceVaultLpSupply.add(sourceVaultLp),
  );

  const actualSourceAmount = afterSwapSourceAmount.sub(beforeSwapSourceAmount);
  let sourceAmountWithFee = actualSourceAmount.sub(tradeFeeAfterProtocolFee);

  const { outAmount: destinationAmount, priceImpact } = swapCurve.computeOutAmount(
    sourceAmountWithFee,
    swapSourceAmount,
    swapDestinationAmount,
    tradeDirection,
  );

  const destinationVaultWithdrawableAmount = calculateWithdrawableAmount(currentTime, swapDestinationVault);
  // Get vault lp to burn when withdraw from the vault
  const destinationVaultLp = getUnmintAmount(
    destinationAmount,
    destinationVaultWithdrawableAmount,
    swapDestinationVaultLpSupply,
  );

  let actualDestinationAmount = getAmountByShare(
    destinationVaultLp,
    destinationVaultWithdrawableAmount,
    swapDestinationVaultLpSupply,
  );

  const maxSwapOutAmount = calculateMaxSwapOutAmount(
    tradeDirection == TradeDirection.AToB ? tokenBMint : tokenAMint,
    tokenAMint,
    tokenBMint,
    tokenAAmount,
    tokenBAmount,
    vaultAReserve,
    vaultBReserve,
  );

  invariant(actualDestinationAmount.lt(maxSwapOutAmount), 'Out amount > vault reserve');

  return {
    amountOut: actualDestinationAmount,
    fee: tradeFeeAfterProtocolFee,
    priceImpact,
  };
};

/**
 * It takes two numbers, and returns three numbers
 * @param {number} decimalA - The number of decimal places for token A.
 * @param {number} decimalB - The number of decimal places for token B.
 * @returns A TokenMultiplier object with the following properties:
 * - tokenAMultiplier
 * - tokenBMultiplier
 * - precisionFactor
 */
export const computeTokenMultiplier = (decimalA: number, decimalB: number): TokenMultiplier => {
  const precisionFactor = Math.max(decimalA, decimalB);
  const tokenAMultiplier = new BN(10 ** (precisionFactor - decimalA));
  const tokenBMultiplier = new BN(10 ** (precisionFactor - decimalB));
  return {
    tokenAMultiplier,
    tokenBMultiplier,
    precisionFactor,
  };
};

/**
 * It fetches the pool account from the AMM program, and returns the mint addresses for the two tokens
 * @param {Connection} connection - Connection - The connection to the Solana cluster
 * @param {string} poolAddress - The address of the pool account.
 * @returns The tokenAMint and tokenBMint addresses for the pool.
 */
export async function getTokensMintFromPoolAddress(
  connection: Connection,
  poolAddress: string,
  opt?: {
    programId?: string;
  },
) {
  const { ammProgram } = createProgram(connection, opt?.programId);

  const poolAccount = await ammProgram.account.pool.fetchNullable(new PublicKey(poolAddress));

  if (!poolAccount) return;

  return {
    tokenAMint: poolAccount.tokenAMint,
    tokenBMint: poolAccount.tokenBMint,
  };
}

export function deriveMintMetadata(lpMint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), METAPLEX_PROGRAM.toBuffer(), lpMint.toBuffer()],
    METAPLEX_PROGRAM,
  );
}

export function deriveCustomizablePermissionlessConstantProductPoolAddress(
  tokenA: PublicKey,
  tokenB: PublicKey,
  programId: PublicKey,
) {
  const [poolPubkey] = PublicKey.findProgramAddressSync(
    [Buffer.from('pool'), getFirstKey(tokenA, tokenB), getSecondKey(tokenA, tokenB)],
    programId,
  );

  return poolPubkey;
}

export function derivePoolAddressWithConfig(
  tokenA: PublicKey,
  tokenB: PublicKey,
  config: PublicKey,
  programId: PublicKey,
) {
  const [poolPubkey] = PublicKey.findProgramAddressSync(
    [getFirstKey(tokenA, tokenB), getSecondKey(tokenA, tokenB), config.toBuffer()],
    programId,
  );

  return poolPubkey;
}

export const deriveConfigPda = (index: BN, programId: PublicKey) => {
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config'), index.toBuffer('le', 8)], programId);

  return configPda;
};

export const deriveProtocolTokenFee = (poolAddress: PublicKey, tokenMint: PublicKey, programId: PublicKey) => {
  const [protocolTokenFee] = PublicKey.findProgramAddressSync(
    [Buffer.from('fee'), tokenMint.toBuffer(), poolAddress.toBuffer()],
    programId,
  );

  return protocolTokenFee;
};

export function derivePoolAddress(
  connection: Connection,
  tokenA: PublicKey,
  tokenB: PublicKey,
  tokenADecimal: number,
  tokenBDecimal: number,
  isStable: boolean,
  tradeFeeBps: BN,
  opt?: {
    programId?: string;
  },
) {
  const { ammProgram } = createProgram(connection, opt?.programId);
  const curveType = generateCurveType(tokenADecimal, tokenBDecimal, isStable);

  const [poolPubkey] = PublicKey.findProgramAddressSync(
    [
      Buffer.from([encodeCurveType(curveType)]),
      getFirstKey(tokenA, tokenB),
      getSecondKey(tokenA, tokenB),
      getTradeFeeBpsBuffer(curveType, tradeFeeBps),
    ],
    ammProgram.programId,
  );

  return poolPubkey;
}

/**
 * It checks if a pool exists by checking if the pool account exists
 * @param {Connection} connection - Connection - the connection to the Solana cluster
 * @param {TokenInfo} tokenInfoA - TokenInfo
 * @param {TokenInfo} tokenInfoB - TokenInfo
 * @param {boolean} isStable - boolean - whether the pool is stable or not
 * @returns A boolean value.
 */
export async function checkPoolExists(
  connection: Connection,
  mintA: PublicKey,
  mintB: PublicKey,
  mintADecimal: number,
  mintBDecimal: number,
  isStable: boolean,
  tradeFeeBps: BN,
  opt?: {
    programId: string;
  },
): Promise<PublicKey | undefined> {
  const { ammProgram } = createProgram(connection, opt?.programId);

  const poolPubkey = derivePoolAddress(connection, mintA, mintB, mintADecimal, mintBDecimal, isStable, tradeFeeBps, {
    programId: opt?.programId,
  });

  const poolAccount = await ammProgram.account.pool.fetchNullable(poolPubkey);

  if (!poolAccount) return;

  return poolPubkey;
}

/**
 * It checks if a pool with config exists by checking if the pool account exists
 * @param {Connection} connection - Connection - the connection to the Solana cluster
 * @param {PublicKey} tokenA - TokenInfo
 * @param {PublicKey} tokenB - TokenInfo
 * @returns A PublicKey value or undefined.
 */
export async function checkPoolWithConfigsExists(
  connection: Connection,
  tokenA: PublicKey,
  tokenB: PublicKey,
  configs: PublicKey[],
  opt?: {
    programId: string;
  },
): Promise<PublicKey | undefined> {
  const { ammProgram } = createProgram(connection, opt?.programId);

  const poolsPubkey = configs.map((config) =>
    derivePoolAddressWithConfig(tokenA, tokenB, config, ammProgram.programId),
  );

  const poolsAccount = await ammProgram.account.pool.fetchMultiple(poolsPubkey);

  if (poolsAccount.every((account) => account === null)) return;

  const poolAccountIndex = poolsAccount.findIndex((account) => account !== null);
  return poolsPubkey[poolAccountIndex];
}

export function chunks<T>(array: T[], size: number): T[][] {
  return Array.apply<number, T[], T[][]>(0, new Array(Math.ceil(array.length / size))).map((_, index) =>
    array.slice(index * size, (index + 1) * size),
  );
}

export async function chunkedFetchMultiplePoolAccount(program: AmmProgram, pks: PublicKey[], chunkSize: number = 100) {
  const accounts = (
    await Promise.all(chunks(pks, chunkSize).map((chunk) => program.account.pool.fetchMultiple(chunk)))
  ).flat();

  return accounts.filter(Boolean);
}

export async function chunkedGetMultipleAccountInfos(
  connection: Connection,
  pks: PublicKey[],
  chunkSize: number = 100,
) {
  const accountInfos = (
    await Promise.all(chunks(pks, chunkSize).map((chunk) => connection.getMultipleAccountsInfo(chunk)))
  ).flat();

  return accountInfos;
}

export function encodeCurveType(curve: StableSwapCurve | ConstantProductCurve) {
  if (curve['constantProduct']) {
    return 0;
  } else if (curve['stable']) {
    return 1;
  } else {
    throw new Error('Unknown curve type');
  }
}

export function getSecondKey(key1: PublicKey, key2: PublicKey) {
  const buf1 = key1.toBuffer();
  const buf2 = key2.toBuffer();
  // Buf1 > buf2
  if (Buffer.compare(buf1, buf2) === 1) {
    return buf2;
  }
  return buf1;
}

export function getFirstKey(key1: PublicKey, key2: PublicKey) {
  const buf1 = key1.toBuffer();
  const buf2 = key2.toBuffer();
  // Buf1 > buf2
  if (Buffer.compare(buf1, buf2) === 1) {
    return buf1;
  }
  return buf2;
}

export function getTradeFeeBpsBuffer(curve: StableSwapCurve | ConstantProductCurve, tradeFeeBps: BN) {
  let defaultFeeBps: BN;
  if (curve['stable']) {
    defaultFeeBps = new BN(STABLE_SWAP_DEFAULT_TRADE_FEE_BPS);
  } else {
    defaultFeeBps = new BN(CONSTANT_PRODUCT_DEFAULT_TRADE_FEE_BPS);
  }

  if (tradeFeeBps.eq(defaultFeeBps)) {
    return new Uint8Array();
  }

  return new Uint8Array(tradeFeeBps.toBuffer('le', 8));
}

export const DepegType = {
  none: (): DepegNone => {
    return {
      none: {},
    };
  },
  marinade: (): DepegMarinade => {
    return {
      marinade: {},
    };
  },
  lido: (): DepegLido => {
    return {
      lido: {},
    };
  },
  splStake: (): DepegSplStake => {
    return {
      splStake: {},
    };
  },
};

export function generateCurveType(mintADecimal: number, mintBDecimal: number, isStable: boolean) {
  return isStable
    ? {
        stable: {
          amp: PERMISSIONLESS_AMP,
          tokenMultiplier: computeTokenMultiplier(mintADecimal, mintBDecimal),
          depeg: { baseVirtualPrice: new BN(0), baseCacheUpdated: new BN(0), depegType: DepegType.none() },
          lastAmpUpdatedTimestamp: new BN(0),
        },
      }
    : { constantProduct: {} };
}

export async function createMint(
  connection: Connection,
  mintAccount: Keypair,
  payer: PublicKey,
  assetData: DataV2,
  mintAuthority: PublicKey,
  freezeAuthority: PublicKey | null,
  decimals: number,
  programId: PublicKey,
): Promise<{ tx: Transaction; mintAccount: Keypair }> {
  // Allocate memory for the account
  const balanceNeeded = await getMinimumBalanceForRentExemptMint(connection);

  const transaction = new Transaction();
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mintAccount.publicKey,
      lamports: balanceNeeded,
      space: MintLayout.span,
      programId,
    }),
  );

  transaction.add(
    createInitializeMintInstruction(mintAccount.publicKey, decimals, mintAuthority, freezeAuthority, programId),
  );

  const [metadata] = PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), PROGRAM_ID_META.toBuffer(), mintAccount.publicKey.toBuffer()],
    PROGRAM_ID_META,
  );

  const accounts: CreateMetadataAccountV3InstructionAccounts = {
    metadata,
    mint: mintAccount.publicKey,
    mintAuthority: payer,
    payer,
    updateAuthority: payer,
  };

  const args: CreateMetadataAccountV3InstructionArgs = {
    createMetadataAccountArgsV3: {
      data: assetData,
      isMutable: false,
      collectionDetails: null,
    },
  };
  transaction.add(createCreateMetadataAccountV3Instruction(accounts, args));

  return { tx: transaction, mintAccount };
}

export const calculateLockAmounts = (amount: BN, feeWrapperRatio = new Decimal(0)) => {
  if (feeWrapperRatio.lt(0) || feeWrapperRatio.gt(1)) {
    throw new Error('Fee wrapper ratio should be between 0 and 1');
  }

  const feeWrapperLockAmount = new BN(
    new Decimal(amount.toString()).mul(feeWrapperRatio).toFixed(0, Decimal.ROUND_DOWN),
  );
  const userLockAmount = amount.sub(feeWrapperLockAmount);

  return {
    feeWrapperLockAmount,
    userLockAmount,
  };
};

export async function createTransactions(
  connection: Connection,
  ixs: Array<Transaction | TransactionInstruction | (Transaction | TransactionInstruction)[]>,
  payer: PublicKey,
): Promise<Transaction[]> {
  const latestBlockHash = await connection.getLatestBlockhash();
  const resultTx: Transaction[] = [];

  for (const instruction of ixs) {
    const tx = new Transaction({
      feePayer: payer,
      ...latestBlockHash,
    });

    if (Array.isArray(instruction)) {
      tx.add(...instruction);
    } else {
      tx.add(instruction);
    }

    resultTx.push(tx);
  }

  return resultTx;
}
