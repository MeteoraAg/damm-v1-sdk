import { AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { airDropSol, getOrCreateATA, mockWallet, wrapSol } from './utils';
import { createMint, mintTo, NATIVE_MINT } from '@solana/spl-token';
import AmmImpl from '..';
import { BN } from 'bn.js';
import { ActivationType, FeeCurvePoints } from '../types';
import {
  createProgram,
  deriveCustomizablePermissionlessConstantProductPoolAddress,
  FeeCurveInfo,
  FeeCurveType,
} from '../utils';

const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
const provider = new AnchorProvider(connection, mockWallet, {
  commitment: connection.commitment,
});

describe('Initialize customizable permissionless constant product pool', () => {
  let MEME: PublicKey;

  let memeDecimal = 9;

  let mockWalletMemeATA: PublicKey;
  let mockWalletSolATA: PublicKey;

  const memeMultiplier = 10 ** memeDecimal;

  beforeAll(async () => {
    await airDropSol(connection, mockWallet.publicKey, 10);

    MEME = await createMint(provider.connection, mockWallet.payer, mockWallet.publicKey, null, memeDecimal);

    mockWalletMemeATA = await getOrCreateATA(connection, MEME, mockWallet.publicKey, mockWallet.payer);
    mockWalletSolATA = await getOrCreateATA(connection, NATIVE_MINT, mockWallet.publicKey, mockWallet.payer);

    await mintTo(
      provider.connection,
      mockWallet.payer,
      MEME,
      mockWalletMemeATA,
      mockWallet.payer.publicKey,
      1000000 * memeMultiplier,
      [],
      {
        commitment: 'confirmed',
      },
    );

    await wrapSol(connection, new BN(1_000_000), mockWallet.payer);
  });

  test('Initialize customizable CP pool', async () => {
    const tokenAAmount = new BN(1_000_000);
    const tokenBAmount = new BN(1_000_000);

    const feePoints: FeeCurvePoints = [
      {
        feeBps: 1300,
        activatedDuration: 5,
      },
      {
        feeBps: 1100,
        activatedDuration: 10,
      },
      {
        feeBps: 900,
        activatedDuration: 15,
      },
      {
        feeBps: 700,
        activatedDuration: 20,
      },
      {
        feeBps: 500,
        activatedDuration: 25,
      },
      {
        feeBps: 400,
        activatedDuration: 30,
      },
    ];

    const initializeTx = await AmmImpl.createCustomizablePermissionlessConstantProductPool(
      connection,
      mockWallet.publicKey,
      MEME,
      NATIVE_MINT,
      tokenAAmount,
      tokenBAmount,
      {
        // Denominator is default to 100_000
        tradeFeeNumerator: 15_000,
        activationType: ActivationType.Timestamp,
        activationPoint: null,
        hasAlphaVault: false,
        feeCurve: FeeCurveInfo.flat(feePoints),
      },
    );

    initializeTx.sign(mockWallet.payer);
    // 1124 bytes
    const txHash = await connection.sendRawTransaction(initializeTx.serialize());
    await connection.confirmTransaction(txHash, 'finalized');

    const poolKey = deriveCustomizablePermissionlessConstantProductPoolAddress(
      MEME,
      NATIVE_MINT,
      createProgram(connection).ammProgram.programId,
    );

    const pool = await AmmImpl.create(connection, poolKey);
    const feeBps = pool.poolState.fees.tradeFeeNumerator.muln(10000).div(pool.poolState.fees.tradeFeeDenominator);
    expect(feeBps.eq(new BN(1500))).toBeTruthy();
    expect(JSON.stringify(pool.poolState.feeCurve.feeCurveType)).toBe(JSON.stringify(FeeCurveType.flat()));

    for (let i = 0; i < feePoints.length; i++) {
      // 0 is initialize fee rate
      const p1 = pool.poolState.feeCurve.points[i + 1];
      const p2 = feePoints[i];

      expect(p1.feeBps).toBe(p2.feeBps);
      expect(p1.activatedPoint.toNumber()).toBe(
        pool.poolState.bootstrapping.activationPoint.toNumber() + p2.activatedDuration,
      );
    }

    const beforeFee = pool.feeBps;
    await new Promise((res) => setTimeout(res, 7000));
    await pool.updateState();
    const afterFee = pool.feeBps;

    expect(afterFee.toNumber()).toBeLessThan(beforeFee.toNumber());
  });
});
