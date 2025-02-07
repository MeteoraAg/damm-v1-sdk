import { AnchorProvider, BN } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { CONSTANT_PRODUCT_DEFAULT_TRADE_FEE_BPS, DEFAULT_SLIPPAGE, PROGRAM_ID } from '../constants';
import AmmImpl from '../index';
import { derivePoolAddress, derivePoolAddressWithConfig, getOnchainTime } from '../utils';
import { airDropSol, getOrCreateATA, mockWallet } from './utils';
import { createMint, getMint, Mint, mintTo } from '@solana/spl-token';
import { ActivationType } from '../types';

describe('Constant product pool', () => {
  const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
  const provider = new AnchorProvider(connection, mockWallet, {
    commitment: connection.commitment,
  });

  let BTC: PublicKey;
  let USDC: PublicKey;

  let mockWalletBtcATA: PublicKey;
  let mockWalletUsdcATA: PublicKey;

  let btcMint: Mint;
  let usdcMint: Mint;

  let btcDecimal = 8;
  let usdcDecimal = 6;

  const btcMultiplier = 10 ** btcDecimal;
  const usdcMultiplier = 10 ** usdcDecimal;

  let cpPoolFeeTiered: AmmImpl;
  let cpPoolConfig: AmmImpl;

  beforeAll(async () => {
    await airDropSol(connection, mockWallet.publicKey, 10);
    [BTC, USDC] = await Promise.all(
      [btcDecimal, usdcDecimal].map((decimal) =>
        createMint(provider.connection, mockWallet.payer, mockWallet.publicKey, null, decimal),
      ),
    );
    [mockWalletBtcATA, mockWalletUsdcATA] = await Promise.all(
      [BTC, USDC].map((mint) => getOrCreateATA(connection, mint, mockWallet.publicKey, mockWallet.payer)),
    );
    [btcMint, usdcMint] = await Promise.all([BTC, USDC].map((mint) => getMint(connection, mint)));

    await mintTo(
      provider.connection,
      mockWallet.payer,
      BTC,
      mockWalletBtcATA,
      mockWallet.payer.publicKey,
      10000 * btcMultiplier,
      [],
      {
        commitment: 'confirmed',
      },
    );

    await mintTo(
      provider.connection,
      mockWallet.payer,
      USDC,
      mockWalletUsdcATA,
      mockWallet.payer.publicKey,
      1000000 * usdcMultiplier,
      [],
      {
        commitment: 'confirmed',
      },
    );

    // await btcToken.mintTo(mockWalletBtcATA, mockWallet.payer, [], 10000 * btcMultiplier);
    // await usdcToken.mintTo(mockWalletUsdcATA, mockWallet.payer, [], 1000000 * usdcMultiplier);
  });

  describe('With fee tier', () => {
    test('Create constant product pool', async () => {
      const btcDepositAmount = new BN(1 * btcMultiplier);
      const usdcDepositAmount = new BN(70000 * usdcMultiplier);

      const tradeFeeBps = new BN(CONSTANT_PRODUCT_DEFAULT_TRADE_FEE_BPS);
      const transaction = await AmmImpl.createPermissionlessPool(
        connection,
        mockWallet.publicKey,
        BTC,
        USDC,
        btcDepositAmount,
        usdcDepositAmount,
        false,
        tradeFeeBps,
      );

      transaction.sign(mockWallet.payer);
      const txHash = await connection.sendRawTransaction(transaction.serialize());
      await connection.confirmTransaction(txHash, 'finalized');

      const poolKey = derivePoolAddress(
        connection,
        btcMint.address,
        usdcMint.address,
        btcMint.decimals,
        usdcMint.decimals,
        false,
        tradeFeeBps,
      );
      cpPoolFeeTiered = await AmmImpl.create(connection, poolKey);

      expect(poolKey.toBase58()).toBe(cpPoolFeeTiered.address.toBase58());
      expect(cpPoolFeeTiered.isStablePool).toBe(false);
      expect(cpPoolFeeTiered.tokenAMint.address.toString()).toBe(BTC.toString());
      expect(cpPoolFeeTiered.tokenBMint.address.toString()).toBe(USDC.toString());
    });

    test('Get pool mint and supply', async () => {
      const lpMint = cpPoolFeeTiered.getPoolTokenMint();
      expect(lpMint).toBeDefined();

      const lpSupply = await cpPoolFeeTiered.getLpSupply();
      expect(lpSupply).toBeDefined();
    });

    test('Get user balance', async () => {
      const poolBalance = await cpPoolFeeTiered.getUserBalance(mockWallet.publicKey);
      expect(poolBalance).toBeDefined();
    });

    test('Deposit', async () => {
      await cpPoolFeeTiered.updateState();

      const btcDepositAmount = new BN(1 * btcMultiplier);

      const depositQuote = await cpPoolFeeTiered.getDepositQuote(btcDepositAmount, new BN(0), true, 0);

      const depositTx = await cpPoolFeeTiered.deposit(
        mockWallet.publicKey,
        depositQuote.tokenAInAmount,
        depositQuote.tokenBInAmount,
        depositQuote.poolTokenAmountOut,
      );

      try {
        const beforeTokenABalance = await provider.connection
          .getTokenAccountBalance(mockWalletBtcATA)
          .then((v) => new BN(v.value.amount));
        const beforeTokenBBalance = await provider.connection
          .getTokenAccountBalance(mockWalletUsdcATA)
          .then((v) => new BN(v.value.amount));

        const depositResult = await provider.sendAndConfirm(depositTx);
        console.log('Deposit', depositResult);

        const afterTokenABalance = await provider.connection
          .getTokenAccountBalance(mockWalletBtcATA)
          .then((v) => new BN(v.value.amount));
        const afterTokenBBalance = await provider.connection
          .getTokenAccountBalance(mockWalletUsdcATA)
          .then((v) => new BN(v.value.amount));

        expect(afterTokenABalance.lt(beforeTokenABalance)).toBe(true);
        expect(afterTokenBBalance.lt(beforeTokenBBalance)).toBe(true);
      } catch (error: any) {
        console.trace(error);
        throw new Error(error.message);
      }
    });

    test('Withdraw', async () => {
      await cpPoolFeeTiered.updateState();
      const lpTokenBalance = await cpPoolFeeTiered.getUserBalance(mockWallet.publicKey);
      const lpTokenToWithdraw = lpTokenBalance.div(new BN(2));

      const withdrawQuote = await cpPoolFeeTiered.getWithdrawQuote(lpTokenToWithdraw, 0);

      const withdrawTx = await cpPoolFeeTiered.withdraw(
        mockWallet.publicKey,
        withdrawQuote.poolTokenAmountIn,
        withdrawQuote.tokenAOutAmount,
        withdrawQuote.tokenBOutAmount,
      );

      try {
        const beforeTokenABalance = await provider.connection
          .getTokenAccountBalance(mockWalletBtcATA)
          .then((v) => new BN(v.value.amount));
        const beforeTokenBBalance = await provider.connection
          .getTokenAccountBalance(mockWalletUsdcATA)
          .then((v) => new BN(v.value.amount));

        const withdrawResult = await provider.sendAndConfirm(withdrawTx);
        console.log('Withdraw', withdrawResult);

        const afterTokenABalance = await provider.connection
          .getTokenAccountBalance(mockWalletBtcATA)
          .then((v) => new BN(v.value.amount));
        const afterTokenBBalance = await provider.connection
          .getTokenAccountBalance(mockWalletUsdcATA)
          .then((v) => new BN(v.value.amount));

        const tokenAWithdrawn = afterTokenABalance.sub(beforeTokenABalance);
        const tokenBWithdrawn = afterTokenBBalance.sub(beforeTokenBBalance);
        expect(tokenAWithdrawn.eq(withdrawQuote.tokenAOutAmount)).toBe(true);
        expect(tokenBWithdrawn.eq(withdrawQuote.tokenBOutAmount)).toBe(true);
      } catch (error: any) {
        console.trace(error);
        throw new Error(error.message);
      }
    });

    test('Swap A → B', async () => {
      await cpPoolFeeTiered.updateState();
      const inAmountLamport = new BN(0.1 * 10 ** cpPoolFeeTiered.tokenAMint.decimals);
      const inTokenMint = new PublicKey(cpPoolFeeTiered.tokenAMint.address);

      const { swapOutAmount, minSwapOutAmount } = cpPoolFeeTiered.getSwapQuote(
        inTokenMint,
        inAmountLamport,
        DEFAULT_SLIPPAGE,
      );
      expect(swapOutAmount.toNumber()).toBeGreaterThan(0);

      const swapTx = await cpPoolFeeTiered.swap(mockWallet.publicKey, inTokenMint, inAmountLamport, minSwapOutAmount);

      try {
        const beforeTokenBBalance = await provider.connection
          .getTokenAccountBalance(mockWalletUsdcATA)
          .then((v) => new BN(v.value.amount));

        const swapResult = await provider.sendAndConfirm(swapTx);
        console.log('Swap Result of A → B', swapResult);

        const afterTokenBBalance = await provider.connection
          .getTokenAccountBalance(mockWalletUsdcATA)
          .then((v) => new BN(v.value.amount));

        const tokenBReceived = afterTokenBBalance.sub(beforeTokenBBalance);
        expect(tokenBReceived.toString()).toBe(swapOutAmount.toString());
      } catch (error: any) {
        console.trace(error);
        throw new Error(error.message);
      }
    });

    test('Swap B → A', async () => {
      await cpPoolFeeTiered.updateState();
      const inAmountLamport = new BN(0.1 * 10 ** cpPoolFeeTiered.tokenBMint.decimals);
      const inTokenMint = new PublicKey(cpPoolFeeTiered.tokenBMint.address);

      const { swapOutAmount, minSwapOutAmount } = cpPoolFeeTiered.getSwapQuote(
        inTokenMint,
        inAmountLamport,
        DEFAULT_SLIPPAGE,
      );
      expect(swapOutAmount.toNumber()).toBeGreaterThan(0);

      const swapTx = await cpPoolFeeTiered.swap(mockWallet.publicKey, inTokenMint, inAmountLamport, minSwapOutAmount);

      try {
        const beforeTokenABalance = await provider.connection
          .getTokenAccountBalance(mockWalletBtcATA)
          .then((v) => new BN(v.value.amount));

        const swapResult = await provider.sendAndConfirm(swapTx);
        console.log('Swap Result of B → A', swapResult);

        const afterTokenABalance = await provider.connection
          .getTokenAccountBalance(mockWalletBtcATA)
          .then((v) => new BN(v.value.amount));

        const tokenAReceived = afterTokenABalance.sub(beforeTokenABalance);
        expect(tokenAReceived.toString()).toBe(swapOutAmount.toString());
      } catch (error: any) {
        console.trace(error);
        throw new Error(error.message);
      }
    });
  });

  describe('With config', () => {
    beforeAll(async () => {
      const tradeFeeBps = 1500;
      const protocolFeeBps = 5000;
      const partnerFeeNumerator = new BN(50_000);
      const transaction = await AmmImpl.createConfig(
        connection,
        mockWallet.publicKey,
        new BN(tradeFeeBps),
        new BN(protocolFeeBps),
        PublicKey.default,
        new BN(0),
        mockWallet.publicKey,
        ActivationType.Slot,
        partnerFeeNumerator,
      );
      transaction.sign(mockWallet.payer);
      const txHash = await connection.sendRawTransaction(transaction.serialize());
      console.log('Create config', txHash);
      await connection.confirmTransaction(txHash, 'finalized');
    });

    test('Create constant product pool', async () => {
      const configs = await AmmImpl.getFeeConfigurations(connection);
      const btcDepositAmount = new BN(1 * btcMultiplier);
      const usdcDepositAmount = new BN(70000 * usdcMultiplier);

      const transactions = await AmmImpl.createPermissionlessConstantProductPoolWithConfig(
        connection,
        mockWallet.publicKey,
        BTC,
        USDC,
        btcDepositAmount,
        usdcDepositAmount,
        configs[0].publicKey,
      );

      for (const transaction of transactions) {
        transaction.sign(mockWallet.payer);
        const txHash = await connection.sendRawTransaction(transaction.serialize());
        await connection.confirmTransaction(txHash, 'finalized');
      }

      const poolKey = derivePoolAddressWithConfig(BTC, USDC, configs[0].publicKey, new PublicKey(PROGRAM_ID));
      cpPoolConfig = await AmmImpl.create(connection, poolKey);

      expect(poolKey.toBase58()).toBe(cpPoolConfig.address.toBase58());
      expect(cpPoolConfig.isStablePool).toBe(false);
      expect(cpPoolConfig.tokenAMint.address.toString()).toBe(BTC.toString());
      expect(cpPoolConfig.tokenBMint.address.toString()).toBe(USDC.toString());
      const poolFees = cpPoolConfig.poolState.fees;
      expect(poolFees.tradeFeeNumerator.gt(new BN(0))).toBe(true);
      expect(poolFees.protocolTradeFeeNumerator.gt(new BN(0))).toBe(true);
    });

    test('Get pool mint and supply', async () => {
      const lpMint = cpPoolConfig.getPoolTokenMint();
      expect(lpMint).toBeDefined();

      const lpSupply = await cpPoolConfig.getLpSupply();
      expect(lpSupply).toBeDefined();
    });

    test('Get user balance', async () => {
      const poolBalance = await cpPoolConfig.getUserBalance(mockWallet.publicKey);
      expect(poolBalance).toBeDefined();
    });

    test('Deposit', async () => {
      await cpPoolConfig.updateState();

      const btcDepositAmount = new BN(1 * btcMultiplier);

      const depositQuote = await cpPoolConfig.getDepositQuote(btcDepositAmount, new BN(0), true, 0);

      const depositTx = await cpPoolConfig.deposit(
        mockWallet.publicKey,
        depositQuote.tokenAInAmount,
        depositQuote.tokenBInAmount,
        depositQuote.poolTokenAmountOut,
      );

      try {
        const beforeTokenABalance = await provider.connection
          .getTokenAccountBalance(mockWalletBtcATA)
          .then((v) => new BN(v.value.amount));
        const beforeTokenBBalance = await provider.connection
          .getTokenAccountBalance(mockWalletUsdcATA)
          .then((v) => new BN(v.value.amount));

        const depositResult = await provider.sendAndConfirm(depositTx);
        console.log('Deposit', depositResult);

        const afterTokenABalance = await provider.connection
          .getTokenAccountBalance(mockWalletBtcATA)
          .then((v) => new BN(v.value.amount));
        const afterTokenBBalance = await provider.connection
          .getTokenAccountBalance(mockWalletUsdcATA)
          .then((v) => new BN(v.value.amount));

        expect(afterTokenABalance.lt(beforeTokenABalance)).toBe(true);
        expect(afterTokenBBalance.lt(beforeTokenBBalance)).toBe(true);
      } catch (error: any) {
        console.trace(error);
        throw new Error(error.message);
      }
    });

    test('Withdraw', async () => {
      await cpPoolConfig.updateState();
      const lpTokenBalance = await cpPoolConfig.getUserBalance(mockWallet.publicKey);
      const lpTokenToWithdraw = lpTokenBalance.div(new BN(2));

      const withdrawQuote = await cpPoolConfig.getWithdrawQuote(lpTokenToWithdraw, 0);

      const withdrawTx = await cpPoolConfig.withdraw(
        mockWallet.publicKey,
        withdrawQuote.poolTokenAmountIn,
        withdrawQuote.tokenAOutAmount,
        withdrawQuote.tokenBOutAmount,
      );

      try {
        const beforeTokenABalance = await provider.connection
          .getTokenAccountBalance(mockWalletBtcATA)
          .then((v) => new BN(v.value.amount));
        const beforeTokenBBalance = await provider.connection
          .getTokenAccountBalance(mockWalletUsdcATA)
          .then((v) => new BN(v.value.amount));

        const withdrawResult = await provider.sendAndConfirm(withdrawTx);
        console.log('Withdraw', withdrawResult);

        const afterTokenABalance = await provider.connection
          .getTokenAccountBalance(mockWalletBtcATA)
          .then((v) => new BN(v.value.amount));
        const afterTokenBBalance = await provider.connection
          .getTokenAccountBalance(mockWalletUsdcATA)
          .then((v) => new BN(v.value.amount));

        const tokenAWithdrawn = afterTokenABalance.sub(beforeTokenABalance);
        const tokenBWithdrawn = afterTokenBBalance.sub(beforeTokenBBalance);
        expect(tokenAWithdrawn.eq(withdrawQuote.tokenAOutAmount)).toBe(true);
        expect(tokenBWithdrawn.eq(withdrawQuote.tokenBOutAmount)).toBe(true);
      } catch (error: any) {
        console.trace(error);
        throw new Error(error.message);
      }
    });

    test('Swap A → B', async () => {
      await cpPoolConfig.updateState();
      const inAmountLamport = new BN(0.1 * 10 ** cpPoolConfig.tokenAMint.decimals);
      const inTokenMint = new PublicKey(cpPoolConfig.tokenAMint.address);

      const { swapOutAmount, minSwapOutAmount } = cpPoolConfig.getSwapQuote(
        inTokenMint,
        inAmountLamport,
        DEFAULT_SLIPPAGE,
      );
      expect(swapOutAmount.toNumber()).toBeGreaterThan(0);

      const swapTx = await cpPoolConfig.swap(mockWallet.publicKey, inTokenMint, inAmountLamport, minSwapOutAmount);

      try {
        const beforeTokenBBalance = await provider.connection
          .getTokenAccountBalance(mockWalletUsdcATA)
          .then((v) => new BN(v.value.amount));

        const swapResult = await provider.sendAndConfirm(swapTx);
        console.log('Swap Result of A → B', swapResult);

        const afterTokenBBalance = await provider.connection
          .getTokenAccountBalance(mockWalletUsdcATA)
          .then((v) => new BN(v.value.amount));

        const tokenBReceived = afterTokenBBalance.sub(beforeTokenBBalance);
        expect(tokenBReceived.toString()).toBe(swapOutAmount.toString());
      } catch (error: any) {
        console.trace(error);
        throw new Error(error.message);
      }
    });

    test('Swap B → A', async () => {
      await cpPoolConfig.updateState();
      const inAmountLamport = new BN(0.1 * 10 ** cpPoolConfig.tokenBMint.decimals);
      const inTokenMint = new PublicKey(cpPoolConfig.tokenBMint.address);

      const { swapOutAmount, minSwapOutAmount } = cpPoolConfig.getSwapQuote(
        inTokenMint,
        inAmountLamport,
        DEFAULT_SLIPPAGE,
      );
      expect(swapOutAmount.toNumber()).toBeGreaterThan(0);

      const swapTx = await cpPoolConfig.swap(mockWallet.publicKey, inTokenMint, inAmountLamport, minSwapOutAmount);

      try {
        const beforeTokenABalance = await provider.connection
          .getTokenAccountBalance(mockWalletBtcATA)
          .then((v) => new BN(v.value.amount));

        const swapResult = await provider.sendAndConfirm(swapTx);
        console.log('Swap Result of B → A', swapResult);

        const afterTokenABalance = await provider.connection
          .getTokenAccountBalance(mockWalletBtcATA)
          .then((v) => new BN(v.value.amount));

        const tokenAReceived = afterTokenABalance.sub(beforeTokenABalance);
        expect(tokenAReceived.toString()).toBe(swapOutAmount.toString());
      } catch (error: any) {
        console.trace(error);
        throw new Error(error.message);
      }
    });

    test('Swap with referral', async () => {
      await cpPoolConfig.updateState();
      const inAmountLamport = new BN(10 * 10 ** cpPoolConfig.tokenAMint.decimals);
      const inTokenMint = new PublicKey(cpPoolConfig.tokenAMint.address);

      const { swapOutAmount, minSwapOutAmount } = cpPoolConfig.getSwapQuote(
        inTokenMint,
        inAmountLamport,
        DEFAULT_SLIPPAGE,
      );
      expect(swapOutAmount.toNumber()).toBeGreaterThan(0);

      const referralKeypair = Keypair.generate();
      const referralATA = await getOrCreateATA(connection, inTokenMint, referralKeypair.publicKey, mockWallet.payer);

      const swapTx = await cpPoolConfig.swap(
        mockWallet.publicKey,
        inTokenMint,
        inAmountLamport,
        minSwapOutAmount,
        referralKeypair.publicKey,
      );

      try {
        const beforeTokenBalance = await provider.connection
          .getTokenAccountBalance(referralATA)
          .then((v) => new BN(v.value.amount));

        const swapResult = await provider.sendAndConfirm(swapTx);
        console.log('Swap Result of A → B', swapResult);

        const afterTokenBalance = await provider.connection
          .getTokenAccountBalance(referralATA)
          .then((v) => new BN(v.value.amount));

        const referralFeeReceived = afterTokenBalance.sub(beforeTokenBalance);
        expect(referralFeeReceived.gt(new BN(0))).toBe(true);
      } catch (error: any) {
        console.trace(error);
        throw new Error(error.message);
      }
    });

    test('Partner claim fee', async () => {
      const [beforeTokenABalance, beforeTokenBBalance] = await Promise.all([
        provider.connection.getTokenAccountBalance(mockWalletBtcATA).then((v) => new BN(v.value.amount)),
        provider.connection.getTokenAccountBalance(mockWalletUsdcATA).then((v) => new BN(v.value.amount)),
      ]);

      const tx = await cpPoolConfig.partnerClaimFees(
        mockWallet.publicKey,
        new BN(Number.MAX_SAFE_INTEGER),
        new BN(Number.MAX_SAFE_INTEGER),
      );

      tx.sign(mockWallet.payer);
      const txSig = await connection.sendRawTransaction(tx.serialize());
      await connection.confirmTransaction(txSig, 'finalized');

      const [afterTokenABalance, afterTokenBBalance] = await Promise.all([
        provider.connection.getTokenAccountBalance(mockWalletBtcATA).then((v) => new BN(v.value.amount)),
        provider.connection.getTokenAccountBalance(mockWalletUsdcATA).then((v) => new BN(v.value.amount)),
      ]);

      expect(afterTokenABalance.gt(beforeTokenABalance)).toBe(true);
      expect(afterTokenBBalance.gt(beforeTokenBBalance)).toBe(true);
    });
  });
});
