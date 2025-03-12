import { VaultIdl as Vault, IDL as VaultIdl } from '@meteora-ag/vault-sdk';
import AmmImpl from './src/amm';
import DynamicAmmError from './src/amm/error';
import { StableSwap, ConstantProductSwap } from './src/amm/curve';
import {
  PROGRAM_ID,
  MAINNET_POOL,
  DEVNET_POOL,
  CURVE_TYPE_ACCOUNTS,
  CONSTANT_PRODUCT_ALLOWED_TRADE_FEE_BPS,
  STABLE_SWAP_ALLOWED_TRADE_FEE_BPS,
} from './src/amm/constants';
import {
  getOnchainTime,
  calculateMaxSwapOutAmount,
  calculateSwapQuote,
  calculatePoolInfo,
  getDepegAccounts,
  checkPoolExists,
  getTokensMintFromPoolAddress,
  derivePoolAddress,
} from './src/amm/utils';
import { Amm, IDL as AmmIdl } from './src/amm/idl';

export default AmmImpl;
export {
  AmmImpl,
  // Classes
  ConstantProductSwap,
  StableSwap,
  DynamicAmmError,
  // Utils
  getDepegAccounts,
  getOnchainTime,
  calculateMaxSwapOutAmount,
  calculateSwapQuote,
  calculatePoolInfo,
  checkPoolExists,
  getTokensMintFromPoolAddress,
  derivePoolAddress,
  // Constant
  PROGRAM_ID,
  MAINNET_POOL,
  DEVNET_POOL,
  CURVE_TYPE_ACCOUNTS,
  CONSTANT_PRODUCT_ALLOWED_TRADE_FEE_BPS,
  STABLE_SWAP_ALLOWED_TRADE_FEE_BPS,
  // IDL
  AmmIdl,
  VaultIdl,
};

export type {
  AmmImplementation,
  DepositQuote,
  WithdrawQuote,
  SwapQuote,
  PoolState,
  LockEscrow,
  PoolInformation,
  ParsedClockState,
  ConstantProductCurve,
  StableSwapCurve,
  SwapQuoteParam,
  Bootstrapping,
} from './src/amm/types';
export type { VaultState } from '@meteora-ag/vault-sdk';
export type { Amm, Vault };
