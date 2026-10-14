import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import Decimal from 'decimal.js';
import { Depeg, PoolFees } from '../types';

export interface OutResult {
  outAmount: BN;
  priceImpact: Decimal;
}

export interface SwapCurve {
  depeg?: Depeg;

  computeOutAmount(
    sourceAmount: BN,
    swapSourceAmount: BN,
    swapDestinationAmount: BN,
    tradeDirection: TradeDirection,
  ): OutResult;

  computeD(tokenAAmount: BN, tokenBAmount: BN): BN;

  computeInAmount(destAmount: BN, swapSourceAmount: BN, swapDestinationAmount: BN, tradeDirection: TradeDirection): BN;

  /**
   * @param lpSupply Pool LP supply from `pool.lpMintSupply` (`getLpSupply` / `poolState.lpSupply`).
   */
  computeImbalanceDeposit(
    depositAAmount: BN,
    depositBAmount: BN,
    swapTokenAAmount: BN,
    swapTokenBAmount: BN,
    lpSupply: BN,
    fees: PoolFees,
  ): BN;

  /**
   * @param lpSupply Pool LP supply from `pool.lpMintSupply` (`getLpSupply` / `poolState.lpSupply`).
   */
  computeWithdrawOne(
    lpAmount: BN,
    lpSupply: BN,
    swapTokenAAmount: BN,
    swapTokenBAmount: BN,
    fees: PoolFees,
    tradeDirection: TradeDirection,
  ): BN;

  getRemainingAccounts(): Array<{
    pubkey: PublicKey;
    isWritable: boolean;
    isSigner: boolean;
  }>;
}

export enum TradeDirection {
  AToB,
  BToA,
}

export const getPriceImpact = (amount: BN, amountWithoutSlippage: BN): Decimal => {
  const diff = amountWithoutSlippage.sub(amount);
  return new Decimal(diff.toString()).div(new Decimal(amountWithoutSlippage.toString()));
};

export * from './stable-swap';
export * from './constant-product';
