import { BN, getProvider } from '@project-serum/anchor';
import { PublicKey, sendAndConfirmTransaction } from '@solana/web3.js';
import { TokenInfo } from '@solana/spl-token-registry';
import AmmImpl from '../../index';
import { AmmProgram, CurveType, PoolState, VaultProgram } from '../../types';
import { airDropSol, createAndMintTo, mockWallet } from '../utils';
import { USDC_TOKEN_DECIMAL, WSOL_TOKEN_DECIMAL } from '../constants';
import { createProgramWithWallet, deriveMintMetadata, derivePoolAddress } from '../../utils';
import { createUsdcTokenInfo, createWethTokenInfo } from '../utils/mock_token_info';
import { depositVault, setupVault } from '../utils/vault';
import { initializePermissionlessPoolWithFeeTier } from '../utils/pool';
import { Token } from '@solana/spl-token';
import { DEFAULT_SLIPPAGE } from '../../constants';

describe('Pool', () => {
  const provider = getProvider();

  let wsolAta: PublicKey;
  let usdcAta: PublicKey;

  let wsolTokenInfo: TokenInfo;
  let usdcTokenInfo: TokenInfo;

  let ammProgram: AmmProgram;
  let vaultProgram: VaultProgram;
  let wsolVault: PublicKey;
  let usdcVault: PublicKey;
  let wsolTokenMint: Token;
  let usdcTokenMint: Token;
  let pool: AmmImpl;

  before(async () => {
    await airDropSol(provider.connection, mockWallet.publicKey, 1000);

    let { ata: wsolAta, tokenMint: _wsolTokenMint } = await createAndMintTo(
      provider.connection,
      mockWallet.payer,
      mockWallet.publicKey,
      100000,
      WSOL_TOKEN_DECIMAL,
    );
    let { ata: usdcAta, tokenMint: _usdcTokenMint } = await createAndMintTo(
      provider.connection,
      mockWallet.payer,
      mockWallet.publicKey,
      100000,
      USDC_TOKEN_DECIMAL,
    );
    wsolTokenMint = _wsolTokenMint;
    usdcTokenMint = _usdcTokenMint;

    wsolTokenInfo = createWethTokenInfo(wsolTokenMint.publicKey);
    usdcTokenInfo = createUsdcTokenInfo(usdcTokenMint.publicKey);

    let { ammProgram: newAmmProgram, vaultProgram: newVaultProgram } = createProgramWithWallet(
      provider.connection,
      mockWallet,
    );
    ammProgram = newAmmProgram;
    vaultProgram = newVaultProgram;

    wsolVault = await setupVault(wsolTokenMint.publicKey, vaultProgram, mockWallet.payer);

    usdcVault = await setupVault(usdcTokenMint.publicKey, vaultProgram, mockWallet.payer);

    await depositVault(
      provider.connection,
      wsolVault,
      mockWallet.payer,
      vaultProgram,
      new BN(10 * 10 ** WSOL_TOKEN_DECIMAL),
    );

    await depositVault(
      provider.connection,
      usdcVault,
      mockWallet.payer,
      vaultProgram,
      new BN(1000 * 10 ** USDC_TOKEN_DECIMAL),
    );

    const tokenAAmount = new BN(10 * 10 ** WSOL_TOKEN_DECIMAL);
    const tokenBAmount = new BN(1000 * 10 ** USDC_TOKEN_DECIMAL);
    const tradeFeeBps = new BN(25);
    const curveType: CurveType = {
      constantProduct: {},
    };

    let poolPubkey = derivePoolAddress(provider.connection, wsolTokenInfo, usdcTokenInfo, false, tradeFeeBps);

    const tx = await AmmImpl.createPermissionlessPool(provider.connection, mockWallet.publicKey, wsolTokenInfo, usdcTokenInfo, tokenAAmount, tokenBAmount, false, tradeFeeBps);
    await sendAndConfirmTransaction(provider.connection, tx, [mockWallet.payer]);

    pool = await AmmImpl.create(provider.connection, poolPubkey, wsolTokenInfo, usdcTokenInfo);

    // const { pool: _pool } = await initializePermissionlessPoolWithFeeTier(
    //   provider.connection,
    //   wsolVault,
    //   usdcVault,
    //   ammProgram,
    //   vaultProgram,
    //   mockWallet.payer,
    //   curveType,
    //   tokenAAmount,
    //   tokenBAmount,
    //   tradeFeeBps,
    // );
    //
    // pool = await AmmImpl.create(provider.connection, _pool, wsolTokenInfo, usdcTokenInfo);
  });

  it('should able to subscribe reserve changes', async () => {
    const poolState = (await ammProgram.account.pool.fetchNullable(pool.address)) as any as PoolState;
    const aVaultLp = poolState.aVaultLp;
    const bVaultLp = poolState.bVaultLp;

    const inAmountLamport = new BN(2 * 10 ** WSOL_TOKEN_DECIMAL);

    const aVaultLpChangeSubId = provider.connection.onAccountChange(aVaultLp, async (accountInfo, context) => {
      console.log('Vault A LP changed');
      console.log(accountInfo);
      await pool.updateState();

      const { swapOutAmount, minSwapOutAmount } = pool.getSwapQuote(
        wsolTokenMint.publicKey,
        inAmountLamport,
        DEFAULT_SLIPPAGE,
      );
      console.log(`SwapOutAmount = `, swapOutAmount.toString());
    });

    const bVaultLpChangeSubId = provider.connection.onAccountChange(bVaultLp, async (accountInfo, context) => {
      console.log('Vault B LP changed');
      console.log(accountInfo);
      await pool.updateState();

      const { swapOutAmount, minSwapOutAmount } = pool.getSwapQuote(
        wsolTokenMint.publicKey,
        inAmountLamport,
        DEFAULT_SLIPPAGE,
      );
      console.log(`SwapOutAmount = `, swapOutAmount.toString());
    });

    const { swapOutAmount, minSwapOutAmount } = pool.getSwapQuote(
      wsolTokenMint.publicKey,
      inAmountLamport,
      DEFAULT_SLIPPAGE,
    );

    const swapTx = await pool.swap(mockWallet.publicKey, wsolTokenMint.publicKey, inAmountLamport, minSwapOutAmount);

    try {
      const swapResult = await sendAndConfirmTransaction(provider.connection, swapTx, [mockWallet.payer]);
      console.log('Swap Result of SOL → USDC', swapResult);
    } catch (error: any) {
      console.trace(error);
      throw new Error(error.message);
    }

    setTimeout(() => {}, 3000);

    await provider.connection.removeAccountChangeListener(aVaultLpChangeSubId);
    await provider.connection.removeAccountChangeListener(bVaultLpChangeSubId);
  });
});
