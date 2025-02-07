import AmmImpl from '..';
import { airDropSol, getOrCreateATA, mockWallet } from './utils';
import {
  CONSTANT_PRODUCT_DEFAULT_TRADE_FEE_BPS,
  DEFAULT_SLIPPAGE,
  MAINNET_POOL,
  STABLE_SWAP_DEFAULT_TRADE_FEE_BPS,
} from '../constants';
import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, BN } from '@coral-xyz/anchor';
import DynamicAmmError from '../error';
import { IDL } from '../idl';
import { createMint, getMint, Mint, mintTo } from '@solana/spl-token';
import { derivePoolAddress } from '../utils';

describe('Error parsing', () => {
  const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
  const provider = new AnchorProvider(connection, mockWallet, {
    commitment: connection.commitment,
  });

  let USDT: PublicKey;
  let USDC: PublicKey;

  let usdtMint: Mint;
  let usdcMint: Mint;

  let mockWalletUsdtATA: PublicKey;
  let mockWalletUsdcATA: PublicKey;

  let usdtDecimal = 6;
  let usdcDecimal = 6;

  const usdtMultiplier = 10 ** usdtDecimal;
  const usdcMultiplier = 10 ** usdcDecimal;

  let stablePool: AmmImpl;
  let cpPool: AmmImpl;
  let lstPool: AmmImpl;

  beforeAll(async () => {
    await airDropSol(connection, mockWallet.publicKey, 10);

    [USDT, USDC] = await Promise.all(
      [usdtDecimal, usdcDecimal].map((decimal) =>
        createMint(provider.connection, mockWallet.payer, mockWallet.publicKey, null, decimal),
      ),
    );
    [mockWalletUsdtATA, mockWalletUsdcATA] = await Promise.all(
      [USDT, USDC].map((m) => getOrCreateATA(connection, m, mockWallet.publicKey, mockWallet.payer)),
    );
    [usdtMint, usdcMint] = await Promise.all([USDT, USDC].map((mint) => getMint(connection, mint)));

    await mintTo(
      provider.connection,
      mockWallet.payer,
      USDT,
      mockWalletUsdtATA,
      mockWallet.payer.publicKey,
      1000000 * usdtMultiplier,
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
  });

  beforeAll(async () => {
    await airDropSol(connection, mockWallet.publicKey, 10);

    const usdtDepositAmount = new BN(10000 * usdtMultiplier);
    const usdcDepositAmount = new BN(10000 * usdcMultiplier);

    let tradeFeeBps = new BN(STABLE_SWAP_DEFAULT_TRADE_FEE_BPS);
    let transaction = await AmmImpl.createPermissionlessPool(
      connection,
      mockWallet.publicKey,
      USDT,
      USDC,
      usdtDepositAmount,
      usdcDepositAmount,
      true,
      tradeFeeBps,
    );

    transaction.sign(mockWallet.payer);
    let txHash = await connection.sendRawTransaction(transaction.serialize());
    await connection.confirmTransaction(txHash, 'finalized');

    let poolKey = derivePoolAddress(
      connection,
      usdtMint.address,
      usdcMint.address,
      usdtMint.decimals,
      usdcMint.decimals,
      true,
      tradeFeeBps,
    );
    stablePool = await AmmImpl.create(connection, poolKey);

    tradeFeeBps = new BN(CONSTANT_PRODUCT_DEFAULT_TRADE_FEE_BPS);
    transaction = await AmmImpl.createPermissionlessPool(
      connection,
      mockWallet.publicKey,
      USDT,
      USDC,
      usdtDepositAmount,
      usdcDepositAmount,
      false,
      tradeFeeBps,
    );

    transaction.sign(mockWallet.payer);
    txHash = await connection.sendRawTransaction(transaction.serialize());
    await connection.confirmTransaction(txHash, 'finalized');

    poolKey = derivePoolAddress(
      connection,
      usdtMint.address,
      usdcMint.address,
      usdtMint.decimals,
      usdcMint.decimals,
      false,
      tradeFeeBps,
    );
    cpPool = await AmmImpl.create(connection, poolKey);

    lstPool = await AmmImpl.create(connection, MAINNET_POOL.SOL_MSOL);
  });

  test('Should throw slippage error', async () => {
    const inAmountBLamport = new BN(0.1 * 10 ** cpPool.tokenBMint.decimals);

    const { tokenAInAmount: cpTokenAInAmount, tokenBInAmount: cpTokenBInAmount } = cpPool.getDepositQuote(
      new BN(0),
      inAmountBLamport,
      true,
      DEFAULT_SLIPPAGE,
    );

    const cpDepositTx = await cpPool.deposit(
      mockWallet.publicKey,
      cpTokenAInAmount,
      cpTokenBInAmount,
      new BN(Number.MAX_SAFE_INTEGER),
    );

    await provider.sendAndConfirm(cpDepositTx).catch((error) => {
      const ammError = new DynamicAmmError(error);

      expect(ammError.errorCode).toBe(IDL.errors[4].code);
    });

    const inLamportAmount = new BN(1 * 10 ** lstPool.tokenAMint.decimals);
    const { tokenAInAmount: depegTokenAInAmount, tokenBInAmount: depegTokenBInAmount } = lstPool.getDepositQuote(
      inLamportAmount,
      new BN(0),
      false,
      DEFAULT_SLIPPAGE,
    );

    const lstPoolDepositTx = await lstPool.deposit(
      mockWallet.publicKey,
      depegTokenAInAmount,
      depegTokenBInAmount,
      new BN(Number.MAX_SAFE_INTEGER),
    );

    await provider.sendAndConfirm(lstPoolDepositTx).catch((error) => {
      const ammError = new DynamicAmmError(error);
      expect(ammError.errorCode).toBe(IDL.errors[4].code);
    });

    const { tokenAInAmount: stableTokenAInAmount, tokenBInAmount: stableTokenBInAmount } = stablePool.getDepositQuote(
      new BN(0),
      inAmountBLamport,
      true,
      DEFAULT_SLIPPAGE,
    );

    const stablePoolDepositTx = await stablePool.deposit(
      mockWallet.publicKey,
      stableTokenAInAmount,
      stableTokenBInAmount,
      new BN(Number.MAX_SAFE_INTEGER),
    );

    await provider.sendAndConfirm(stablePoolDepositTx).catch((error) => {
      const ammError = new DynamicAmmError(error);

      expect(ammError.errorCode).toBe(IDL.errors[4].code);
    });
  });
});
