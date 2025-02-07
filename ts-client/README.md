# Mercurial Amm Dynamic SDK

<p align="center">
<img align="center" src="https://vaults.mercurial.finance/icons/logo.svg" width="180" height="180" />
</p>
<br>

## Getting started

NPM: https://www.npmjs.com/package/meteora-ag/dynamic-amm-sdk

SDK: https://github.com/meteora-ag/mercurial-dynamic-amm-sdk

<!-- Docs: https://docs.mercurial.finance/mercurial-dynamic-yield-infra/ -->

Discord: https://discord.com/channels/841152225564950528/864859354335412224

<hr>

## Install

1. Install deps

```
npm i @meteora-ag/dynamic-amm-sdk @coral-xyz/anchor @solana/web3.js @solana/spl-token
```

2. Initialize AmmImpl instance

```ts
import AmmImpl, { MAINNET_POOL } from '@meteora-ag/dynamic-amm-sdk';
import { PublicKey } from '@solana/web3.js';
import { Wallet, AnchorProvider } from '@project-serum/anchor';

// Connection, Wallet, and AnchorProvider to interact with the network
const mainnetConnection = new Connection('https://api.mainnet-beta.solana.com');
const mockWallet = new Wallet(new Keypair());
const provider = new AnchorProvider(mainnetConnection, mockWallet, {
  commitment: 'confirmed',
});
// Alternatively, to use Solana Wallet Adapter

const constantProductPool = await AmmImpl.create(connection, MAINNET_POOL.USDC_SOL);
const stablePool = await AmmImpl.create(connection, MAINNET_POOL.USDT_USDC);

// If you need to create multiple, can consider using `createMultiple`
const pools = [MAINNET_POOL.USDC_SOL, MAINNET_POOL.USDT_USDC];
const [constantProductPool, stablePool] = await AmmImpl.createMultiple(connection, pools);
```

3. To interact with the AmmImpl

- Get Lp Supply

```ts
// To refetch the pool's latest supply
// Alternatively, use `AmmImpl.poolState.lpSupply`
const lpSupply = await constantProductPool.getLpSupply();
```

- Check pool balance

```ts
// Get the user's ATA LP balance
const userLpBalance = await constantProductPool.getUserBalance(mockWallet.publicKey);
```

- Update pool state (It's recommended to update the deposit before perform any quotation)

```ts
await constantProduct.updateState();
```

- Deposit to constant product

```ts
const inAmountALamport = new BN(1 * 10 ** constantProductPool.tokenA.decimals); // 1.0 SOL

// Get deposit quote for constant product
const { poolTokenAmountOut, tokenAInAmount, tokenBInAmount } = constantProductPool.getDepositQuote(
  inAmountALamport,
  new BN(0),
);

const depositTx = await constantProductPool.deposit(
  mockWallet.publicKey,
  tokenAInAmount,
  tokenBInAmount,
  poolTokenAmountOut,
); // Web3 Transaction Object
const depositResult = await provider.sendAndConfirm(depositTx); // Transaction hash
```

- Balance deposit to stable pool

```ts
const inAmountALamport = new BN(0.1 * 10 ** stablePool.tokenA.decimals);

const { poolTokenAmountOut, tokenAInAmount, tokenBInAmount } = stablePool.getDepositQuote(inAmountALamport, new BN(0));

const depositTx = await stablePool.deposit(mockWallet.publicKey, tokenAInAmount, tokenBInAmount, poolTokenAmountOut); // Web3 Transaction Object
const depositResult = await provider.sendAndConfirm(depositTx); // Transaction hash
```

- Double side imbalance deposit to stable pool

```ts
const inAmountALamport = new BN(0.1 * 10 ** stablePool.tokenA.decimals);
const inAmountBLamport = new BN(0.1 * 10 ** stablePool.tokenB.decimals);

const { poolTokenAmountOut, tokenAInAmount, tokenBInAmount } = stablePool.getDepositQuote(
  inAmountALamport,
  inAmountBLamport,
  false, // pass in false for imbalance deposit quote
); // Web3 Transaction Object
const depositTx = await stablePool.deposit(mockWallet.publicKey, tokenAInAmount, tokenBInAmount, poolTokenAmountOut);
const depositResult = await provider.sendAndConfirm(depositTx); // Transaction hash
```

- Single side imbalance deposit to stable pool

```ts
const inAmountALamport = new BN(0.1 * 10 ** stablePool.tokenA.decimals);

const { poolTokenAmountOut, tokenAInAmount, tokenBInAmount } = stablePool.getDepositQuote(
  inAmountALamport,
  new BN(0),
  false, // pass in false for imbalance deposit quote
); // Web3 Transaction Object
const depositTx = await stablePool.deposit(mockWallet.publicKey, tokenAInAmount, tokenBInAmount, poolTokenAmountOut);
const depositResult = await provider.sendAndConfirm(depositTx); // Transaction hash
```

- Balance withdraw from constant product

```ts
const outTokenAmountLamport = new BN(0.1 * 10 ** cpPool.decimals);

const { poolTokenAmountIn, tokenAOutAmount, tokenBOutAmount } = cpPool.getWithdrawQuote(outTokenAmountLamport); // use lp balance for full withdrawal
const withdrawTx = await cpPool.withdraw(mockWallet.publicKey, poolTokenAmountIn, tokenAOutAmount, tokenBOutAmount); // Web3 Transaction Object
const withdrawResult = await provider.sendAndConfirm(withdrawTx); // Transaction hash
```

- Balance withdraw from stable pool

```ts
const outTokenAmountLamport = new BN(0.1 * 10 ** stablePool.decimals);

const { poolTokenAmountIn, tokenAOutAmount, tokenBOutAmount } = stablePool.getWithdrawQuote(outTokenAmountLamport); // use lp balance for full withdrawal
const withdrawTx = await stablePool.withdraw(mockWallet.publicKey, poolTokenAmountIn, tokenAOutAmount, tokenBOutAmount); // Web3 Transaction Object
const withdrawResult = await provider.sendAndConfirm(withdrawTx);
```

- Imbalance withdraw from stable pool

```ts
const outTokenAmountLamport = new BN(0.1 * 10 ** stablePool.decimals);

const { poolTokenAmountIn, tokenAOutAmount, tokenBOutAmount } = stablePool.getWithdrawQuote(
  outTokenAmountLamport,
  new PublicKey(stablePool.tokenA.address), // Pass in token A/B mint to perform imbalance withdraw
);
const withdrawTx = await stablePool.withdraw(mockWallet.publicKey, poolTokenAmountIn, tokenAOutAmount, tokenBOutAmount); // Web3 Transaction Object
const withdrawResult = await provider.sendAndConfirm(withdrawTx);
```

- Swap

```ts
const inAmountLamport = new BN(0.1 * 10 ** constantProductPool.tokenB.decimals);

// Swap SOL → USDT
const { minSwapOutAmount } = constantProductPool.getSwapQuote(
  new PublicKey(constantProductPool.tokenB.address),
  inAmountLamport,
);

const swapTx = await constantProductPool.swap(
  mockWallet.publicKey,
  new PublicKey(constantProductPool.tokenB.address),
  inAmountLamport,
  minSwapOutAmount,
);
const swapResult = await provider.sendAndConfirm(swapTx);
```

- Update pool state

```ts
constantProductPool.updateState();
```
