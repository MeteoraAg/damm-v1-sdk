# Meteora Dynamic AMM SDK

<p align="center">
<img align="center" src="https://app.meteora.ag/icons/logo.svg" width="180" height="180" />
</p>
<br>

## Getting started

NPM: https://www.npmjs.com/package/@meteora-ag/dynamic-amm-sdk

SDK: https://github.com/MeteoraAg/dynamic-amm-sdk

<!-- Docs: https://docs.mercurial.finance/mercurial-dynamic-yield-infra/ -->

Discord: https://discord.com/channels/841152225564950528/864859354335412224

<hr>

## Installation

```bash
# NPM
npm i @meteora-ag/dynamic-amm-sdk @coral-xyz/anchor @solana/web3.js @solana/spl-token
# YARN
yarn add @meteora-ag/dynamic-amm-sdk @coral-xyz/anchor @solana/web3.js @solana/spl-token
# Or, use any package manager of your choice.
```

## Pool Types

The Dynamic AMM SDK supports three types of pools:

- Constant Product Pool (Volatile Pool)

- Memecoin Pool (M3M3 Pool)

- Stable Pool

## Usage Examples

### Initialize AmmImpl instance

```ts
import AmmImpl, { MAINNET_POOL } from '@meteora-ag/dynamic-amm-sdk';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

// Connection, Wallet, and AnchorProvider to interact with the network
const mainnetConnection = new Connection('https://api.mainnet-beta.solana.com');
const mockWallet = new Wallet(new Keypair());
const provider = new AnchorProvider(mainnetConnection, mockWallet, {
  commitment: 'confirmed',
});
// Alternatively, to use Solana Wallet Adapter

// Create single instance
const constantProductPool = await AmmImpl.create(mainnetConnection, MAINNET_POOL.USDC_SOL);
const stablePool = await AmmImpl.create(mainnetConnection, MAINNET_POOL.USDT_USDC);
// Or with any other pool address, refer to the pool creation section below
const pool = await AmmImpl.create(mainnetConnection, new PublicKey('...'));

// If you need to create multiple, can consider using `createMultiple`
const pools = [MAINNET_POOL.USDC_SOL, MAINNET_POOL.USDT_USDC];
const [constantProductPool, stablePool] = await AmmImpl.createMultiple(mainnetConnection, pools);
```

### Creating New Pools

> Note: If the Dynamic AMM Pool is being launched with an Alpha Vault, SOL or USDC must be used as the quote token.

#### 1. Create Constant Product Pool

```ts
import AmmImpl, { PROGRAM_ID } from '@meteora-ag/dynamic-amm-sdk';
import { derivePoolAddressWithConfig } from '@meteora-ag/dynamic-amm-sdk/dist/cjs/src/amm/utils';
import { BN } from 'bn.js';

// Token A/B address of the pool.
const tokenAMint = new PublicKey('...');
const tokenBMint = new PublicKey('...');

// Configuration address for the pool. It will decide the fees of the pool.
const config = new PublicKey('...');

// Amount of token A and B to be deposited to the pool.
const tokenAAmount = new BN(100_000);
const tokenBAmount = new BN(500_000);

// Get pool address
const programId = new PublicKey(PROGRAM_ID);
const poolPubkey = derivePoolAddressWithConfig(tokenAMint, tokenBMint, config, programId);

// Create pool
const transactions = await AmmImpl.createPermissionlessConstantProductPoolWithConfig(
  provider.connection,
  mockWallet.publicKey, // payer
  tokenAMint,
  tokenBMint,
  tokenAAmount,
  tokenBAmount,
  config,
);

// Or if you need to set the activation point earlier than the default derived from the config
const startTime = '...';
const transactions = await AmmImpl.createPermissionlessConstantProductPoolWithConfig2(
  provider.connection,
  mockWallet.publicKey, // payer
  tokenAMint,
  tokenBMint,
  tokenAAmount,
  tokenBAmount,
  config,
  {
    activationPoint: startTime !== 'now' ? new BN(Math.floor(new UTCDate(startTime).getTime() / 1000)) : undefined,
  },
);

for (const transaction of transactions) {
  transaction.sign(mockWallet.payer);
  const txHash = await provider.connection.sendRawTransaction(transaction.serialize());
  await provider.connection.confirmTransaction(txHash, 'finalized');
  console.log('transaction %s', txHash);
}
```

#### 2. Create Stable Pool

```ts
import AmmImpl, { derivePoolAddress } from '@meteora-ag/dynamic-amm-sdk';
import { BN } from 'bn.js';

// Token A/B address of the pool.
const tokenAMint = new PublicKey('...');
const tokenBMint = new PublicKey('...');

const tokenADecimal = 6;
const tokenBDecimal = 6;

const feeBps = new BN(1); // 0.01%

// Get pool address
const poolPubkey = derivePoolAddress(
  provider.connection,
  tokenAMint,
  tokenBMint,
  tokenADecimal,
  tokenBDecimal,
  true, // stable
  feeBps,
);

// Create pool
const transactions = await AmmImpl.createPermissionlessPool(
  provider.connection,
  mockWallet.publicKey, // payer
  tokenAMint,
  tokenBMint,
  tokenAAmount,
  tokenBAmount,
  true, // stable,
  feeBps,
);

for (const transaction of transactions) {
  transaction.sign(mockWallet.payer);
  const txHash = await provider.connection.sendRawTransaction(transaction.serialize());
  await provider.connection.confirmTransaction(txHash, 'finalized');
  console.log('transaction %s', txHash);
}
```

#### 3. Create Memecoin Pool

```ts
import AmmImpl, { PROGRAM_ID } from '@meteora-ag/dynamic-amm-sdk';
import { derivePoolAddressWithConfig } from '@meteora-ag/dynamic-amm-sdk/dist/cjs/src/amm/utils';
import { BN } from 'bn.js';
import { roundToNearestMinutes } from 'date-fns';

// Token A/B address of the pool.
const memecoinMint = new PublicKey('...');
const tokenBMint = new PublicKey('...');

const memecoinAmount = new BN(100_000);
const tokenBAmount = new BN(500_000);

// Get pool address
const poolAddress = derivePoolAddressWithConfig(memecoinMint, tokenBMint, feeConfig.publicKey, programId);

// Create pool
const programId = new PublicKey(PROGRAM_ID);

const isNow = true;
const CONFIG_KEY = new PublicKey('..');
const feeConfigurations = await AmmImpl.getFeeConfigurations(provider.connection, {
  programId,
});
const feeConfig = feeConfigurations.find(({ publicKey }) => publicKey.equals(CONFIG_KEY));

const transactions = await AmmImpl.createPermissionlessConstantProductMemecoinPoolWithConfig(
  provider.connection,
  mockWallet.publicKey, // payer
  memecoinMint,
  tokenBMint,
  memecoinAmount,
  tokenBAmount,
  feeConfig.publicKey,
  { isMinted: true },
);

// with M3M3 vault
const feeDurationInDays = 7;
const numOfStakers = 1000;
const feeClaimStartTime = roundToNearestMinutes(new Date(), {
  nearestTo: 30,
});
const cooldownDurationInHours = 6;

const transactions = await AmmImpl.createPermissionlessConstantProductMemecoinPoolWithConfig(
  provider.connection,
  mockWallet.publicKey, // payer
  memecoinMint,
  tokenBMint,
  memecoinAmount,
  tokenBAmount,
  feeConfig.publicKey,
  { isMinted: true },
  {
    feeVault: {
      secondsToFullUnlock: feeDurationInDays ? new BN(feeDurationInDays * 86400) : new BN(0),
      topListLength: numOfStakers || 0,
      startFeeDistributeTimestamp: feeClaimStartTime ? new BN(feeClaimStartTime.getTime() / 1000) : null,
      unstakeLockDuration: cooldownDurationInHours ? new BN(cooldownDurationInHours * 3600) : new BN(0),
    },
    // other options
  },
);

for (const transaction of transactions) {
  transaction.sign(mockWallet.payer);
  const txHash = await provider.connection.sendRawTransaction(transaction.serialize());
  await provider.connection.confirmTransaction(txHash, 'finalized');
  console.log('transaction %s', txHash);
}
```

> Note: For Alpha Vault integration, please refer to [Create Dynamic Pool With Permissionless Alpha Vault.](https://docs.meteora.ag/alpha-vault-docs/alpha-vault-without-whitelist#id-1.-create-dynamic-pool-with-permissionless-alpha-vault)

### Common Operations

#### Get Lp Supply

```ts
// To refetch the pool's latest supply
// Alternatively, use `AmmImpl.poolState.lpSupply`
const lpSupply = await pool.getLpSupply();
```

#### Check Pool Balance

```ts
// Get the user's ATA LP balance
const userLpBalance = await pool.getUserBalance(mockWallet.publicKey);
```

#### Update Pool State (It's recommended to update the deposit before perform any quotation)

```ts
await pool.updateState();
```

### Constant Product Pool Operations

#### Deposit

```ts
const balance = true;
const slippage = 0.1; // Max to 2 decimal place
const inAmountALamport = new BN(1 * 10 ** constantProductPool.tokenAMint.decimals);

// Get deposit quote
const { poolTokenAmountOut, tokenAInAmount, tokenBInAmount } = constantProductPool.getDepositQuote(
  inAmountALamport,
  new BN(0),
  balance,
  slippage,
);

const depositTx = await constantProductPool.deposit(
  mockWallet.publicKey,
  tokenAInAmount,
  tokenBInAmount,
  poolTokenAmountOut,
); // Web3 Transaction Object
const depositResult = await provider.sendAndConfirm(depositTx); // Transaction hash
```

#### Withdraw

```ts
const slippage = 0.1; // Max to 2 decimal place
const outTokenAmountLamport = new BN(0.1 * 10 ** constantProductPool.decimals);

const { poolTokenAmountIn, tokenAOutAmount, tokenBOutAmount } = constantProductPool.getWithdrawQuote(
  outTokenAmountLamport,
  slippage,
); // use lp balance for full withdrawal
const withdrawTx = await constantProductPool.withdraw(
  mockWallet.publicKey,
  poolTokenAmountIn,
  tokenAOutAmount,
  tokenBOutAmount,
); // Web3 Transaction Object
const withdrawResult = await provider.sendAndConfirm(withdrawTx); // Transaction hash
```

#### Swap

```ts
const slippage = 0.1; // Max to 2 decimal place
const inAmountLamport = new BN(0.1 * 10 ** constantProductPool.tokenB.decimals);

const { minSwapOutAmount } = constantProductPool.getSwapQuote(
  new PublicKey(constantProductPool.tokenB.address),
  inAmountLamport,
  slippage,
);

const swapTx = await constantProductPool.swap(
  mockWallet.publicKey,
  new PublicKey(constantProductPool.tokenB.address),
  inAmountLamport,
  minSwapOutAmount,
);
const swapResult = await provider.sendAndConfirm(swapTx);
```

### Stable Pool Operations

#### Balanced Deposit

```ts
const slippage = 0.1; // Max to 2 decimal place
const balance = true;
const inAmountALamport = new BN(0.1 * 10 ** stablePool.tokenA.decimals);

const { poolTokenAmountOut, tokenAInAmount, tokenBInAmount } = stablePool.getDepositQuote(
  inAmountALamport,
  new BN(0),
  balance,
  slippage,
);

const depositTx = await stablePool.deposit(mockWallet.publicKey, tokenAInAmount, tokenBInAmount, poolTokenAmountOut); // Web3 Transaction Object
const depositResult = await provider.sendAndConfirm(depositTx); // Transaction hash
```

#### Double Side Imbalance Deposit

```ts
const slippage = 0.1; // Max to 2 decimal place
const balance = false;
const inAmountALamport = new BN(0.1 * 10 ** stablePool.tokenA.decimals);
const inAmountBLamport = new BN(0.1 * 10 ** stablePool.tokenB.decimals);

const { poolTokenAmountOut, tokenAInAmount, tokenBInAmount } = stablePool.getDepositQuote(
  inAmountALamport,
  inAmountBLamport,
  balance,
  slippage,
); // Web3 Transaction Object
const depositTx = await stablePool.deposit(mockWallet.publicKey, tokenAInAmount, tokenBInAmount, poolTokenAmountOut);
const depositResult = await provider.sendAndConfirm(depositTx); // Transaction hash
```

#### Single Side Imbalance Deposit

```ts
const slippage = 0.1; // Max to 2 decimal place
const balance = false;
const inAmountALamport = new BN(0.1 * 10 ** stablePool.tokenA.decimals);

const { poolTokenAmountOut, tokenAInAmount, tokenBInAmount } = stablePool.getDepositQuote(
  inAmountALamport,
  new BN(0),
  balance,
  slippage,
); // Web3 Transaction Object
const depositTx = await stablePool.deposit(mockWallet.publicKey, tokenAInAmount, tokenBInAmount, poolTokenAmountOut);
const depositResult = await provider.sendAndConfirm(depositTx); // Transaction hash
```

#### Balanced Withdraw

```ts
const slippage = 0.1; // Max to 2 decimal place
const outTokenAmountLamport = new BN(0.1 * 10 ** stablePool.decimals);

const { poolTokenAmountIn, tokenAOutAmount, tokenBOutAmount } = stablePool.getWithdrawQuote(
  outTokenAmountLamport,
  slippage,
); // use lp balance for full withdrawal
const withdrawTx = await stablePool.withdraw(mockWallet.publicKey, poolTokenAmountIn, tokenAOutAmount, tokenBOutAmount); // Web3 Transaction Object
const withdrawResult = await provider.sendAndConfirm(withdrawTx);
```

#### Imbalanced Withdraw

```ts
const slippage = 0.1; // Max to 2 decimal place
const outTokenAmountLamport = new BN(0.1 * 10 ** stablePool.decimals);

const { poolTokenAmountIn, tokenAOutAmount, tokenBOutAmount } = stablePool.getWithdrawQuote(
  outTokenAmountLamport,
  slippage,
  new PublicKey(stablePool.tokenA.address), // Pass in token A/B mint to perform imbalanced withdraw
);
const withdrawTx = await stablePool.withdraw(mockWallet.publicKey, poolTokenAmountIn, tokenAOutAmount, tokenBOutAmount); // Web3 Transaction Object
const withdrawResult = await provider.sendAndConfirm(withdrawTx);
```

#### Swap

```ts
const slippage = 0.1; // Max to 2 decimal place
const inAmountLamport = new BN(0.1 * 10 ** stablePool.tokenB.decimals);

const { minSwapOutAmount } = stablePool.getSwapQuote(
  new PublicKey(stablePool.tokenB.address),
  inAmountLamport,
  slippage,
);

const swapTx = await stablePool.swap(
  mockWallet.publicKey,
  new PublicKey(stablePool.tokenB.address),
  inAmountLamport,
  minSwapOutAmount,
);
const swapResult = await provider.sendAndConfirm(swapTx);
```

### Memecoin Pool Operations

#### Deposit

```ts
const balance = true;
const slippage = 0.1; // Max to 2 decimal place
const inAmountALamport = new BN(1 * 10 ** memecoinPool.tokenA.decimals);

// Get deposit quote for constant product
const { poolTokenAmountOut, tokenAInAmount, tokenBInAmount } = memecoinPool.getDepositQuote(
  inAmountALamport,
  new BN(0),
  balance,
  slippage,
);

const depositTx = await memecoinPool.deposit(mockWallet.publicKey, tokenAInAmount, tokenBInAmount, poolTokenAmountOut); // Web3 Transaction Object
const depositResult = await provider.sendAndConfirm(depositTx); // Transaction hash
```

#### Withdraw

```ts
const slippage = 0.1; // Max to 2 decimal place
const outTokenAmountLamport = new BN(0.1 * 10 ** memecoinPool.decimals);

const { poolTokenAmountIn, tokenAOutAmount, tokenBOutAmount } = memecoinPool.getWithdrawQuote(
  outTokenAmountLamport,
  slippage,
); // use lp balance for full withdrawal
const withdrawTx = await memecoinPool.withdraw(
  mockWallet.publicKey,
  poolTokenAmountIn,
  tokenAOutAmount,
  tokenBOutAmount,
); // Web3 Transaction Object
const withdrawResult = await provider.sendAndConfirm(withdrawTx); // Transaction hash
```

#### Swap

```ts
const slippage = 0.1; // Max to 2 decimal place
const inAmountLamport = new BN(0.1 * 10 ** memecoinPool.tokenB.decimals);

const { minSwapOutAmount } = memecoinPool.getSwapQuote(
  new PublicKey(memecoinPool.tokenB.address),
  inAmountLamport,
  slippage,
);

const swapTx = await memecoinPool.swap(
  mockWallet.publicKey,
  new PublicKey(memecoinPool.tokenB.address),
  inAmountLamport,
  minSwapOutAmount,
);
const swapResult = await provider.sendAndConfirm(swapTx);
```
