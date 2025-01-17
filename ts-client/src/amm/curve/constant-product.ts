import { BN } from '@coral-xyz/anchor';
import { getPriceImpact, OutResult, SwapCurve, TradeDirection } from '.';
import { PoolFees } from '../types';
import Decimal from 'decimal.js';

// Typescript implementation of https://github.com/solana-labs/solana-program-library/blob/master/libraries/math/src/checked_ceil_div.rs#L29
function ceilDiv(lhs: BN, rhs: BN) {
  let quotient = lhs.div(rhs);
  // Avoid dividing a small number by a big one and returning 1, and instead
  // fail.
  if (quotient.eq(new BN(0))) {
    throw new Error('ceilDiv result in zero');
  }

  let remainder = lhs.mod(rhs);

  if (remainder.gt(new BN(0))) {
    quotient = quotient.add(new BN(1));
    rhs = lhs.div(quotient);
    remainder = lhs.mod(quotient);
    if (remainder.gt(new BN(0))) {
      rhs = rhs.add(new BN(1));
    }
  }

  return [quotient, rhs];
}

export class ConstantProductSwap implements SwapCurve {
  constructor() {}

  private computeOutAmountWithoutSlippage(sourceAmount: BN, swapSourceAmount: BN, swapDestinationAmount: BN): BN {
    return sourceAmount.mul(swapDestinationAmount).div(swapSourceAmount);
  }

  // Typescript implementation of https://github.com/solana-labs/solana-program-library/blob/master/token-swap/program/src/curve/constant_product.rs#L27
  computeOutAmount(
    sourceAmount: BN,
    swapSourceAmount: BN,
    swapDestinationAmount: BN,
    _tradeDirection: TradeDirection,
  ): OutResult {
    let invariant = swapSourceAmount.mul(swapDestinationAmount);
    let [newSwapDestinationAmount, _newSwapSourceAmount] = ceilDiv(invariant, swapSourceAmount.add(sourceAmount));
    let destinationAmountSwapped = swapDestinationAmount.sub(newSwapDestinationAmount);
    if (destinationAmountSwapped.eq(new BN(0))) {
      throw new Error('Swap result in zero');
    }
    const destinationAmountWithoutSlippage = this.computeOutAmountWithoutSlippage(
      sourceAmount,
      swapSourceAmount,
      swapDestinationAmount,
    );

    return {
      outAmount: destinationAmountSwapped,
      priceImpact: getPriceImpact(destinationAmountSwapped, destinationAmountWithoutSlippage),
    };
  }
  computeD(tokenAAmount: BN, tokenBAmount: BN): BN {
    const sqrt = new Decimal(tokenAAmount.mul(tokenBAmount).toString()).floor();
    return new BN(sqrt.toString());
  }
  computeInAmount(
    destAmount: BN,
    swapSourceAmount: BN,
    swapDestinationAmount: BN,
    _tradeDirection: TradeDirection,
  ): BN {
    let invariant = swapSourceAmount.mul(swapDestinationAmount);
    let [newSwapSourceAmount, _newSwapDestinationAmount] = ceilDiv(invariant, swapDestinationAmount.sub(destAmount));
    let sourceAmount = newSwapSourceAmount.sub(swapSourceAmount);

    if (sourceAmount.eq(new BN(0))) {
      throw new Error('Swap result in zero');
    }
    return sourceAmount;
  }
  computeImbalanceDeposit(
    _depositAAmount: BN,
    _depositBAmount: BN,
    _swapTokenAAmount: BN,
    _swapTokenBAmount: BN,
    _lpSupply: BN,
    _fees: PoolFees,
  ): BN {
    throw new Error('UnsupportedOperation');
  }

  computeWithdrawOne(
    _lpAmount: BN,
    _lpSupply: BN,
    _swapTokenAAmount: BN,
    _swapTokenBAmount: BN,
    _fees: PoolFees,
    _tradeDirection: TradeDirection,
  ): BN {
    throw new Error('UnsupportedOperation');
  }

  getRemainingAccounts() {
    return [];
  }
}
