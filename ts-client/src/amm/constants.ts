import { PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';

export const ERROR = {
  POOL_NOT_LOAD: 'Pool not loaded',
  INVALID_MINT: 'Invalid mint',
  INVALID_ACCOUNT: 'Account not found',
};

export const PROGRAM_ID = 'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB';
export const STAGING_PROGRAM_ID = 'ammbh4CQztZ6txJ8AaQgPsWjd6o7GhmvopS2JAo5bCB';

export const DEVNET_POOL = Object.freeze({
  USDT_USDC: new PublicKey('BAHscmu1NncGS7t4rc5gSBPv1UFEMkvLaon1Ahdd5rHi'),
  USDT_SOL: new PublicKey('Bgf1Sy5kfeDgib4go4NgzHuZwek8wE8NZus56z6uizzi'),
  SOL_MSOL: new PublicKey('2rkn2yM4wJcHPV57T8fPWeBksrfSpiNZoEjRgjtxNDEQ'),
});

export const MAINNET_POOL = Object.freeze({
  USDT_USDC: new PublicKey('32D4zRxNc1EssbJieVHfPhZM3rH6CzfUPrWUuWxD9prG'),
  USDC_SOL: new PublicKey('5yuefgbJJpmFNK2iiYbLSpv1aZXq7F9AUKkZKErTYCvs'),
  SOL_STSOL: new PublicKey('7EJSgV2pthhDfb4UiER9vzTqe2eojei9GEQAQnkqJ96e'),
  SOL_MSOL: new PublicKey('HcjZvfeSNJbNkfLD4eEcRBr96AD3w1GpmMppaeRZf7ur'),
});

// Extra accounts for depeg pools. Might add more addresses in the future when more different types of pools are being added
export const CURVE_TYPE_ACCOUNTS = {
  // Stake account of Marinade finance. Used to retrieve mSol virtual price
  marinade: new PublicKey('8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC'),
  // Stake account of Solana Lido. Used to retrieve stSol virtual price
  lido: new PublicKey('49Yi1TKkNyYjPAFdR9LBvoHcUjuPX4Df5T5yv39w2XTn'),
};

export const SEEDS = Object.freeze({
  APY: 'apy',
  FEE: 'fee',
  LP_MINT: 'lp_mint',
  LOCK_ESCROW: 'lock_escrow',
});

export const VAULT_BASE_KEY = new PublicKey('HWzXGcGHy4tcpYfaRDCyLNzXqBTv3E6BttpCH2vJxArv');

export const POOL_BASE_KEY = new PublicKey('H9NnqW5Thn9dUzW3DRXe2xDhKjwZd4qbjngnZwEvnDuC');

export const DEFAULT_SLIPPAGE = 1;

export const UNLOCK_AMOUNT_BUFFER = 0.998;

export const VIRTUAL_PRICE_PRECISION = new BN(100_000_000);

export const PERMISSIONLESS_AMP = new BN(100);

export const FEE_OWNER = new PublicKey('6WaLrrRfReGKBYUSkmx2K6AuT21ida4j8at2SUiZdXu8');

export const CONSTANT_PRODUCT_DEFAULT_TRADE_FEE_BPS = 25;

export const CONSTANT_PRODUCT_ALLOWED_TRADE_FEE_BPS = [25, 100, 400, 600];

export const STABLE_SWAP_DEFAULT_TRADE_FEE_BPS = 1;

export const STABLE_SWAP_ALLOWED_TRADE_FEE_BPS = [1, 4, 10, 100];

export const METAPLEX_PROGRAM = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

export const U64_MAX = new BN('18446744073709551615'); // max amount in program side
