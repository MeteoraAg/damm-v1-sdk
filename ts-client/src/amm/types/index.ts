import { AccountInfo, PublicKey, Transaction } from '@solana/web3.js';
import { IdlAccounts, IdlTypes, Program } from '@coral-xyz/anchor';
import BN from 'bn.js';
import { Amm as AmmIdl } from '../idl';
import { VaultState, VaultIdl } from '@meteora-ag/vault-sdk';
import Decimal from 'decimal.js';
import { publicKey, struct, u64, u8, option, i64 } from '@coral-xyz/borsh';

export type AmmProgram = Program<AmmIdl>;
export type VaultProgram = Program<VaultIdl>;

export interface AmmImplementation {
  decimals: number;
  isStablePool: boolean;
  updateState: () => Promise<void>;
  getPoolTokenMint: () => PublicKey;
  getUserBalance: (owner: PublicKey) => Promise<BN>;
  getLpSupply: () => Promise<BN>;
  getSwapQuote: (inTokenMint: PublicKey, inAmountLamport: BN, slippage: number) => SwapQuote;
  swap: (owner: PublicKey, inTokenMint: PublicKey, inAmountLamport: BN, outAmountLamport: BN) => Promise<Transaction>;
  getDepositQuote: (tokenAInAmount: BN, tokenBInAmount: BN, isImbalance: boolean, slippage: number) => DepositQuote;
  deposit: (owner: PublicKey, tokenAInAmount: BN, tokenBInAmount: BN, poolTokenAmount: BN) => Promise<Transaction>;
  getWithdrawQuote: (lpTokenAmount: BN, slippage: number, tokenMint?: PublicKey) => WithdrawQuote;
  withdraw: (
    owner: PublicKey,
    withdrawTokenAmount: BN,
    tokenAOutAmount: BN,
    tokenBOutAmount: BN,
  ) => Promise<Transaction>;
  getUserLockEscrow: (owner: PublicKey) => Promise<LockEscrow | null>;
}

type Fees = {
  lp?: BN;
  tokenA: BN;
  tokenB: BN;
};

export type tokenAddressAndDecimals = {
  address: string;
  decimals: number;
};

export interface LockEscrow {
  address: PublicKey;
  amount: BN;
  fee: {
    claimed: Fees;
    unClaimed: Fees;
  };
}

export type SwapQuote = {
  swapInAmount: BN;
  swapOutAmount: BN;
  minSwapOutAmount: BN;
  fee: BN;
  priceImpact: Decimal;
};

export type DepositQuote = {
  poolTokenAmountOut: BN;
  minPoolTokenAmountOut: BN;
  tokenAInAmount: BN;
  tokenBInAmount: BN;
};

export type WithdrawQuote = {
  poolTokenAmountIn: BN;
  minTokenAOutAmount: BN;
  minTokenBOutAmount: BN;
  tokenAOutAmount: BN;
  tokenBOutAmount: BN;
};

export interface SwapResult {
  amountOut: BN;
  priceImpact: Decimal;
  fee: BN;
}

export type AccountsToCache = {
  apyPdaBuffer: AccountInfo<Buffer> | null;
  poolBuffer: AccountInfo<Buffer> | null;
  vaultAPdaBuffer: AccountInfo<Buffer> | null;
  vaultBPdaBuffer: AccountInfo<Buffer> | null;
  vaultAReserveBuffer: AccountInfo<Buffer> | null;
  vaultBReserveBuffer: AccountInfo<Buffer> | null;
  vaultALpMintBuffer: AccountInfo<Buffer> | null;
  vaultBLpMintBuffer: AccountInfo<Buffer> | null;
  poolVaultALpBuffer: AccountInfo<Buffer> | null;
  poolVaultBLpBuffer: AccountInfo<Buffer> | null;
  poolLpMintBuffer: AccountInfo<Buffer> | null;
  marinadeBuffer: AccountInfo<Buffer> | null;
  solidoBuffer: AccountInfo<Buffer> | null;
  clockAccountBuffer: AccountInfo<Buffer> | null;
};

export enum AccountType {
  APY = 'apy',
  VAULT_A_RESERVE = 'vaultAReserve',
  VAULT_B_RESERVE = 'vaultBReserve',
  VAULT_A_LP = 'vaultALp',
  VAULT_B_LP = 'vaultBLp',
  POOL_VAULT_A_LP = 'poolVaultALp',
  POOL_VAULT_B_LP = 'poolVaultBLp',
  POOL_LP_MINT = 'poolLpMint',
  SYSVAR_CLOCK = 'sysClockVar',
}

export type CurveType = ConstantProductCurve | StableSwapCurve;

export type StableSwapCurve = {
  stable: {
    amp: BN;
    tokenMultiplier: TokenMultiplier;
    depeg: Depeg;
    lastAmpUpdatedTimestamp: BN;
  };
};

export type ConstantProductCurve = {
  constantProduct: {};
};

export type DepegNone = {
  none: {};
};

export type DepegMarinade = {
  marinade: {};
};

export type DepegSplStake = {
  splStake: {};
};

export type DepegLido = {
  lido: {};
};

export type DepegType = DepegNone | DepegMarinade | DepegLido | DepegSplStake;

export interface TokenMultiplier {
  tokenAMultiplier: BN;
  tokenBMultiplier: BN;
  precisionFactor: number;
}

export type PoolType = PermissionedType | PermissionedlessType;

export type PermissionedType = {
  permissioned: {};
};

export type PermissionedlessType = {
  permissionless: {};
};

export type PoolState = Omit<IdlAccounts<AmmIdl>['pool'], 'curveType' | 'fees' | 'poolType'> & {
  curveType: CurveType;
  fees: PoolFees;
  poolType: PoolType;
};

export type Depeg = Omit<IdlTypes<AmmIdl>['Depeg'], 'depegType'> & { depegType: DepegType };
export type PoolFees = IdlTypes<AmmIdl>['PoolFees'];
export type Bootstrapping = IdlTypes<AmmIdl>['Bootstrapping'];
export type LockEscrowAccount = IdlAccounts<AmmIdl>['lockEscrow'];
export type CustomizableParams = IdlTypes<AmmIdl>['CustomizableParams'];

export type PoolInformation = {
  tokenAAmount: BN;
  tokenBAmount: BN;
  virtualPrice: number;
  virtualPriceRaw: BN;
};

export type AccountsInfo = {
  vaultAReserve: BN;
  vaultBReserve: BN;
  vaultALpSupply: BN;
  vaultBLpSupply: BN;
  poolVaultALp: BN;
  poolVaultBLp: BN;
  poolLpSupply: BN;
  currentTime: BN;
  currentSlot: BN;
};

export interface StakePool {
  totalLamports: BN;
  poolTokenSupply: BN;
}

export const StakePoolLayout = struct([
  u8('accountType'),
  publicKey('manager'),
  publicKey('staker'),
  publicKey('stakeDepositAuthority'),
  u8('stakeWithdrawBumpSeed'),
  publicKey('validatorList'),
  publicKey('reserveStake'),
  publicKey('poolMint'),
  publicKey('managerFeeAccount'),
  publicKey('tokenProgramId'),
  u64('totalLamports'),
  u64('poolTokenSupply'),
  u64('lastUpdateEpoch'),
]);

export interface Clock {
  slot: BN;
  epochStartTimestamp: BN;
  epoch: BN;
  leaderScheduleEpoch: BN;
  unixTimestamp: BN;
}

export const ClockLayout = struct([
  u64('slot'),
  i64('epochStartTimestamp'),
  u64('epoch'),
  u64('leaderScheduleEpoch'),
  i64('unixTimestamp'),
]);

/** Utils */
export interface ParsedClockState {
  info: {
    epoch: number;
    epochStartTimestamp: number;
    leaderScheduleEpoch: number;
    slot: number;
    unixTimestamp: number;
  };
  type: string;
  program: string;
  space: number;
}

export type SwapQuoteParam = {
  poolState: PoolState;
  vaultA: VaultState;
  vaultB: VaultState;
  poolVaultALp: BN;
  poolVaultBLp: BN;
  vaultALpSupply: BN;
  vaultBLpSupply: BN;
  vaultAReserve: BN;
  vaultBReserve: BN;
  currentTime: number;
  currentSlot: number;
  depegAccounts: Map<String, AccountInfo<Buffer>>;
};

export enum ActivationType {
  Slot,
  Timestamp,
}
