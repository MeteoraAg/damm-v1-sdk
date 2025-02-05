import VaultImpl from '@meteora-ag/vault-sdk';
import { AccountLayout, MintLayout, NATIVE_MINT, RawAccount, RawMint } from '@solana/spl-token';
import { clusterApiUrl, Connection, PublicKey, SYSVAR_CLOCK_PUBKEY } from '@solana/web3.js';
import { calculateSwapQuoteForGoingToCreateMemecoinPool } from '../utils';
import { BN } from 'bn.js';
import { Clock, ClockLayout } from '../types';
import AmmImpl from '..';

describe('Bundle pool quote', () => {
  const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
  const quoteMint = NATIVE_MINT;

  it('Able to quote', async () => {
    const quoteDynamicVault = await VaultImpl.create(connection, quoteMint);
    const inAmount = new BN('50000'); // 0.00005 SOL
    const tokenAAmount = new BN('1000000000000000'); // 1000000000 memecoin
    const tokenBAmount = new BN('50000'); // 0.00005 SOL

    // Memecoin config
    const config = await AmmImpl.getPoolConfig(
      connection,
      new PublicKey('FiENCCbPi3rFh5pW2AJ59HC53yM32eLaCjMKxRqanKFJ'),
    );

    const [vaultReserveAccount, vaultLpMintAccount, clockAccount] = await connection.getMultipleAccountsInfo([
      quoteDynamicVault.vaultState.tokenVault,
      quoteDynamicVault.vaultState.lpMint,
      SYSVAR_CLOCK_PUBKEY,
    ]);
    const vaultReserve: RawAccount = AccountLayout.decode(vaultReserveAccount!.data);
    const vaultMint: RawMint = MintLayout.decode(vaultLpMintAccount!.data);
    const clock: Clock = ClockLayout.decode(clockAccount!.data);

    const { amountOut } = calculateSwapQuoteForGoingToCreateMemecoinPool(
      inAmount,
      tokenAAmount,
      tokenBAmount,
      false,
      {
        tradeFeeNumerator: config.poolFees.tradeFeeNumerator,
        tradeFeeDenominator: config.poolFees.tradeFeeDenominator,
        protocolTradeFeeNumerator: config.poolFees.protocolTradeFeeNumerator,
        protocolTradeFeeDenominator: config.poolFees.protocolTradeFeeDenominator,
      },
      {
        // Memecoin vault doesn't exists until we create the pool for it
        vaultA: undefined,
        vaultB: {
          vault: quoteDynamicVault.vaultState,
          reserve: new BN(vaultReserve.amount.toString()),
          lpSupply: new BN(vaultMint.supply.toString()),
        },
        currentTime: clock.unixTimestamp.toNumber(),
      },
    );

    console.log('Out amount', amountOut.toString());
  });
});
