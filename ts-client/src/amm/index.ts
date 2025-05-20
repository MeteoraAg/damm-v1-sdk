import { BN } from '@coral-xyz/anchor';
import {
  PublicKey,
  Connection,
  Cluster,
  Transaction,
  TransactionInstruction,
  AccountInfo,
  ParsedAccountData,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  ComputeBudgetProgram,
  Keypair,
} from '@solana/web3.js';
import {
  AccountLayout,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMintToInstruction,
  createSetAuthorityInstruction,
  Mint,
  MintLayout,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  getMint,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import VaultImpl, { calculateWithdrawableAmount, getVaultPdas } from '@meteora-ag/vault-sdk';
import StakeForFee, {
  deriveFeeVault,
  InitializeVaultParams,
  STAKE_FOR_FEE_PROGRAM_ID,
  StakeForFeeProgram,
} from '@meteora-ag/m3m3';
import invariant from 'invariant';
import {
  AccountType,
  AccountsInfo,
  ActivationType,
  AmmImplementation,
  AmmProgram,
  Clock,
  ClockLayout,
  CustomizableParams,
  DepositQuote,
  LockEscrow,
  LockEscrowAccount,
  PoolInformation,
  PoolState,
  VaultProgram,
  WithdrawQuote,
} from './types';
import { ERROR, SEEDS, UNLOCK_AMOUNT_BUFFER, FEE_OWNER, METAPLEX_PROGRAM, U64_MAX } from './constants';
import { StableSwap, SwapCurve, TradeDirection } from './curve';
import { ConstantProductSwap } from './curve/constant-product';
import {
  calculateMaxSwapOutAmount,
  calculateSwapQuote,
  computeActualDepositAmount,
  calculatePoolInfo,
  getMaxAmountWithSlippage,
  getMinAmountWithSlippage,
  getOrCreateATAInstruction,
  unwrapSOLInstruction,
  wrapSOLInstruction,
  getDepegAccounts,
  createProgram,
  getAssociatedTokenAccount,
  deserializeAccount,
  chunkedGetMultipleAccountInfos,
  generateCurveType,
  derivePoolAddress,
  chunkedFetchMultiplePoolAccount,
  deriveMintMetadata,
  deriveLockEscrowPda,
  calculateUnclaimedLockEscrowFee,
  derivePoolAddressWithConfig as deriveConstantProductPoolAddressWithConfig,
  deriveConfigPda,
  deriveProtocolTokenFee,
  createMint,
  calculateLockAmounts,
  createTransactions,
  deriveCustomizablePermissionlessConstantProductPoolAddress,
} from './utils';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import Decimal from 'decimal.js';
import sqrt from 'bn-sqrt';
import { DataV2 } from '@metaplex-foundation/mpl-token-metadata';

type Opt = {
  cluster: Cluster;
};

const getAllPoolState = async (
  poolMints: Array<PublicKey>,
  program: AmmProgram,
): Promise<Array<PoolState & { lpSupply: BN }>> => {
  const poolStates = (await chunkedFetchMultiplePoolAccount(program, poolMints)) as Array<PoolState>;
  invariant(poolStates.length === poolMints.length, 'Some of the pool state not found');

  const poolLpMints = poolStates.map((poolState) => poolState.lpMint);
  const lpMintAccounts = await chunkedGetMultipleAccountInfos(program.provider.connection, poolLpMints);

  return poolStates.map((poolState, idx) => {
    const lpMintAccount = lpMintAccounts[idx];
    invariant(lpMintAccount, ERROR.INVALID_ACCOUNT);
    const lpSupply = new BN(MintLayout.decode(lpMintAccount.data).supply.toString());

    return { ...poolState, lpSupply };
  });
};

const getPoolState = async (poolMint: PublicKey, program: AmmProgram) => {
  const poolState = (await program.account.pool.fetchNullable(poolMint)) as any as PoolState;
  invariant(poolState, `Pool ${poolMint.toBase58()} not found`);

  const account = await program.provider.connection.getTokenSupply(poolState.lpMint);
  invariant(account.value.amount, ERROR.INVALID_ACCOUNT);

  return { ...poolState, lpSupply: new BN(account.value.amount) };
};

const getFeeVaultState = async (publicKey: PublicKey, program: StakeForFeeProgram) => {
  const feeVaultState = await program.account.feeVault.fetchNullable(publicKey);

  return feeVaultState;
};

type DecoderType = { [x: string]: (accountData: Buffer) => BN };
const decodeAccountTypeMapper = (type: AccountType): ((accountData: Buffer) => BN) => {
  const decoder: DecoderType = {
    [AccountType.VAULT_A_RESERVE]: (accountData) => new BN(AccountLayout.decode(accountData).amount.toString()),
    [AccountType.VAULT_B_RESERVE]: (accountData) => new BN(AccountLayout.decode(accountData).amount.toString()),
    [AccountType.VAULT_A_LP]: (accountData) => new BN(MintLayout.decode(accountData).supply.toString()),
    [AccountType.VAULT_B_LP]: (accountData) => new BN(MintLayout.decode(accountData).supply.toString()),
    [AccountType.POOL_VAULT_A_LP]: (accountData) => new BN(AccountLayout.decode(accountData).amount.toString()),
    [AccountType.POOL_VAULT_B_LP]: (accountData) => new BN(AccountLayout.decode(accountData).amount.toString()),
    [AccountType.POOL_LP_MINT]: (accountData) => new BN(MintLayout.decode(accountData).supply.toString()),
    [AccountType.SYSVAR_CLOCK]: (accountData) => new BN(accountData.readBigInt64LE(32).toString()),
  };

  return decoder[type as unknown as string];
};

type AccountTypeInfo = { type: AccountType; account: AccountInfo<Buffer> };
type AccountsType = { type: AccountType; pubkey: PublicKey };
const getAccountsBuffer = async (
  connection: Connection,
  accountsToFetch: Array<AccountsType>,
): Promise<Map<string, AccountTypeInfo>> => {
  const accounts = await chunkedGetMultipleAccountInfos(
    connection,
    accountsToFetch.map((account) => account.pubkey),
  );

  return accountsToFetch.reduce((accMap, account, index) => {
    const accountInfo = accounts[index];
    accMap.set(account.pubkey.toBase58(), {
      type: account.type,
      account: accountInfo!,
    });

    return accMap;
  }, new Map<string, AccountTypeInfo>());
};

const deserializeAccountsBuffer = (accountInfoMap: Map<string, AccountTypeInfo>): Map<string, BN> => {
  return Array.from(accountInfoMap).reduce((accValue, [publicKey, { type, account }]) => {
    const decodedAccountInfo = decodeAccountTypeMapper(type);

    accValue.set(publicKey, decodedAccountInfo(account!.data));

    return accValue;
  }, new Map());
};

export default class AmmImpl implements AmmImplementation {
  private opt: Opt = {
    cluster: 'mainnet-beta',
  };

  private constructor(
    public address: PublicKey,
    private program: AmmProgram,
    private vaultProgram: VaultProgram,
    public tokenAMint: Mint,
    public tokenBMint: Mint,
    public poolState: PoolState & { lpSupply: BN },
    public poolInfo: PoolInformation,
    public vaultA: VaultImpl,
    public vaultB: VaultImpl,
    private accountsInfo: AccountsInfo,
    private swapCurve: SwapCurve,
    private depegAccounts: Map<String, AccountInfo<Buffer>>,
    opt: Opt,
  ) {
    this.opt = {
      ...this.opt,
      ...opt,
    };
  }

  public static async createConfig(
    connection: Connection,
    payer: PublicKey,
    tradeFeeBps: BN,
    protocolFeeBps: BN,
    vaultConfigKey: PublicKey,
    activationDuration: BN,
    poolCreatorAuthority: PublicKey,
    activationType: ActivationType,
    partnerFeeNumerator: BN,
    opt?: {
      cluster?: Cluster;
      programId?: string;
    },
  ) {
    const { ammProgram } = createProgram(connection, opt?.programId);
    const configs = await this.getFeeConfigurations(connection, opt);

    let index = 0;
    while (true) {
      const configPda = deriveConfigPda(new BN(index), ammProgram.programId);
      if (!configs.find((c) => c.publicKey.equals(configPda))) {
        const createConfigTx = await ammProgram.methods
          .createConfig({
            // Default fee denominator is 100_000
            tradeFeeNumerator: tradeFeeBps.mul(new BN(10)),
            protocolTradeFeeNumerator: protocolFeeBps.mul(new BN(10)),
            vaultConfigKey,
            activationDuration,
            poolCreatorAuthority,
            index: new BN(index),
            activationType,
            partnerFeeNumerator,
          })
          .accounts({
            config: configPda,
            systemProgram: SystemProgram.programId,
            admin: payer,
          })
          .transaction();

        return new Transaction({
          feePayer: payer,
          ...(await ammProgram.provider.connection.getLatestBlockhash(ammProgram.provider.connection.commitment)),
        }).add(createConfigTx);
      } else {
        index++;
      }
    }
  }

  public static async searchPoolsByToken(connection: Connection, tokenMint: PublicKey) {
    const { ammProgram } = createProgram(connection);
    const [poolsForTokenAMint, poolsForTokenBMint] = await Promise.all([
      ammProgram.account.pool.all([
        {
          memcmp: {
            offset: 8 + 32,
            bytes: tokenMint.toBase58(),
          },
        },
      ]),
      ammProgram.account.pool.all([
        {
          memcmp: {
            offset: 8 + 32 + 32,
            bytes: tokenMint.toBase58(),
          },
        },
      ]),
    ]);

    return [...poolsForTokenAMint, ...poolsForTokenBMint];
  }

  public async partnerClaimFees(partnerAddress: PublicKey, maxAmountA: BN, maxAmountB: BN) {
    let preInstructions: Array<TransactionInstruction> = [];
    const [[partnerTokenA, createPartnerTokenAIx], [partnerTokenB, createPartnerTokenBIx]] =
      await this.createATAPreInstructions(partnerAddress, [this.poolState.tokenAMint, this.poolState.tokenBMint]);

    createPartnerTokenAIx && preInstructions.push(createPartnerTokenAIx);
    createPartnerTokenBIx && preInstructions.push(createPartnerTokenBIx);

    const claimTx = await this.program.methods
      .partnerClaimFee(maxAmountA, maxAmountB)
      .accounts({
        pool: this.address,
        aVaultLp: this.poolState.aVaultLp,
        protocolTokenAFee: this.poolState.protocolTokenAFee,
        protocolTokenBFee: this.poolState.protocolTokenBFee,
        partnerTokenA,
        partnerTokenB,
        tokenProgram: TOKEN_PROGRAM_ID,
        partnerAuthority: partnerAddress,
      })
      .preInstructions(preInstructions)
      .transaction();

    return new Transaction({
      feePayer: partnerAddress,
      ...(await this.program.provider.connection.getLatestBlockhash(this.program.provider.connection.commitment)),
    }).add(claimTx);
  }

  public static async createCustomizablePermissionlessConstantProductPool(
    connection: Connection,
    payer: PublicKey,
    tokenAMint: PublicKey,
    tokenBMint: PublicKey,
    tokenAAmount: BN,
    tokenBAmount: BN,
    customizableParams: CustomizableParams,
    opt?: {
      cluster?: Cluster;
      programId?: string;
    },
  ) {
    const { vaultProgram, ammProgram } = createProgram(connection, opt?.programId);

    const [
      { vaultPda: aVault, tokenVaultPda: aTokenVault, lpMintPda: aLpMintPda },
      { vaultPda: bVault, tokenVaultPda: bTokenVault, lpMintPda: bLpMintPda },
    ] = [getVaultPdas(tokenAMint, vaultProgram.programId), getVaultPdas(tokenBMint, vaultProgram.programId)];

    const [aVaultAccount, bVaultAccount] = await Promise.all([
      vaultProgram.account.vault.fetchNullable(aVault),
      vaultProgram.account.vault.fetchNullable(bVault),
    ]);

    let aVaultLpMint = aLpMintPda;
    let bVaultLpMint = bLpMintPda;
    let preInstructions: Array<TransactionInstruction> = [];

    if (!aVaultAccount) {
      const createVaultAIx = await VaultImpl.createPermissionlessVaultInstruction(connection, payer, tokenAMint);
      createVaultAIx && preInstructions.push(createVaultAIx);
    } else {
      aVaultLpMint = aVaultAccount.lpMint; // Old vault doesn't have lp mint pda
    }
    if (!bVaultAccount) {
      const createVaultBIx = await VaultImpl.createPermissionlessVaultInstruction(connection, payer, tokenBMint);
      createVaultBIx && preInstructions.push(createVaultBIx);
    } else {
      bVaultLpMint = bVaultAccount.lpMint; // Old vault doesn't have lp mint pda
    }

    const poolPubkey = deriveCustomizablePermissionlessConstantProductPoolAddress(
      tokenAMint,
      tokenBMint,
      ammProgram.programId,
    );

    const [lpMint] = PublicKey.findProgramAddressSync(
      [Buffer.from(SEEDS.LP_MINT), poolPubkey.toBuffer()],
      ammProgram.programId,
    );

    const [[aVaultLp], [bVaultLp]] = [
      PublicKey.findProgramAddressSync([aVault.toBuffer(), poolPubkey.toBuffer()], ammProgram.programId),
      PublicKey.findProgramAddressSync([bVault.toBuffer(), poolPubkey.toBuffer()], ammProgram.programId),
    ];

    const [[payerTokenA, createPayerTokenAIx], [payerTokenB, createPayerTokenBIx]] = await Promise.all([
      getOrCreateATAInstruction(tokenAMint, payer, connection),
      getOrCreateATAInstruction(tokenBMint, payer, connection),
    ]);

    createPayerTokenAIx && preInstructions.push(createPayerTokenAIx);
    createPayerTokenBIx && preInstructions.push(createPayerTokenBIx);

    const [[protocolTokenAFee], [protocolTokenBFee]] = [
      PublicKey.findProgramAddressSync(
        [Buffer.from(SEEDS.FEE), tokenAMint.toBuffer(), poolPubkey.toBuffer()],
        ammProgram.programId,
      ),
      PublicKey.findProgramAddressSync(
        [Buffer.from(SEEDS.FEE), tokenBMint.toBuffer(), poolPubkey.toBuffer()],
        ammProgram.programId,
      ),
    ];

    const payerPoolLp = await getAssociatedTokenAccount(lpMint, payer);

    if (tokenAMint.equals(NATIVE_MINT)) {
      preInstructions = preInstructions.concat(wrapSOLInstruction(payer, payerTokenA, BigInt(tokenAAmount.toString())));
    }

    if (tokenBMint.equals(NATIVE_MINT)) {
      preInstructions = preInstructions.concat(wrapSOLInstruction(payer, payerTokenB, BigInt(tokenBAmount.toString())));
    }

    const [mintMetadata, _mintMetadataBump] = deriveMintMetadata(lpMint);

    const createPermissionlessPoolTx = await ammProgram.methods
      .initializeCustomizablePermissionlessConstantProductPool(tokenAAmount, tokenBAmount, customizableParams)
      .accounts({
        pool: poolPubkey,
        tokenAMint,
        tokenBMint,
        aVault,
        bVault,
        aVaultLpMint,
        bVaultLpMint,
        aVaultLp,
        bVaultLp,
        lpMint,
        payerTokenA,
        payerTokenB,
        protocolTokenAFee,
        protocolTokenBFee,
        payerPoolLp,
        aTokenVault,
        bTokenVault,
        mintMetadata,
        metadataProgram: METAPLEX_PROGRAM,
        payer,
        rent: SYSVAR_RENT_PUBKEY,
        vaultProgram: vaultProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .preInstructions(preInstructions)
      .transaction();

    const latestBlockHash = await ammProgram.provider.connection.getLatestBlockhash(
      ammProgram.provider.connection.commitment,
    );

    return new Transaction({
      feePayer: payer,
      ...latestBlockHash,
    }).add(createPermissionlessPoolTx);
  }

  public static async createPermissionlessConstantProductPoolWithConfig2(
    connection: Connection,
    payer: PublicKey,
    tokenAMint: PublicKey,
    tokenBMint: PublicKey,
    tokenAAmount: BN,
    tokenBAmount: BN,
    config: PublicKey,
    opt?: {
      cluster?: Cluster;
      programId?: string;
      lockLiquidity?: boolean;
      swapLiquidity?: {
        // always swap B to A
        inAmount: BN;
        minAmountOut: BN;
      };
      stakeLiquidity?: {
        ratio?: Decimal;
        param: Omit<InitializeVaultParams, 'padding'>;
      };
      activationPoint?: BN;
    },
  ) {
    const { vaultProgram, ammProgram } = createProgram(connection, opt?.programId);

    const [
      { vaultPda: aVault, tokenVaultPda: aTokenVault, lpMintPda: aLpMintPda },
      { vaultPda: bVault, tokenVaultPda: bTokenVault, lpMintPda: bLpMintPda },
    ] = [getVaultPdas(tokenAMint, vaultProgram.programId), getVaultPdas(tokenBMint, vaultProgram.programId)];

    const [aVaultAccount, bVaultAccount] = await Promise.all([
      vaultProgram.account.vault.fetchNullable(aVault),
      vaultProgram.account.vault.fetchNullable(bVault),
    ]);

    let aVaultLpMint = aLpMintPda;
    let bVaultLpMint = bLpMintPda;
    let preInstructions: Array<TransactionInstruction> = [];

    if (!aVaultAccount) {
      const createVaultAIx = await VaultImpl.createPermissionlessVaultInstruction(connection, payer, tokenAMint);
      createVaultAIx && preInstructions.push(createVaultAIx);
    } else {
      aVaultLpMint = aVaultAccount.lpMint; // Old vault doesn't have lp mint pda
    }
    if (!bVaultAccount) {
      const createVaultBIx = await VaultImpl.createPermissionlessVaultInstruction(connection, payer, tokenBMint);
      createVaultBIx && preInstructions.push(createVaultBIx);
    } else {
      bVaultLpMint = bVaultAccount.lpMint; // Old vault doesn't have lp mint pda
    }

    const poolPubkey = deriveConstantProductPoolAddressWithConfig(tokenAMint, tokenBMint, config, ammProgram.programId);

    const [lpMint] = PublicKey.findProgramAddressSync(
      [Buffer.from(SEEDS.LP_MINT), poolPubkey.toBuffer()],
      ammProgram.programId,
    );

    const [[aVaultLp], [bVaultLp]] = [
      PublicKey.findProgramAddressSync([aVault.toBuffer(), poolPubkey.toBuffer()], ammProgram.programId),
      PublicKey.findProgramAddressSync([bVault.toBuffer(), poolPubkey.toBuffer()], ammProgram.programId),
    ];

    const [[payerTokenA, createPayerTokenAIx], [payerTokenB, createPayerTokenBIx]] = await Promise.all([
      getOrCreateATAInstruction(tokenAMint, payer, connection),
      getOrCreateATAInstruction(tokenBMint, payer, connection),
    ]);

    createPayerTokenAIx && preInstructions.push(createPayerTokenAIx);
    createPayerTokenBIx && preInstructions.push(createPayerTokenBIx);

    const [[protocolTokenAFee], [protocolTokenBFee]] = [
      PublicKey.findProgramAddressSync(
        [Buffer.from(SEEDS.FEE), tokenAMint.toBuffer(), poolPubkey.toBuffer()],
        ammProgram.programId,
      ),
      PublicKey.findProgramAddressSync(
        [Buffer.from(SEEDS.FEE), tokenBMint.toBuffer(), poolPubkey.toBuffer()],
        ammProgram.programId,
      ),
    ];

    const payerPoolLp = await getAssociatedTokenAccount(lpMint, payer);

    if (tokenAMint.equals(NATIVE_MINT)) {
      preInstructions = preInstructions.concat(wrapSOLInstruction(payer, payerTokenA, BigInt(tokenAAmount.toString())));
    }

    if (tokenBMint.equals(NATIVE_MINT)) {
      preInstructions = preInstructions.concat(wrapSOLInstruction(payer, payerTokenB, BigInt(tokenBAmount.toString())));
    }

    const [mintMetadata, _mintMetadataBump] = deriveMintMetadata(lpMint);
    const activationPoint = opt?.activationPoint || null;

    const lpAmount = sqrt(tokenAAmount.mul(tokenBAmount));
    const { userLockAmount, feeWrapperLockAmount } = calculateLockAmounts(lpAmount, opt?.stakeLiquidity?.ratio);

    const createPoolPostInstructions: TransactionInstruction[] = [];
    if (opt?.lockLiquidity && userLockAmount.gt(new BN(0))) {
      const [lockEscrowPK] = deriveLockEscrowPda(poolPubkey, payer, ammProgram.programId);
      const createLockEscrowIx = await ammProgram.methods
        .createLockEscrow()
        .accounts({
          pool: poolPubkey,
          lockEscrow: lockEscrowPK,
          owner: payer,
          lpMint,
          payer,
          systemProgram: SystemProgram.programId,
        })
        .instruction();
      createPoolPostInstructions.push(createLockEscrowIx);
      const [escrowAta, createEscrowAtaIx] = await getOrCreateATAInstruction(lpMint, lockEscrowPK, connection, payer);

      createEscrowAtaIx && createPoolPostInstructions.push(createEscrowAtaIx);
      const lockIx = await ammProgram.methods
        .lock(userLockAmount)
        .accounts({
          pool: poolPubkey,
          lockEscrow: lockEscrowPK,
          owner: payer,
          lpMint,
          sourceTokens: payerPoolLp,
          escrowVault: escrowAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          aVault,
          bVault,
          aVaultLp,
          bVaultLp,
          aVaultLpMint,
          bVaultLpMint,
        })
        .instruction();
      createPoolPostInstructions.push(lockIx);
    }

    const createPermissionlessPoolTx = await ammProgram.methods
      .initializePermissionlessConstantProductPoolWithConfig2(tokenAAmount, tokenBAmount, activationPoint)
      .accounts({
        pool: poolPubkey,
        tokenAMint,
        tokenBMint,
        aVault,
        bVault,
        aVaultLpMint,
        bVaultLpMint,
        aVaultLp,
        bVaultLp,
        lpMint,
        payerTokenA,
        payerTokenB,
        protocolTokenAFee,
        protocolTokenBFee,
        payerPoolLp,
        aTokenVault,
        bTokenVault,
        mintMetadata,
        metadataProgram: METAPLEX_PROGRAM,
        payer,
        config,
        rent: SYSVAR_RENT_PUBKEY,
        vaultProgram: vaultProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .postInstructions(createPoolPostInstructions)
      .transaction();

    const ixs: Array<Transaction | TransactionInstruction | (Transaction | TransactionInstruction)[]> = [];

    if (preInstructions.length) {
      // https://explorer.solana.com/tx/3G95TWMmTLbZ7aAgyGmZd8JFk19ye8whVB5cXhYCCsUWSUsnuVMqPMXbPiY5WaF4zE2Sz7CG5e4jTj8NQbCnUG14?cluster=devnet
      // Create 2 dynamic vault consume around 190k CU. Each create ATA + Wrap SOL around 23k
      const setComputeUnitLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
        units: 300_000,
      });
      ixs.push([setComputeUnitLimitIx, ...preInstructions]);
    }

    // https://explorer.solana.com/tx/4X37hBoUNwpmHKNGpQB3M72xDA7yhFKhbYrkBQUK4skBGD7P9LdWgb2WpvFGHcxYi13e9bdwhetsqmULeW7nUDbW?cluster=devnet
    // https://explorer.solana.com/tx/3xMGCQ9GAqSMZH1uhXXc1quZit61DXr1KsbVxdBN1zCkQy1GTXBGuWgxzWfMEdecdRi859m3mYQKuLyemvR18VHS?cluster=devnet
    // Create dynamic pool consume around 287k, create lock escrow + lock liquidity around 84k
    const setComputeUnitLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 450_000,
    });
    ixs.push([setComputeUnitLimitIx, createPermissionlessPoolTx]);

    if (feeWrapperLockAmount.gt(new BN(0))) {
      const preInstructions: TransactionInstruction[] = [];
      const createFeeVaultIxs = await StakeForFee.createFeeVaultInstructions(
        connection,
        poolPubkey,
        payer,
        tokenAMint,
        tokenBMint,
        {
          unstakeLockDuration: opt?.stakeLiquidity?.param.unstakeLockDuration || new BN(0),
          secondsToFullUnlock: opt?.stakeLiquidity?.param.secondsToFullUnlock || new BN(0),
          topListLength: opt?.stakeLiquidity?.param.topListLength || 0,
          startFeeDistributeTimestamp: opt?.stakeLiquidity?.param.startFeeDistributeTimestamp || new BN(0),
          padding: new Array<number>(64).fill(0),
        },
      );

      preInstructions.push(...createFeeVaultIxs);

      const vaultKey = deriveFeeVault(poolPubkey, STAKE_FOR_FEE_PROGRAM_ID);

      const [lockEscrowFeeVaultPK] = deriveLockEscrowPda(poolPubkey, vaultKey, ammProgram.programId);

      const [escrowFeeVaultAta, createEscrowFeeVaultAtaIx] = await getOrCreateATAInstruction(
        lpMint,
        lockEscrowFeeVaultPK,
        connection,
        payer,
      );

      createEscrowFeeVaultAtaIx && preInstructions.push(createEscrowFeeVaultAtaIx);

      const lockTx = await ammProgram.methods
        .lock(feeWrapperLockAmount)
        .accounts({
          pool: poolPubkey,
          lockEscrow: lockEscrowFeeVaultPK,
          owner: payer,
          lpMint,
          sourceTokens: payerPoolLp,
          escrowVault: escrowFeeVaultAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          aVault,
          bVault,
          aVaultLp,
          bVaultLp,
          aVaultLpMint,
          bVaultLpMint,
        })
        .preInstructions(preInstructions)
        .transaction();

      ixs.push(lockTx);
    }

    if (opt?.swapLiquidity) {
      const protocolTokenFee = deriveProtocolTokenFee(poolPubkey, tokenBMint, ammProgram.programId);
      const swapTx = await ammProgram.methods
        .swap(opt.swapLiquidity.inAmount, opt.swapLiquidity.minAmountOut)
        .accounts({
          aTokenVault,
          bTokenVault,
          aVault,
          bVault,
          aVaultLp,
          bVaultLp,
          aVaultLpMint,
          bVaultLpMint,
          userSourceToken: payerTokenB,
          userDestinationToken: payerTokenA,
          user: payer,
          protocolTokenFee,
          pool: poolPubkey,
          tokenProgram: TOKEN_PROGRAM_ID,
          vaultProgram: vaultProgram.programId,
        })
        .transaction();

      ixs.push(swapTx);
    }

    const resultTx: Transaction[] = await createTransactions(connection, ixs, payer);
    return resultTx;
  }

  public static async createPermissionlessConstantProductPoolWithConfig(
    connection: Connection,
    payer: PublicKey,
    tokenAMint: PublicKey,
    tokenBMint: PublicKey,
    tokenAAmount: BN,
    tokenBAmount: BN,
    config: PublicKey,
    opt?: {
      cluster?: Cluster;
      programId?: string;
      lockLiquidity?: boolean;
      swapLiquidity?: {
        inAmount: BN;
        minAmountOut: BN;
      };
      skipAAta?: boolean;
      skipBAta?: boolean;
    },
  ) {
    const { vaultProgram, ammProgram } = createProgram(connection, opt?.programId);

    const [
      { vaultPda: aVault, tokenVaultPda: aTokenVault, lpMintPda: aLpMintPda },
      { vaultPda: bVault, tokenVaultPda: bTokenVault, lpMintPda: bLpMintPda },
    ] = [getVaultPdas(tokenAMint, vaultProgram.programId), getVaultPdas(tokenBMint, vaultProgram.programId)];

    const [aVaultAccount, bVaultAccount] = await Promise.all([
      vaultProgram.account.vault.fetchNullable(aVault),
      vaultProgram.account.vault.fetchNullable(bVault),
    ]);

    let aVaultLpMint = aLpMintPda;
    let bVaultLpMint = bLpMintPda;
    let preInstructions: Array<TransactionInstruction> = [];

    if (!aVaultAccount) {
      const createVaultAIx = await VaultImpl.createPermissionlessVaultInstruction(connection, payer, tokenAMint);
      createVaultAIx && preInstructions.push(createVaultAIx);
    } else {
      aVaultLpMint = aVaultAccount.lpMint; // Old vault doesn't have lp mint pda
    }
    if (!bVaultAccount) {
      const createVaultBIx = await VaultImpl.createPermissionlessVaultInstruction(connection, payer, tokenBMint);
      createVaultBIx && preInstructions.push(createVaultBIx);
    } else {
      bVaultLpMint = bVaultAccount.lpMint; // Old vault doesn't have lp mint pda
    }

    const poolPubkey = deriveConstantProductPoolAddressWithConfig(tokenAMint, tokenBMint, config, ammProgram.programId);

    const [lpMint] = PublicKey.findProgramAddressSync(
      [Buffer.from(SEEDS.LP_MINT), poolPubkey.toBuffer()],
      ammProgram.programId,
    );

    const [[aVaultLp], [bVaultLp]] = [
      PublicKey.findProgramAddressSync([aVault.toBuffer(), poolPubkey.toBuffer()], ammProgram.programId),
      PublicKey.findProgramAddressSync([bVault.toBuffer(), poolPubkey.toBuffer()], ammProgram.programId),
    ];

    const [[payerTokenA, createPayerTokenAIx], [payerTokenB, createPayerTokenBIx]] = await Promise.all([
      getOrCreateATAInstruction(tokenAMint, payer, connection),
      getOrCreateATAInstruction(tokenBMint, payer, connection),
    ]);
    createPayerTokenAIx && !opt?.skipAAta && preInstructions.push(createPayerTokenAIx);
    createPayerTokenBIx && !opt?.skipBAta && preInstructions.push(createPayerTokenBIx);

    const [[protocolTokenAFee], [protocolTokenBFee]] = [
      PublicKey.findProgramAddressSync(
        [Buffer.from(SEEDS.FEE), tokenAMint.toBuffer(), poolPubkey.toBuffer()],
        ammProgram.programId,
      ),
      PublicKey.findProgramAddressSync(
        [Buffer.from(SEEDS.FEE), tokenBMint.toBuffer(), poolPubkey.toBuffer()],
        ammProgram.programId,
      ),
    ];

    const payerPoolLp = getAssociatedTokenAccount(lpMint, payer);

    if (tokenAMint.equals(NATIVE_MINT)) {
      preInstructions = preInstructions.concat(wrapSOLInstruction(payer, payerTokenA, BigInt(tokenAAmount.toString())));
    }

    if (tokenBMint.equals(NATIVE_MINT)) {
      preInstructions = preInstructions.concat(
        wrapSOLInstruction(
          payer,
          payerTokenB,
          BigInt(tokenBAmount.add(opt?.swapLiquidity?.inAmount ?? new BN(0)).toString()),
        ),
      );
    }

    const [mintMetadata, _mintMetadataBump] = deriveMintMetadata(lpMint);

    const createPoolPostInstructions: TransactionInstruction[] = [];
    if (opt?.lockLiquidity) {
      const [lockEscrowPK] = deriveLockEscrowPda(poolPubkey, payer, ammProgram.programId);
      const createLockEscrowIx = await ammProgram.methods
        .createLockEscrow()
        .accounts({
          pool: poolPubkey,
          lockEscrow: lockEscrowPK,
          owner: payer,
          lpMint,
          payer,
          systemProgram: SystemProgram.programId,
        })
        .instruction();
      createPoolPostInstructions.push(createLockEscrowIx);
      const [escrowAta, createEscrowAtaIx] = await getOrCreateATAInstruction(lpMint, lockEscrowPK, connection, payer);

      createEscrowAtaIx && createPoolPostInstructions.push(createEscrowAtaIx);
      const lockIx = await ammProgram.methods
        .lock(U64_MAX)
        .accounts({
          pool: poolPubkey,
          lockEscrow: lockEscrowPK,
          owner: payer,
          lpMint,
          sourceTokens: payerPoolLp,
          escrowVault: escrowAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          aVault,
          bVault,
          aVaultLp,
          bVaultLp,
          aVaultLpMint,
          bVaultLpMint,
        })
        .instruction();
      createPoolPostInstructions.push(lockIx);
    }

    const createPermissionlessPoolTx = await ammProgram.methods
      .initializePermissionlessConstantProductPoolWithConfig(tokenAAmount, tokenBAmount)
      .accounts({
        pool: poolPubkey,
        tokenAMint,
        tokenBMint,
        aVault,
        bVault,
        aVaultLpMint,
        bVaultLpMint,
        aVaultLp,
        bVaultLp,
        lpMint,
        payerTokenA,
        payerTokenB,
        protocolTokenAFee,
        protocolTokenBFee,
        payerPoolLp,
        aTokenVault,
        bTokenVault,
        mintMetadata,
        metadataProgram: METAPLEX_PROGRAM,
        payer,
        config,
        rent: SYSVAR_RENT_PUBKEY,
        vaultProgram: vaultProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .postInstructions(createPoolPostInstructions)
      .transaction();

    const ixs: Array<Transaction | TransactionInstruction | (Transaction | TransactionInstruction)[]> = [];

    if (preInstructions.length) {
      // Create 2 dynamic vault consume around 190k CU. Each create ATA + Wrap SOL around 23k
      const setComputeUnitLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
        units: 300_000,
      });
      ixs.push([setComputeUnitLimitIx, ...preInstructions]);
    }

    // Create dynamic pool consume around 287k, create lock escrow + lock liquidity around 84k
    const setComputeUnitLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 450_000,
    });

    ixs.push([setComputeUnitLimitIx, createPermissionlessPoolTx]);

    if (opt?.swapLiquidity) {
      const protocolTokenFee = deriveProtocolTokenFee(poolPubkey, tokenBMint, ammProgram.programId);
      const swapTx = await ammProgram.methods
        .swap(opt.swapLiquidity.inAmount, opt.swapLiquidity.minAmountOut)
        .accounts({
          aTokenVault,
          bTokenVault,
          aVault,
          bVault,
          aVaultLp,
          bVaultLp,
          aVaultLpMint,
          bVaultLpMint,
          userSourceToken: payerTokenB,
          userDestinationToken: payerTokenA,
          user: payer,
          protocolTokenFee,
          pool: poolPubkey,
          tokenProgram: TOKEN_PROGRAM_ID,
          vaultProgram: vaultProgram.programId,
        })
        .transaction();

      ixs.push(swapTx);
    }

    const resultTx: Transaction[] = await createTransactions(connection, ixs, payer);
    return resultTx;
  }

  public static async createPermissionlessConstantProductMemecoinPoolWithConfig(
    connection: Connection,
    payer: PublicKey,
    tokenAMint: PublicKey,
    tokenBMint: PublicKey,
    tokenAAmount: BN,
    tokenBAmount: BN,
    config: PublicKey,
    memecoinInfo: {
      isMinted?: boolean;
      keypair?: Keypair;
      payer?: PublicKey;
      assetData?: DataV2;
      mintAuthority?: PublicKey;
      freezeAuthority?: PublicKey | null;
      decimals?: number;
      mintAmount?: BN;
    },
    opt?: {
      cluster?: Cluster;
      programId?: string;
      lockLiquidity?: boolean;
      swapLiquidity?: {
        inAmount: BN;
        minAmountOut: BN;
      };
      stakeLiquidity?: {
        ratio?: Decimal;
      };
      skipAAta?: boolean;
      skipBAta?: boolean;
      feeVault?: {
        secondsToFullUnlock: BN;
        topListLength: number;
        startFeeDistributeTimestamp: BN | null;
        unstakeLockDuration: BN;
      };
    },
  ) {
    const { vaultProgram, ammProgram } = createProgram(connection, opt?.programId);

    const createTokenIxs: TransactionInstruction[] = [];

    if (!memecoinInfo.isMinted) {
      if (
        !memecoinInfo.keypair ||
        !memecoinInfo.payer ||
        !memecoinInfo.mintAuthority ||
        !memecoinInfo.mintAmount ||
        !memecoinInfo.assetData ||
        memecoinInfo.freezeAuthority === undefined
      ) {
        throw new Error('Missing required fields for minting Memecoin.');
      }

      const { tx: mintTx, mintAccount } = await createMint(
        connection,
        memecoinInfo.keypair,
        memecoinInfo.payer,
        memecoinInfo.assetData,
        memecoinInfo.mintAuthority,
        memecoinInfo.freezeAuthority,
        memecoinInfo.decimals || 0,
        TOKEN_PROGRAM_ID,
      );

      createTokenIxs.push(...mintTx.instructions);

      const [ata, createAtaIx] = await getOrCreateATAInstruction(
        mintAccount.publicKey,
        memecoinInfo.mintAuthority,
        connection,
        memecoinInfo.payer,
      );

      createAtaIx && createTokenIxs.push(createAtaIx);

      const mintToIx = createMintToInstruction(
        mintAccount.publicKey,
        ata,
        memecoinInfo.mintAuthority,
        BigInt(memecoinInfo.mintAmount.toString()),
      );

      createTokenIxs.push(mintToIx);

      const revokeMintAuthorityIx = createSetAuthorityInstruction(
        mintAccount.publicKey,
        memecoinInfo.mintAuthority,
        0,
        null,
      );

      createTokenIxs.push(revokeMintAuthorityIx);
    }

    let preInstructions: Array<TransactionInstruction> = [...createTokenIxs];

    const [
      { vaultPda: aVault, tokenVaultPda: aTokenVault, lpMintPda: aLpMintPda },
      { vaultPda: bVault, tokenVaultPda: bTokenVault, lpMintPda: bLpMintPda },
    ] = [getVaultPdas(tokenAMint, vaultProgram.programId), getVaultPdas(tokenBMint, vaultProgram.programId)];

    const [aVaultAccount, bVaultAccount] = await Promise.all([
      vaultProgram.account.vault.fetchNullable(aVault),
      vaultProgram.account.vault.fetchNullable(bVault),
    ]);

    let aVaultLpMint = aLpMintPda;
    let bVaultLpMint = bLpMintPda;

    if (!aVaultAccount) {
      const createVaultAIx = await VaultImpl.createPermissionlessVaultInstruction(connection, payer, tokenAMint);
      createVaultAIx && preInstructions.push(createVaultAIx);
    } else {
      aVaultLpMint = aVaultAccount.lpMint; // Old vault doesn't have lp mint pda
    }
    if (!bVaultAccount) {
      const createVaultBIx = await VaultImpl.createPermissionlessVaultInstruction(connection, payer, tokenBMint);
      createVaultBIx && preInstructions.push(createVaultBIx);
    } else {
      bVaultLpMint = bVaultAccount.lpMint; // Old vault doesn't have lp mint pda
    }

    const poolPubkey = deriveConstantProductPoolAddressWithConfig(tokenAMint, tokenBMint, config, ammProgram.programId);

    const [lpMint] = PublicKey.findProgramAddressSync(
      [Buffer.from(SEEDS.LP_MINT), poolPubkey.toBuffer()],
      ammProgram.programId,
    );

    const [[aVaultLp], [bVaultLp]] = [
      PublicKey.findProgramAddressSync([aVault.toBuffer(), poolPubkey.toBuffer()], ammProgram.programId),
      PublicKey.findProgramAddressSync([bVault.toBuffer(), poolPubkey.toBuffer()], ammProgram.programId),
    ];

    const [[payerTokenA, createPayerTokenAIx], [payerTokenB, createPayerTokenBIx]] = await Promise.all([
      getOrCreateATAInstruction(tokenAMint, payer, connection),
      getOrCreateATAInstruction(tokenBMint, payer, connection),
    ]);
    createPayerTokenAIx && !opt?.skipAAta && preInstructions.push(createPayerTokenAIx);
    createPayerTokenBIx && !opt?.skipBAta && preInstructions.push(createPayerTokenBIx);

    const [[protocolTokenAFee], [protocolTokenBFee]] = [
      PublicKey.findProgramAddressSync(
        [Buffer.from(SEEDS.FEE), tokenAMint.toBuffer(), poolPubkey.toBuffer()],
        ammProgram.programId,
      ),
      PublicKey.findProgramAddressSync(
        [Buffer.from(SEEDS.FEE), tokenBMint.toBuffer(), poolPubkey.toBuffer()],
        ammProgram.programId,
      ),
    ];

    const payerPoolLp = getAssociatedTokenAccount(lpMint, payer);

    if (tokenAMint.equals(NATIVE_MINT)) {
      preInstructions = preInstructions.concat(wrapSOLInstruction(payer, payerTokenA, BigInt(tokenAAmount.toString())));
    }

    if (tokenBMint.equals(NATIVE_MINT)) {
      preInstructions = preInstructions.concat(
        wrapSOLInstruction(
          payer,
          payerTokenB,
          BigInt(tokenBAmount.add(opt?.swapLiquidity?.inAmount ?? new BN(0)).toString()),
        ),
      );
    }

    const [mintMetadata, _mintMetadataBump] = deriveMintMetadata(lpMint);
    const lpAmount = sqrt(tokenAAmount.mul(tokenBAmount));
    const { userLockAmount, feeWrapperLockAmount } = calculateLockAmounts(lpAmount, opt?.stakeLiquidity?.ratio);

    const createPoolPostInstructions: TransactionInstruction[] = [];
    if (opt?.lockLiquidity && userLockAmount.gt(new BN(0))) {
      const [lockEscrowPK] = deriveLockEscrowPda(poolPubkey, payer, ammProgram.programId);
      const createLockEscrowIx = await ammProgram.methods
        .createLockEscrow()
        .accounts({
          pool: poolPubkey,
          lockEscrow: lockEscrowPK,
          owner: payer,
          lpMint,
          payer,
          systemProgram: SystemProgram.programId,
        })
        .instruction();
      createPoolPostInstructions.push(createLockEscrowIx);
      const [escrowAta, createEscrowAtaIx] = await getOrCreateATAInstruction(lpMint, lockEscrowPK, connection, payer);

      createEscrowAtaIx && createPoolPostInstructions.push(createEscrowAtaIx);
      const lockIx = await ammProgram.methods
        .lock(userLockAmount)
        .accounts({
          pool: poolPubkey,
          lockEscrow: lockEscrowPK,
          owner: payer,
          lpMint,
          sourceTokens: payerPoolLp,
          escrowVault: escrowAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          aVault,
          bVault,
          aVaultLp,
          bVaultLp,
          aVaultLpMint,
          bVaultLpMint,
        })
        .instruction();

      createPoolPostInstructions.push(lockIx);
    }

    const createPermissionlessPoolTx = await ammProgram.methods
      .initializePermissionlessConstantProductPoolWithConfig(tokenAAmount, tokenBAmount)
      .accounts({
        pool: poolPubkey,
        tokenAMint,
        tokenBMint,
        aVault,
        bVault,
        aVaultLpMint,
        bVaultLpMint,
        aVaultLp,
        bVaultLp,
        lpMint,
        payerTokenA,
        payerTokenB,
        protocolTokenAFee,
        protocolTokenBFee,
        payerPoolLp,
        aTokenVault,
        bTokenVault,
        mintMetadata,
        metadataProgram: METAPLEX_PROGRAM,
        payer,
        config,
        rent: SYSVAR_RENT_PUBKEY,
        vaultProgram: vaultProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .postInstructions(createPoolPostInstructions)
      .transaction();

    const ixs: Array<Transaction | TransactionInstruction | (Transaction | TransactionInstruction)[]> = [];

    if (preInstructions.length) {
      // Create 2 dynamic vault consume around 190k CU. Each create ATA + Wrap SOL around 23k
      const setComputeUnitLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
        units: 300_000,
      });
      ixs.push([setComputeUnitLimitIx, ...preInstructions]);
    }

    // Create dynamic pool consume around 287k, create lock escrow + lock liquidity around 84k
    const setComputeUnitLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 450_000,
    });

    ixs.push([setComputeUnitLimitIx, createPermissionlessPoolTx]);

    if (feeWrapperLockAmount.gt(new BN(0))) {
      const preInstructions: TransactionInstruction[] = [];

      const initFeeVaultParams = opt?.feeVault ? { ...opt.feeVault, padding: new Array(64).fill(0) } : undefined;

      const createFeeVaultIxs = await StakeForFee.createFeeVaultInstructions(
        connection,
        poolPubkey,
        payer,
        tokenAMint,
        tokenBMint,
        initFeeVaultParams,
      );
      preInstructions.push(...createFeeVaultIxs);

      const vaultKey = deriveFeeVault(poolPubkey, STAKE_FOR_FEE_PROGRAM_ID);

      const [lockEscrowFeeVaultPK] = deriveLockEscrowPda(poolPubkey, vaultKey, ammProgram.programId);

      const [escrowFeeVaultAta, createEscrowFeeVaultAtaIx] = await getOrCreateATAInstruction(
        lpMint,
        lockEscrowFeeVaultPK,
        connection,
        payer,
      );

      createEscrowFeeVaultAtaIx && preInstructions.push(createEscrowFeeVaultAtaIx);

      const lockTx = await ammProgram.methods
        .lock(feeWrapperLockAmount)
        .accounts({
          pool: poolPubkey,
          lockEscrow: lockEscrowFeeVaultPK,
          owner: payer,
          lpMint,
          sourceTokens: payerPoolLp,
          escrowVault: escrowFeeVaultAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          aVault,
          bVault,
          aVaultLp,
          bVaultLp,
          aVaultLpMint,
          bVaultLpMint,
        })
        .preInstructions(preInstructions)
        .transaction();

      ixs.push(lockTx);
    }

    if (opt?.swapLiquidity) {
      const protocolTokenFee = deriveProtocolTokenFee(poolPubkey, tokenBMint, ammProgram.programId);
      const swapTx = await ammProgram.methods
        .swap(opt.swapLiquidity.inAmount, opt.swapLiquidity.minAmountOut)
        .accounts({
          aTokenVault,
          bTokenVault,
          aVault,
          bVault,
          aVaultLp,
          bVaultLp,
          aVaultLpMint,
          bVaultLpMint,
          userSourceToken: payerTokenB,
          userDestinationToken: payerTokenA,
          user: payer,
          protocolTokenFee,
          pool: poolPubkey,
          tokenProgram: TOKEN_PROGRAM_ID,
          vaultProgram: vaultProgram.programId,
        })
        .transaction();

      ixs.push(swapTx);
    }
    const resultTx: Transaction[] = await createTransactions(connection, ixs, payer);

    return resultTx;
  }

  public static async createPermissionlessPool(
    connection: Connection,
    payer: PublicKey,
    mintA: PublicKey,
    mintB: PublicKey,
    tokenAAmount: BN,
    tokenBAmount: BN,
    isStable: boolean,
    tradeFeeBps: BN,
    opt?: {
      programId?: string;
      skipAta?: boolean;
    },
  ): Promise<Transaction> {
    const { vaultProgram, ammProgram } = createProgram(connection, opt?.programId);

    const [tokenMintA, tokenMintB] = await Promise.all([mintA, mintB].map((m) => getMint(connection, m)));
    const curveType = generateCurveType(tokenMintA.decimals, tokenMintB.decimals, isStable);

    const [
      { vaultPda: aVault, tokenVaultPda: aTokenVault, lpMintPda: aLpMintPda },
      { vaultPda: bVault, tokenVaultPda: bTokenVault, lpMintPda: bLpMintPda },
    ] = [getVaultPdas(mintA, vaultProgram.programId), getVaultPdas(mintB, vaultProgram.programId)];
    const [aVaultAccount, bVaultAccount] = await Promise.all([
      vaultProgram.account.vault.fetchNullable(aVault),
      vaultProgram.account.vault.fetchNullable(bVault),
    ]);

    let aVaultLpMint = aLpMintPda;
    let bVaultLpMint = bLpMintPda;
    let preInstructions: Array<TransactionInstruction> = [];
    const setComputeUnitLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 600_000,
    });
    preInstructions.push(setComputeUnitLimitIx);

    if (!aVaultAccount) {
      const createVaultAIx = await VaultImpl.createPermissionlessVaultInstruction(connection, payer, mintA);
      createVaultAIx && preInstructions.push(createVaultAIx);
    } else {
      aVaultLpMint = aVaultAccount.lpMint; // Old vault doesn't have lp mint pda
    }
    if (!bVaultAccount) {
      const createVaultBIx = await VaultImpl.createPermissionlessVaultInstruction(connection, payer, mintB);
      createVaultBIx && preInstructions.push(createVaultBIx);
    } else {
      bVaultLpMint = bVaultAccount.lpMint; // Old vault doesn't have lp mint pda
    }

    const poolPubkey = derivePoolAddress(
      connection,
      tokenMintA.address,
      tokenMintB.address,
      tokenMintA.decimals,
      tokenMintB.decimals,
      isStable,
      tradeFeeBps,
      {
        programId: opt?.programId,
      },
    );

    const [[aVaultLp], [bVaultLp]] = [
      PublicKey.findProgramAddressSync([aVault.toBuffer(), poolPubkey.toBuffer()], ammProgram.programId),
      PublicKey.findProgramAddressSync([bVault.toBuffer(), poolPubkey.toBuffer()], ammProgram.programId),
    ];

    const [[payerTokenA, createPayerTokenAIx], [payerTokenB, createPayerTokenBIx]] = await Promise.all([
      getOrCreateATAInstruction(mintA, payer, connection),
      getOrCreateATAInstruction(mintB, payer, connection),
    ]);

    if (!opt?.skipAta) {
      createPayerTokenAIx && preInstructions.push(createPayerTokenAIx);
    }
    createPayerTokenBIx && preInstructions.push(createPayerTokenBIx);

    const [[protocolTokenAFee], [protocolTokenBFee]] = [
      PublicKey.findProgramAddressSync(
        [Buffer.from(SEEDS.FEE), mintA.toBuffer(), poolPubkey.toBuffer()],
        ammProgram.programId,
      ),
      PublicKey.findProgramAddressSync(
        [Buffer.from(SEEDS.FEE), mintB.toBuffer(), poolPubkey.toBuffer()],
        ammProgram.programId,
      ),
    ];

    const [lpMint] = PublicKey.findProgramAddressSync(
      [Buffer.from(SEEDS.LP_MINT), poolPubkey.toBuffer()],
      ammProgram.programId,
    );

    const payerPoolLp = await getAssociatedTokenAccount(lpMint, payer);

    if (mintA.equals(NATIVE_MINT)) {
      preInstructions = preInstructions.concat(wrapSOLInstruction(payer, payerTokenA, BigInt(tokenAAmount.toString())));
    }

    if (mintB.equals(NATIVE_MINT)) {
      preInstructions = preInstructions.concat(wrapSOLInstruction(payer, payerTokenB, BigInt(tokenBAmount.toString())));
    }

    const [mintMetadata, _mintMetadataBump] = deriveMintMetadata(lpMint);

    const createPermissionlessPoolTx = await ammProgram.methods
      .initializePermissionlessPoolWithFeeTier(curveType, tradeFeeBps, tokenAAmount, tokenBAmount)
      .accounts({
        pool: poolPubkey,
        tokenAMint: mintA,
        tokenBMint: mintB,
        aVault,
        bVault,
        aVaultLpMint,
        bVaultLpMint,
        aVaultLp,
        bVaultLp,
        lpMint,
        payerTokenA,
        payerTokenB,
        protocolTokenAFee,
        protocolTokenBFee,
        payerPoolLp,
        aTokenVault,
        bTokenVault,
        mintMetadata,
        metadataProgram: METAPLEX_PROGRAM,
        feeOwner: FEE_OWNER,
        payer,
        rent: SYSVAR_RENT_PUBKEY,
        vaultProgram: vaultProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .preInstructions(preInstructions)
      .transaction();

    return new Transaction({
      feePayer: payer,
      ...(await ammProgram.provider.connection.getLatestBlockhash(ammProgram.provider.connection.commitment)),
    }).add(createPermissionlessPoolTx);
  }

  public static async createMultiple(
    connection: Connection,
    poolList: Array<PublicKey>,
    opt?: {
      cluster?: Cluster;
      programId?: string;
    },
  ): Promise<AmmImpl[]> {
    const cluster = opt?.cluster ?? 'mainnet-beta';
    const { provider, vaultProgram, ammProgram } = createProgram(connection, opt?.programId);
    const poolInfoMap = new Map<
      string,
      {
        pool: PublicKey;
        poolState: PoolState & { lpSupply: BN };
        vaultA: VaultImpl;
        vaultB: VaultImpl;
        tokenAMint: Mint;
        tokenBMint: Mint;
      }
    >();

    const poolsState: Array<PoolState & { lpSupply: BN }> = await getAllPoolState(poolList, ammProgram);

    const PdaInfos = poolList.reduce<Array<PublicKey>>((accList, _, index) => {
      const poolState = poolsState[index];

      return [...accList, poolState.aVault, poolState.bVault];
    }, []);
    const vaultsImpl = await VaultImpl.createMultipleWithPda(connection, PdaInfos);

    const accountsToFetch = await Promise.all(
      poolsState.map(async (poolState, index) => {
        const pool = poolList[index];

        const vaultA = vaultsImpl.find(({ vaultPda }) => vaultPda.equals(poolState.aVault));
        const vaultB = vaultsImpl.find(({ vaultPda }) => vaultPda.equals(poolState.bVault));

        invariant(vaultA, `Vault ${poolState.tokenAMint.toBase58()} not found`);
        invariant(vaultB, `Vault ${poolState.tokenBMint.toBase58()} not found`);

        poolInfoMap.set(poolState.lpMint.toBase58(), {
          pool,
          poolState,
          vaultA,
          vaultB,
          tokenAMint: vaultA.tokenMint,
          tokenBMint: vaultB.tokenMint,
        });
        return [
          { pubkey: vaultA.vaultState.tokenVault, type: AccountType.VAULT_A_RESERVE },
          { pubkey: vaultB.vaultState.tokenVault, type: AccountType.VAULT_B_RESERVE },
          { pubkey: vaultA.vaultState.lpMint, type: AccountType.VAULT_A_LP },
          { pubkey: vaultB.vaultState.lpMint, type: AccountType.VAULT_B_LP },
          { pubkey: poolState.aVaultLp, type: AccountType.POOL_VAULT_A_LP },
          { pubkey: poolState.bVaultLp, type: AccountType.POOL_VAULT_B_LP },
          { pubkey: poolState.lpMint, type: AccountType.POOL_LP_MINT },
        ];
      }),
    );

    const flatAccountsToFetch = accountsToFetch.flat();
    const accountsBufferMap = await getAccountsBuffer(connection, [
      ...flatAccountsToFetch,
      { pubkey: SYSVAR_CLOCK_PUBKEY, type: AccountType.SYSVAR_CLOCK },
    ]);

    const clockAccount = accountsBufferMap.get(SYSVAR_CLOCK_PUBKEY.toBase58());
    invariant(clockAccount, 'Clock account not found');
    const clock = ClockLayout.decode(clockAccount.account.data) as Clock;

    const accountsInfoMap = deserializeAccountsBuffer(accountsBufferMap);
    const depegAccounts = await getDepegAccounts(ammProgram.provider.connection, poolsState);

    const ammImpls: AmmImpl[] = await Promise.all(
      accountsToFetch.map(async (accounts) => {
        const [tokenAVault, tokenBVault, vaultALp, vaultBLp, poolVaultA, poolVaultB, poolLpMint] = accounts; // must follow order
        const poolVaultALp = accountsInfoMap.get(poolVaultA.pubkey.toBase58()) as BN;
        const poolVaultBLp = accountsInfoMap.get(poolVaultB.pubkey.toBase58()) as BN;
        const vaultALpSupply = accountsInfoMap.get(vaultALp.pubkey.toBase58()) as BN;
        const vaultBLpSupply = accountsInfoMap.get(vaultBLp.pubkey.toBase58()) as BN;
        const vaultAReserve = accountsInfoMap.get(tokenAVault.pubkey.toBase58()) as BN;
        const vaultBReserve = accountsInfoMap.get(tokenBVault.pubkey.toBase58()) as BN;
        const poolLpSupply = accountsInfoMap.get(poolLpMint.pubkey.toBase58()) as BN;

        const currentTime = clock.unixTimestamp;
        const currentSlot = clock.slot;

        invariant(
          !!currentTime &&
            !!vaultALpSupply &&
            !!vaultBLpSupply &&
            !!vaultAReserve &&
            !!vaultBReserve &&
            !!poolVaultALp &&
            !!poolVaultBLp &&
            !!poolLpSupply,
          'Account Info not found',
        );

        const accountsInfo = {
          currentTime,
          currentSlot,
          poolVaultALp,
          poolVaultBLp,
          vaultALpSupply,
          vaultBLpSupply,
          vaultAReserve,
          vaultBReserve,
          poolLpSupply,
        };

        const poolInfoData = poolInfoMap.get(poolLpMint.pubkey.toBase58());

        invariant(poolInfoData, 'Cannot find pool info');

        const { pool, poolState, vaultA, vaultB, tokenAMint, tokenBMint } = poolInfoData;

        let swapCurve;
        if ('stable' in poolState.curveType) {
          const { amp, depeg, tokenMultiplier } = poolState.curveType['stable'] as any;
          swapCurve = new StableSwap(
            amp.toNumber(),
            tokenMultiplier,
            depeg,
            depegAccounts,
            currentTime,
            poolState.stake,
          );
        } else {
          swapCurve = new ConstantProductSwap();
        }

        const poolInfo = calculatePoolInfo(
          currentTime,
          poolVaultALp,
          poolVaultBLp,
          vaultALpSupply,
          vaultBLpSupply,
          poolLpSupply,
          swapCurve,
          vaultA.vaultState,
          vaultB.vaultState,
        );

        return new AmmImpl(
          pool,
          ammProgram,
          vaultProgram,
          tokenAMint,
          tokenBMint,
          poolState,
          poolInfo,
          vaultA,
          vaultB,
          accountsInfo,
          swapCurve,
          depegAccounts,
          {
            cluster,
          },
        );
      }),
    );

    return ammImpls;
  }

  /**
   * Retrieves the pool configuration with the authority of the pool creator.
   *
   * @param {Connection} connection - The connection to the Solana network.
   * @param {PublicKey} wallet - The public key of the wallet.
   * @param {Object} [opt] - Optional parameters.
   * @return {Promise<Array<Account<Config>>>} A promise that resolves to an array of pool configuration accounts which the wallet can used to create pools.
   */
  public static async getPoolConfigsWithPoolCreatorAuthority(
    connection: Connection,
    wallet: PublicKey,
    opt?: { programId?: string },
  ) {
    const { ammProgram } = createProgram(connection, opt?.programId);
    const configAccounts = await ammProgram.account.config.all([
      {
        memcmp: {
          offset: 8 + 72,
          bytes: wallet.toBase58(),
        },
      },
    ]);

    return configAccounts;
  }

  public static async getPoolConfig(connection: Connection, config: PublicKey, opt?: { programId?: string }) {
    const { ammProgram } = createProgram(connection, opt?.programId);
    const configAccount = await ammProgram.account.config.fetch(config);

    return configAccount;
  }

  public static async getFeeConfigurations(connection: Connection, opt?: { programId?: string; cluster?: Cluster }) {
    const { ammProgram } = createProgram(connection, opt?.programId);
    const configs = await ammProgram.account.config.all();

    return configs.map((configAccount) => {
      const { poolFees } = configAccount.account;

      return {
        publicKey: configAccount.publicKey,
        poolFees,
        tradeFeeBps: poolFees.tradeFeeNumerator.mul(new BN(10000)).div(poolFees.tradeFeeDenominator),
        protocolTradeFeeBps: poolFees.protocolTradeFeeNumerator
          .mul(new BN(10000))
          .div(poolFees.protocolTradeFeeDenominator),
      };
    });
  }

  public static async getLockedLpAmountByUser(
    connection: Connection,
    userPubKey: PublicKey,
    opt?: {
      programId?: string;
      cluster?: Cluster;
    },
  ) {
    const { ammProgram } = createProgram(connection, opt?.programId);

    const lockEscrows = await ammProgram.account.lockEscrow.all([
      {
        memcmp: {
          bytes: bs58.encode(userPubKey.toBuffer()),
          offset: 8 + 32,
        },
      },
    ]);

    return lockEscrows.reduce((accMap, { account }) => {
      return accMap.set(account.pool.toBase58(), account);
    }, new Map<string, LockEscrowAccount>());
  }

  public static async fetchMultipleUserBalance(
    connection: Connection,
    lpMintList: Array<PublicKey>,
    owner: PublicKey,
  ): Promise<Array<BN>> {
    const ataAccounts = await Promise.all(lpMintList.map((lpMint) => getAssociatedTokenAccount(lpMint, owner)));

    const accountsInfo = await chunkedGetMultipleAccountInfos(connection, ataAccounts);

    return accountsInfo.map((accountInfo) => {
      if (!accountInfo) return new BN(0);

      const accountBalance = deserializeAccount(accountInfo.data);
      if (!accountBalance) throw new Error('Failed to parse user account for LP token.');

      return new BN(accountBalance.amount.toString());
    });
  }

  public static async create(
    connection: Connection,
    pool: PublicKey,
    opt?: {
      programId?: string;
      vaultSeedBaseKey?: PublicKey;
      cluster?: Cluster;
    },
  ): Promise<AmmImpl> {
    const cluster = opt?.cluster ?? 'mainnet-beta';
    const { vaultProgram, ammProgram } = createProgram(connection, opt?.programId);

    const poolState = await getPoolState(pool, ammProgram);

    const pdaInfos = [poolState.aVault, poolState.bVault];

    const [vaultA, vaultB] = await VaultImpl.createMultipleWithPda(connection, pdaInfos, {
      seedBaseKey: opt?.vaultSeedBaseKey,
    });

    const accountsBufferMap = await getAccountsBuffer(connection, [
      { pubkey: vaultA.vaultState.tokenVault, type: AccountType.VAULT_A_RESERVE },
      { pubkey: vaultB.vaultState.tokenVault, type: AccountType.VAULT_B_RESERVE },
      { pubkey: vaultA.vaultState.lpMint, type: AccountType.VAULT_A_LP },
      { pubkey: vaultB.vaultState.lpMint, type: AccountType.VAULT_B_LP },
      { pubkey: poolState.aVaultLp, type: AccountType.POOL_VAULT_A_LP },
      { pubkey: poolState.bVaultLp, type: AccountType.POOL_VAULT_B_LP },
      { pubkey: poolState.lpMint, type: AccountType.POOL_LP_MINT },
      { pubkey: SYSVAR_CLOCK_PUBKEY, type: AccountType.SYSVAR_CLOCK },
    ]);
    const accountsInfoMap = deserializeAccountsBuffer(accountsBufferMap);

    const clockAccount = accountsBufferMap.get(SYSVAR_CLOCK_PUBKEY.toBase58());
    invariant(clockAccount, 'Clock account not found');
    const clock = ClockLayout.decode(clockAccount.account.data) as Clock;

    const poolVaultALp = accountsInfoMap.get(poolState.aVaultLp.toBase58()) as BN;
    const poolVaultBLp = accountsInfoMap.get(poolState.bVaultLp.toBase58()) as BN;
    const vaultALpSupply = accountsInfoMap.get(vaultA.vaultState.lpMint.toBase58()) as BN;
    const vaultBLpSupply = accountsInfoMap.get(vaultB.vaultState.lpMint.toBase58()) as BN;
    const vaultAReserve = accountsInfoMap.get(vaultA.vaultState.tokenVault.toBase58()) as BN;
    const vaultBReserve = accountsInfoMap.get(vaultB.vaultState.tokenVault.toBase58()) as BN;
    const poolLpSupply = accountsInfoMap.get(poolState.lpMint.toBase58()) as BN;

    const currentTime = clock.unixTimestamp;
    const currentSlot = clock.slot;

    invariant(
      !!currentTime &&
        !!vaultALpSupply &&
        !!vaultBLpSupply &&
        !!vaultAReserve &&
        !!vaultBReserve &&
        !!poolVaultALp &&
        !!poolVaultBLp &&
        !!poolLpSupply,
      'Account Info not found',
    );

    const accountsInfo = {
      currentTime,
      currentSlot,
      poolVaultALp,
      poolVaultBLp,
      vaultALpSupply,
      vaultBLpSupply,
      vaultAReserve,
      vaultBReserve,
      poolLpSupply,
    };

    const depegAccounts = await getDepegAccounts(ammProgram.provider.connection, [poolState]);

    let swapCurve;
    if ('stable' in poolState.curveType) {
      const { amp, depeg, tokenMultiplier } = poolState.curveType['stable'] as any;
      swapCurve = new StableSwap(amp.toNumber(), tokenMultiplier, depeg, depegAccounts, currentTime, poolState.stake);
    } else {
      swapCurve = new ConstantProductSwap();
    }

    const poolInfo = calculatePoolInfo(
      currentTime,
      poolVaultALp,
      poolVaultBLp,
      vaultALpSupply,
      vaultBLpSupply,
      poolLpSupply,
      swapCurve,
      vaultA.vaultState,
      vaultB.vaultState,
    );

    return new AmmImpl(
      pool,
      ammProgram,
      vaultProgram,
      vaultA.tokenMint,
      vaultB.tokenMint,
      poolState,
      poolInfo,
      vaultA,
      vaultB,
      accountsInfo,
      swapCurve,
      depegAccounts,
      {
        cluster,
      },
    );
  }

  get decimals(): number {
    return Math.max(this.tokenAMint.decimals, this.tokenBMint.decimals);
  }

  get isStablePool(): boolean {
    return 'stable' in this.poolState.curveType;
  }

  get isLST(): boolean {
    if (!this.isStablePool || !this.swapCurve.depeg?.depegType) return false;

    return !Object.keys(this.swapCurve.depeg.depegType).includes('none');
  }

  get feeBps(): BN {
    return this.poolState.fees.tradeFeeNumerator.mul(new BN(10000)).div(this.poolState.fees.tradeFeeDenominator);
  }

  get depegToken(): Mint | null {
    if (!this.isStablePool) return null;
    const { tokenMultiplier } = this.poolState.curveType['stable'] as any;
    const tokenABalance = this.poolInfo.tokenAAmount.mul(tokenMultiplier.tokenAMultiplier);
    const tokenBBalance = this.poolInfo.tokenBAmount.mul(tokenMultiplier.tokenBMultiplier);
    const totalTokenBalance = tokenABalance.add(tokenBBalance);

    if (totalTokenBalance.isZero()) return null;

    const isTokenADepeg = this.poolInfo.tokenAAmount
      .mul(new BN(2))
      .div(totalTokenBalance)
      .mul(new BN(100))
      .gt(new BN(95));
    const isTokenBDepeg = this.poolInfo.tokenBAmount
      .mul(new BN(2))
      .div(totalTokenBalance)
      .mul(new BN(100))
      .gt(new BN(95));

    if (isTokenADepeg) return this.tokenAMint;
    if (isTokenBDepeg) return this.tokenBMint;
    return null;
  }

  private async getLockedAtaAmount(): Promise<BN> {
    try {
      const poolLpAta = await getAssociatedTokenAccount(this.poolState.lpMint, this.address);
      const info = await this.program.provider.connection.getTokenAccountBalance(poolLpAta);
      return new BN(info.value.amount);
    } catch (e) {
      return new BN(0);
    }
  }

  public async getLockedLpAmount(): Promise<BN> {
    return (await this.getLockedAtaAmount()).add(this.poolState.totalLockedLp);
  }

  /**
   * It updates the state of the pool
   */
  public async updateState() {
    const [poolState] = await Promise.all([
      getPoolState(this.address, this.program),
      this.vaultA.refreshVaultState(),
      this.vaultB.refreshVaultState(),
    ]);
    this.poolState = poolState;

    const accountsBufferMap = await getAccountsBuffer(this.program.provider.connection, [
      { pubkey: this.vaultA.vaultState.tokenVault, type: AccountType.VAULT_A_RESERVE },
      { pubkey: this.vaultB.vaultState.tokenVault, type: AccountType.VAULT_B_RESERVE },
      { pubkey: this.vaultA.vaultState.lpMint, type: AccountType.VAULT_A_LP },
      { pubkey: this.vaultB.vaultState.lpMint, type: AccountType.VAULT_B_LP },
      { pubkey: poolState.aVaultLp, type: AccountType.POOL_VAULT_A_LP },
      { pubkey: poolState.bVaultLp, type: AccountType.POOL_VAULT_B_LP },
      { pubkey: poolState.lpMint, type: AccountType.POOL_LP_MINT },
      { pubkey: SYSVAR_CLOCK_PUBKEY, type: AccountType.SYSVAR_CLOCK },
    ]);
    const accountsInfoMap = deserializeAccountsBuffer(accountsBufferMap);

    const clockAccount = accountsBufferMap.get(SYSVAR_CLOCK_PUBKEY.toBase58());
    invariant(clockAccount, 'Clock account not found');
    const clock = ClockLayout.decode(clockAccount.account.data) as Clock;

    const poolVaultALp = accountsInfoMap.get(poolState.aVaultLp.toBase58()) as BN;
    const poolVaultBLp = accountsInfoMap.get(poolState.bVaultLp.toBase58()) as BN;
    const vaultALpSupply = accountsInfoMap.get(this.vaultA.vaultState.lpMint.toBase58()) as BN;
    const vaultBLpSupply = accountsInfoMap.get(this.vaultB.vaultState.lpMint.toBase58()) as BN;
    const vaultAReserve = accountsInfoMap.get(this.vaultA.vaultState.tokenVault.toBase58()) as BN;
    const vaultBReserve = accountsInfoMap.get(this.vaultB.vaultState.tokenVault.toBase58()) as BN;
    const poolLpSupply = accountsInfoMap.get(poolState.lpMint.toBase58()) as BN;

    const currentTime = clock.unixTimestamp;
    const currentSlot = clock.slot;

    invariant(
      !!currentTime &&
        !!vaultALpSupply &&
        !!vaultBLpSupply &&
        !!vaultAReserve &&
        !!vaultBReserve &&
        !!poolVaultALp &&
        !!poolVaultBLp &&
        !!poolLpSupply,
      'Account Info not found',
    );

    this.accountsInfo = {
      currentTime,
      currentSlot,
      poolVaultALp,
      poolVaultBLp,
      vaultALpSupply,
      vaultBLpSupply,
      vaultAReserve,
      vaultBReserve,
      poolLpSupply,
    };

    this.depegAccounts = await getDepegAccounts(this.program.provider.connection, [poolState]);

    if ('stable' in poolState.curveType) {
      const { amp, depeg, tokenMultiplier } = poolState.curveType['stable'] as any;
      this.swapCurve = new StableSwap(
        amp.toNumber(),
        tokenMultiplier,
        depeg,
        this.depegAccounts,
        currentTime,
        poolState.stake,
      );
    } else {
      this.swapCurve = new ConstantProductSwap();
    }

    this.poolInfo = calculatePoolInfo(
      currentTime,
      poolVaultALp,
      poolVaultBLp,
      vaultALpSupply,
      vaultBLpSupply,
      poolLpSupply,
      this.swapCurve,
      this.vaultA.vaultState,
      this.vaultB.vaultState,
    );
  }

  /**
   * It returns the pool token mint.
   * @returns The poolState.lpMint
   */
  public getPoolTokenMint() {
    return this.poolState.lpMint;
  }

  /**
   * It gets the total supply of the LP token
   * @returns The total supply of the LP token.
   */
  public async getLpSupply() {
    const account = await this.program.provider.connection.getTokenSupply(this.poolState.lpMint);
    invariant(account.value.amount, ERROR.INVALID_ACCOUNT);

    return new BN(account.value.amount);
  }

  /**
   * Get the user's balance by looking up the account associated with the user's public key
   * @param {PublicKey} owner - PublicKey - The public key of the user you want to get the balance of
   * @returns The amount of tokens the user has.
   */
  public async getUserBalance(owner: PublicKey) {
    const account = await getAssociatedTokenAccount(this.poolState.lpMint, owner);
    if (!account) return new BN(0);

    const parsedAccountInfo = await this.program.provider.connection.getParsedAccountInfo(account);
    if (!parsedAccountInfo.value) return new BN(0);

    const accountInfoData = (parsedAccountInfo.value!.data as ParsedAccountData).parsed;

    return new BN(accountInfoData.info.tokenAmount.amount);
  }

  /**
   * `getSwapQuote` returns the amount of `outToken` that you will receive if you swap
   * `inAmountLamport` of `inToken` into the pool
   * @param {PublicKey} inTokenMint - The mint you want to swap from.
   * @param {BN} inAmountLamport - The amount of lamports you want to swap.
   * @param {number} [slippage] - The maximum amount of slippage you're willing to accept. (Max to 2 decimal place)
   * @returns The amount of the destination token that will be received after the swap.
   */
  public getSwapQuote(inTokenMint: PublicKey, inAmountLamport: BN, slippage: number, swapInitiator?: PublicKey) {
    const { amountOut, fee, priceImpact } = calculateSwapQuote(
      inTokenMint,
      inAmountLamport,
      {
        currentTime: this.accountsInfo.currentTime.toNumber(),
        currentSlot: this.accountsInfo.currentSlot.toNumber(),
        poolState: this.poolState,
        depegAccounts: this.depegAccounts,
        poolVaultALp: this.accountsInfo.poolVaultALp,
        poolVaultBLp: this.accountsInfo.poolVaultBLp,
        vaultA: this.vaultA.vaultState,
        vaultB: this.vaultB.vaultState,
        vaultALpSupply: this.accountsInfo.vaultALpSupply,
        vaultBLpSupply: this.accountsInfo.vaultBLpSupply,
        vaultAReserve: this.accountsInfo.vaultAReserve,
        vaultBReserve: this.accountsInfo.vaultBReserve,
      },
      swapInitiator,
    );

    return {
      swapInAmount: inAmountLamport,
      swapOutAmount: amountOut,
      minSwapOutAmount: getMinAmountWithSlippage(amountOut, slippage),
      fee,
      priceImpact,
    };
  }

  /**
   * Get maximum in amount (source amount) for swap
   * !!! NOTE it is just estimation
   * @param tokenMint
   */
  public getMaxSwapInAmount(tokenMint: PublicKey) {
    // Get maximum in amount by swapping maximum withdrawable amount of tokenMint in the pool
    invariant(
      tokenMint.equals(this.poolState.tokenAMint) || tokenMint.equals(this.poolState.tokenBMint),
      ERROR.INVALID_MINT,
    );

    const [outTokenMint, swapSourceAmount, swapDestAmount, tradeDirection] = tokenMint.equals(this.poolState.tokenAMint)
      ? [this.poolState.tokenBMint, this.poolInfo.tokenAAmount, this.poolInfo.tokenBAmount, TradeDirection.AToB]
      : [this.poolState.tokenAMint, this.poolInfo.tokenBAmount, this.poolInfo.tokenAAmount, TradeDirection.BToA];
    let maxOutAmount = this.getMaxSwapOutAmount(outTokenMint);
    // Impossible to deplete the pool, therefore if maxOutAmount is equals to tokenAmount in pool, subtract it by 1
    if (maxOutAmount.eq(swapDestAmount)) {
      maxOutAmount = maxOutAmount.sub(new BN(1)); // Left 1 token in pool
    }
    let maxInAmount = this.swapCurve!.computeInAmount(maxOutAmount, swapSourceAmount, swapDestAmount, tradeDirection);
    const adminFee = this.calculateProtocolTradingFee(maxInAmount);
    const tradeFee = this.calculateTradingFee(maxInAmount);
    maxInAmount = maxInAmount.sub(adminFee);
    maxInAmount = maxInAmount.sub(tradeFee);
    return maxInAmount;
  }

  /**
   * `getMaxSwapOutAmount` returns the maximum amount of tokens that can be swapped out of the pool
   * @param {PublicKey} tokenMint - The mint of the token you want to swap out.
   * @returns The maximum amount of tokens that can be swapped out of the pool.
   */
  public getMaxSwapOutAmount(tokenMint: PublicKey) {
    return calculateMaxSwapOutAmount(
      tokenMint,
      this.poolState.tokenAMint,
      this.poolState.tokenBMint,
      this.poolInfo.tokenAAmount,
      this.poolInfo.tokenBAmount,
      this.accountsInfo.vaultAReserve,
      this.accountsInfo.vaultBReserve,
    );
  }

  /**
   * `swap` is a function that takes in a `PublicKey` of the owner, a `PublicKey` of the input token
   * mint, an `BN` of the input amount of lamports, and an `BN` of the output amount of lamports. It
   * returns a `Promise<Transaction>` of the swap transaction
   * @param {PublicKey} owner - The public key of the user who is swapping
   * @param {PublicKey} inTokenMint - The mint of the token you're swapping from.
   * @param {BN} inAmountLamport - The amount of the input token you want to swap.
   * @param {BN} outAmountLamport - The minimum amount of the output token you want to receive.
   * @param {PublicKey} [referralOwner] - The referrer wallet will receive the host fee, fee will be transferred to ATA of referrer wallet.
   * @returns A transaction object
   */
  public async swap(
    owner: PublicKey,
    inTokenMint: PublicKey,
    inAmountLamport: BN,
    outAmountLamport: BN,
    referralOwner?: PublicKey,
  ): Promise<Transaction> {
    const [sourceToken, destinationToken] = this.tokenAMint.address.equals(inTokenMint)
      ? [this.poolState.tokenAMint, this.poolState.tokenBMint]
      : [this.poolState.tokenBMint, this.poolState.tokenAMint];

    const protocolTokenFee = this.tokenAMint.address.equals(inTokenMint)
      ? this.poolState.protocolTokenAFee
      : this.poolState.protocolTokenBFee;

    let preInstructions: Array<TransactionInstruction> = [];
    const [[userSourceToken, createUserSourceIx], [userDestinationToken, createUserDestinationIx]] =
      await this.createATAPreInstructions(owner, [sourceToken, destinationToken]);

    createUserSourceIx && preInstructions.push(createUserSourceIx);
    createUserDestinationIx && preInstructions.push(createUserDestinationIx);

    if (sourceToken.equals(NATIVE_MINT)) {
      preInstructions = preInstructions.concat(
        wrapSOLInstruction(owner, userSourceToken, BigInt(inAmountLamport.toString())),
      );
    }

    const postInstructions: Array<TransactionInstruction> = [];
    if (NATIVE_MINT.equals(destinationToken)) {
      const unwrapSOLIx = await unwrapSOLInstruction(owner, owner);
      unwrapSOLIx && postInstructions.push(unwrapSOLIx);
    }

    const remainingAccounts = this.swapCurve.getRemainingAccounts();

    if (referralOwner) {
      const [referralTokenAccount, createReferralTokenAccountIx] = await getOrCreateATAInstruction(
        inTokenMint,
        referralOwner,
        this.program.provider.connection,
        owner,
      );
      createReferralTokenAccountIx && preInstructions.push(createReferralTokenAccountIx);
      remainingAccounts.push({
        isSigner: false,
        isWritable: true,
        pubkey: referralTokenAccount,
      });
    }

    const swapTx = await this.program.methods
      .swap(inAmountLamport, outAmountLamport)
      .accounts({
        aTokenVault: this.vaultA.vaultState.tokenVault,
        bTokenVault: this.vaultB.vaultState.tokenVault,
        aVault: this.poolState.aVault,
        bVault: this.poolState.bVault,
        aVaultLp: this.poolState.aVaultLp,
        bVaultLp: this.poolState.bVaultLp,
        aVaultLpMint: this.vaultA.vaultState.lpMint,
        bVaultLpMint: this.vaultB.vaultState.lpMint,
        userSourceToken,
        userDestinationToken,
        user: owner,
        protocolTokenFee,
        pool: this.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        vaultProgram: this.vaultProgram.programId,
      })
      .remainingAccounts(remainingAccounts)
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .transaction();

    return new Transaction({
      feePayer: owner,
      ...(await this.program.provider.connection.getLatestBlockhash(this.program.provider.connection.commitment)),
    }).add(swapTx);
  }

  /**
   * `swap` is a function that takes in a `PublicKey` of the owner, a `PublicKey` of the input token
   * mint, an `BN` of the input amount of lamports, and an `BN` of the output amount of lamports. It
   * returns a `Promise<Transaction>` of the swap transaction
   * @param {PublicKey} owner - The public key of the user who is swapping
   * @param {PublicKey} inTokenMint - The mint of the token you're swapping from.
   * @param {BN} inAmountLamport - The amount of the input token you want to swap.
   * @param {BN} outAmountLamport - The minimum amount of the output token you want to receive.
   * @param {PublicKey} [referralOwner] - The referrer wallet will receive the host fee, fee will be transferred to ATA of referrer wallet.
   * @returns A transaction object
   */
  public async swapAndStakeForFee(
    owner: PublicKey,
    inTokenMint: PublicKey,
    inAmountLamport: BN,
    minOutAmountLamport: BN,
    outAmountLamport: BN,
    stakeForFee: StakeForFee,
  ): Promise<Transaction[]> {
    const resultTxs: Transaction[] = [];

    const swapTx = await this.swap(owner, inTokenMint, inAmountLamport, minOutAmountLamport);
    resultTxs.push(swapTx);

    const stakeTx = await stakeForFee.stake(outAmountLamport, owner);
    resultTxs.push(stakeTx);

    return resultTxs;
  }

  /**
   * `getDepositQuote` is a function that takes in a tokenAInAmount, tokenBInAmount, balance, and
   * slippage, and returns a poolTokenAmountOut, tokenAInAmount, and tokenBInAmount. `tokenAInAmount` or `tokenBAmount`
   * can be zero for balance deposit quote.
   * @param {BN} tokenAInAmount - The amount of token A to be deposit,
   * @param {BN} tokenBInAmount - The amount of token B to be deposit,
   * @param {boolean} [balance] - return false if the deposit is imbalance
   * @param {number} [slippage] - The amount of slippage you're willing to accept. (Max to 2 decimal place)
   * @returns The return value is a tuple of the poolTokenAmountOut, tokenAInAmount, and
   * tokenBInAmount.
   */
  public getDepositQuote(tokenAInAmount: BN, tokenBInAmount: BN, balance: boolean, slippage: number): DepositQuote {
    invariant(
      !(
        !this.isStablePool &&
        !tokenAInAmount.isZero() &&
        !tokenBInAmount.isZero() &&
        !this.accountsInfo.poolLpSupply.isZero()
      ),
      'Constant product only supports balanced deposit',
    );
    invariant(
      !(!tokenAInAmount.isZero() && !tokenBInAmount.isZero() && balance),
      'Deposit balance is not possible when both token in amount is non-zero',
    );

    if (this.accountsInfo.poolLpSupply.isZero()) {
      const poolTokenAmountOut = this.swapCurve.computeD(tokenAInAmount, tokenBInAmount);
      return {
        poolTokenAmountOut,
        minPoolTokenAmountOut: poolTokenAmountOut,
        tokenAInAmount: tokenAInAmount,
        tokenBInAmount: tokenBInAmount,
      };
    }

    const vaultAWithdrawableAmount = calculateWithdrawableAmount(
      this.accountsInfo.currentTime.toNumber(),
      this.vaultA.vaultState,
    );
    const vaultBWithdrawableAmount = calculateWithdrawableAmount(
      this.accountsInfo.currentTime.toNumber(),
      this.vaultB.vaultState,
    );

    if (tokenAInAmount.isZero() && balance) {
      const poolTokenAmountOut = this.getShareByAmount(
        tokenBInAmount,
        this.poolInfo.tokenBAmount,
        this.accountsInfo.poolLpSupply,
      );
      const bufferedPoolTokenAmountOut = getMinAmountWithSlippage(poolTokenAmountOut, UNLOCK_AMOUNT_BUFFER);

      // Calculate for stable pool balance deposit but used `addImbalanceLiquidity`
      if (this.isStablePool) {
        return {
          poolTokenAmountOut: bufferedPoolTokenAmountOut,
          minPoolTokenAmountOut: getMinAmountWithSlippage(bufferedPoolTokenAmountOut, slippage),
          tokenAInAmount: tokenBInAmount.mul(this.poolInfo.tokenAAmount).div(this.poolInfo.tokenBAmount),
          tokenBInAmount,
        };
      }

      // Constant product pool balance deposit
      const [actualTokenAInAmount, actualTokenBInAmount] = this.computeActualInAmount(
        poolTokenAmountOut,
        this.accountsInfo.poolLpSupply,
        this.accountsInfo.poolVaultALp,
        this.accountsInfo.poolVaultBLp,
        this.accountsInfo.vaultALpSupply,
        this.accountsInfo.vaultBLpSupply,
        vaultAWithdrawableAmount,
        vaultBWithdrawableAmount,
      );

      return {
        poolTokenAmountOut: bufferedPoolTokenAmountOut,
        minPoolTokenAmountOut: getMinAmountWithSlippage(bufferedPoolTokenAmountOut, slippage),
        tokenAInAmount: getMaxAmountWithSlippage(actualTokenAInAmount, slippage),
        tokenBInAmount: getMaxAmountWithSlippage(actualTokenBInAmount, slippage),
      };
    }

    if (tokenBInAmount.isZero() && balance) {
      const poolTokenAmountOut = this.getShareByAmount(
        tokenAInAmount,
        this.poolInfo.tokenAAmount,
        this.accountsInfo.poolLpSupply,
      );
      const bufferedPoolTokenAmountOut = getMinAmountWithSlippage(poolTokenAmountOut, UNLOCK_AMOUNT_BUFFER);

      // Calculate for stable pool balance deposit but used `addImbalanceLiquidity`
      if (this.isStablePool) {
        return {
          poolTokenAmountOut: bufferedPoolTokenAmountOut,
          minPoolTokenAmountOut: getMinAmountWithSlippage(bufferedPoolTokenAmountOut, slippage),
          tokenAInAmount,
          tokenBInAmount: tokenAInAmount.mul(this.poolInfo.tokenBAmount).div(this.poolInfo.tokenAAmount),
        };
      }

      // Constant product pool
      const [actualTokenAInAmount, actualTokenBInAmount] = this.computeActualInAmount(
        poolTokenAmountOut,
        this.accountsInfo.poolLpSupply,
        this.accountsInfo.poolVaultALp,
        this.accountsInfo.poolVaultBLp,
        this.accountsInfo.vaultALpSupply,
        this.accountsInfo.vaultBLpSupply,
        vaultAWithdrawableAmount,
        vaultBWithdrawableAmount,
      );

      return {
        poolTokenAmountOut: bufferedPoolTokenAmountOut,
        minPoolTokenAmountOut: getMinAmountWithSlippage(bufferedPoolTokenAmountOut, slippage),
        tokenAInAmount: getMaxAmountWithSlippage(actualTokenAInAmount, slippage),
        tokenBInAmount: getMaxAmountWithSlippage(actualTokenBInAmount, slippage),
      };
    }

    // Imbalance deposit
    const actualDepositAAmount = computeActualDepositAmount(
      tokenAInAmount,
      this.poolInfo.tokenAAmount,
      this.accountsInfo.poolVaultALp,
      this.accountsInfo.vaultALpSupply,
      vaultAWithdrawableAmount,
    );

    const actualDepositBAmount = computeActualDepositAmount(
      tokenBInAmount,
      this.poolInfo.tokenBAmount,
      this.accountsInfo.poolVaultBLp,
      this.accountsInfo.vaultBLpSupply,
      vaultBWithdrawableAmount,
    );

    const poolTokenAmountOut = this.swapCurve.computeImbalanceDeposit(
      actualDepositAAmount,
      actualDepositBAmount,
      this.poolInfo.tokenAAmount,
      this.poolInfo.tokenBAmount,
      this.accountsInfo.poolLpSupply,
      this.poolState.fees,
    );

    return {
      poolTokenAmountOut,
      minPoolTokenAmountOut: getMinAmountWithSlippage(poolTokenAmountOut, slippage),
      tokenAInAmount,
      tokenBInAmount,
    };
  }

  /**
   * `deposit` creates a transaction that deposits `tokenAInAmount` and `tokenBInAmount` into the pool,
   * and mints `poolTokenAmount` of the pool's liquidity token
   * @param {PublicKey} owner - PublicKey - The public key of the user who is depositing liquidity
   * @param {BN} tokenAInAmount - The amount of token A you want to deposit
   * @param {BN} tokenBInAmount - The amount of token B you want to deposit
   * @param {BN} poolTokenAmount - The amount of pool tokens you want to mint.
   * @returns A transaction object
   */
  public async deposit(
    owner: PublicKey,
    tokenAInAmount: BN,
    tokenBInAmount: BN,
    poolTokenAmount: BN,
  ): Promise<Transaction> {
    const { tokenAMint, tokenBMint, lpMint, lpSupply } = this.poolState;

    const [[userAToken, createTokenAIx], [userBToken, createTokenBIx], [userPoolLp, createLpMintIx]] =
      await this.createATAPreInstructions(owner, [tokenAMint, tokenBMint, lpMint]);

    let preInstructions: Array<TransactionInstruction> = [];
    createTokenAIx && preInstructions.push(createTokenAIx);
    createTokenBIx && preInstructions.push(createTokenBIx);
    createLpMintIx && preInstructions.push(createLpMintIx);

    if (NATIVE_MINT.equals(this.tokenAMint.address)) {
      preInstructions = preInstructions.concat(
        wrapSOLInstruction(owner, userAToken, BigInt(tokenAInAmount.toString())),
      );
    }
    if (NATIVE_MINT.equals(this.tokenBMint.address)) {
      preInstructions = preInstructions.concat(
        wrapSOLInstruction(owner, userBToken, BigInt(tokenBInAmount.toString())),
      );
    }

    const postInstructions: Array<TransactionInstruction> = [];
    if ([this.tokenAMint.address.toBase58(), this.tokenBMint.address.toBase58()].includes(NATIVE_MINT.toBase58())) {
      const closeWrappedSOLIx = await unwrapSOLInstruction(owner, owner);
      closeWrappedSOLIx && postInstructions.push(closeWrappedSOLIx);
    }

    const programMethod = () => {
      if (lpSupply.isZero()) return this.program.methods.bootstrapLiquidity(tokenAInAmount, tokenBInAmount);
      if (this.isStablePool)
        return this.program.methods.addImbalanceLiquidity(poolTokenAmount, tokenAInAmount, tokenBInAmount);

      return this.program.methods.addBalanceLiquidity(poolTokenAmount, tokenAInAmount, tokenBInAmount);
    };

    const depositTx = await programMethod()
      .accounts({
        aTokenVault: this.vaultA.vaultState.tokenVault,
        bTokenVault: this.vaultB.vaultState.tokenVault,
        aVault: this.poolState.aVault,
        bVault: this.poolState.bVault,
        pool: this.address,
        user: owner,
        userAToken,
        userBToken,
        aVaultLp: this.poolState.aVaultLp,
        bVaultLp: this.poolState.bVaultLp,
        aVaultLpMint: this.vaultA.vaultState.lpMint,
        bVaultLpMint: this.vaultB.vaultState.lpMint,
        lpMint: this.poolState.lpMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        vaultProgram: this.vaultProgram.programId,
        userPoolLp,
      })
      .remainingAccounts(this.swapCurve.getRemainingAccounts())
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .transaction();

    return new Transaction({
      feePayer: owner,
      ...(await this.program.provider.connection.getLatestBlockhash(this.program.provider.connection.commitment)),
    }).add(depositTx);
  }

  /**
   * `getWithdrawQuote` is a function that takes in a withdraw amount and returns the amount of tokens
   * that will be withdrawn from the pool
   * @param {BN} withdrawTokenAmount - The amount of tokens you want to withdraw from the pool.
   * @param {PublicKey} [tokenMint] - The token you want to withdraw. If you want balanced withdraw, leave this blank.
   * @param {number} [slippage] - The amount of slippage you're willing to accept. (Max to 2 decimal place)
   * @returns The return value is a tuple of the poolTokenAmountIn, tokenAOutAmount, and
   * tokenBOutAmount.
   */
  public getWithdrawQuote(withdrawTokenAmount: BN, slippage: number, tokenMint?: PublicKey): WithdrawQuote {
    const vaultAWithdrawableAmount = calculateWithdrawableAmount(
      this.accountsInfo.currentTime.toNumber(),
      this.vaultA.vaultState,
    );
    const vaultBWithdrawableAmount = calculateWithdrawableAmount(
      this.accountsInfo.currentTime.toNumber(),
      this.vaultB.vaultState,
    );

    // balance withdraw
    if (!tokenMint) {
      const vaultALpBurn = this.getShareByAmount(
        withdrawTokenAmount,
        this.accountsInfo.poolLpSupply,
        this.accountsInfo.poolVaultALp,
      );
      const vaultBLpBurn = this.getShareByAmount(
        withdrawTokenAmount,
        this.accountsInfo.poolLpSupply,
        this.accountsInfo.poolVaultBLp,
      );

      const tokenAOutAmount = this.getAmountByShare(
        vaultALpBurn,
        vaultAWithdrawableAmount,
        this.accountsInfo.vaultALpSupply,
      );
      const tokenBOutAmount = this.getAmountByShare(
        vaultBLpBurn,
        vaultBWithdrawableAmount,
        this.accountsInfo.vaultBLpSupply,
      );

      return {
        poolTokenAmountIn: withdrawTokenAmount,
        tokenAOutAmount,
        tokenBOutAmount,
        minTokenAOutAmount: getMinAmountWithSlippage(tokenAOutAmount, slippage),
        minTokenBOutAmount: getMinAmountWithSlippage(tokenBOutAmount, slippage),
      };
    }

    // Imbalance withdraw
    const isWithdrawingTokenA = tokenMint.equals(this.tokenAMint.address);
    const isWithdrawingTokenB = tokenMint.equals(this.tokenBMint.address);
    invariant(isWithdrawingTokenA || isWithdrawingTokenB, ERROR.INVALID_MINT);

    const tradeDirection = tokenMint.equals(this.poolState.tokenAMint) ? TradeDirection.BToA : TradeDirection.AToB;

    const outAmount = this.swapCurve.computeWithdrawOne(
      withdrawTokenAmount,
      this.accountsInfo.poolLpSupply,
      this.poolInfo.tokenAAmount,
      this.poolInfo.tokenBAmount,
      this.poolState.fees,
      tradeDirection,
    );

    const [vaultLpSupply, vaultTotalAmount] =
      tradeDirection == TradeDirection.AToB
        ? [this.accountsInfo.vaultBLpSupply, vaultBWithdrawableAmount]
        : [this.accountsInfo.vaultALpSupply, vaultAWithdrawableAmount];

    const vaultLpToBurn = outAmount.mul(vaultLpSupply).div(vaultTotalAmount);
    // "Actual" out amount (precision loss)
    const realOutAmount = vaultLpToBurn.mul(vaultTotalAmount).div(vaultLpSupply);
    const minRealOutAmount = getMinAmountWithSlippage(realOutAmount, slippage);

    return {
      poolTokenAmountIn: withdrawTokenAmount,
      tokenAOutAmount: isWithdrawingTokenA ? realOutAmount : new BN(0),
      tokenBOutAmount: isWithdrawingTokenB ? realOutAmount : new BN(0),
      minTokenAOutAmount: isWithdrawingTokenA ? minRealOutAmount : new BN(0),
      minTokenBOutAmount: isWithdrawingTokenB ? minRealOutAmount : new BN(0),
    };
  }

  /**
   * `withdraw` is a function that takes in the owner's public key, the amount of tokens to withdraw,
   * and the amount of tokens to withdraw from each pool, and returns a transaction that withdraws the
   * specified amount of tokens from the pool
   * @param {PublicKey} owner - PublicKey - The public key of the user who is withdrawing liquidity
   * @param {BN} lpTokenAmount - The amount of LP tokens to withdraw.
   * @param {BN} tokenAOutAmount - The amount of token A you want to withdraw.
   * @param {BN} tokenBOutAmount - The amount of token B you want to withdraw,
   * @returns A transaction object
   */
  public async withdraw(
    owner: PublicKey,
    lpTokenAmount: BN,
    tokenAOutAmount: BN,
    tokenBOutAmount: BN,
  ): Promise<Transaction> {
    const preInstructions: Array<TransactionInstruction> = [];
    const [[userAToken, createUserAIx], [userBToken, createUserBIx], [userPoolLp, createLpTokenIx]] = await Promise.all(
      [this.poolState.tokenAMint, this.poolState.tokenBMint, this.poolState.lpMint].map((key) =>
        getOrCreateATAInstruction(key, owner, this.program.provider.connection),
      ),
    );

    createUserAIx && preInstructions.push(createUserAIx);
    createUserBIx && preInstructions.push(createUserBIx);
    createLpTokenIx && preInstructions.push(createLpTokenIx);

    const postInstructions: Array<TransactionInstruction> = [];
    if ([this.tokenAMint.address.toBase58(), this.tokenBMint.address.toBase58()].includes(NATIVE_MINT.toBase58())) {
      const closeWrappedSOLIx = await unwrapSOLInstruction(owner, owner);
      closeWrappedSOLIx && postInstructions.push(closeWrappedSOLIx);
    }

    const programMethod =
      this.isStablePool && (tokenAOutAmount.isZero() || tokenBOutAmount.isZero())
        ? this.program.methods.removeLiquiditySingleSide(lpTokenAmount, new BN(0)).accounts({
            aTokenVault: this.vaultA.vaultState.tokenVault,
            aVault: this.poolState.aVault,
            aVaultLp: this.poolState.aVaultLp,
            aVaultLpMint: this.vaultA.vaultState.lpMint,
            bTokenVault: this.vaultB.vaultState.tokenVault,
            bVault: this.poolState.bVault,
            bVaultLp: this.poolState.bVaultLp,
            bVaultLpMint: this.vaultB.vaultState.lpMint,
            lpMint: this.poolState.lpMint,
            pool: this.address,
            userDestinationToken: tokenBOutAmount.isZero() ? userAToken : userBToken,
            userPoolLp,
            user: owner,
            tokenProgram: TOKEN_PROGRAM_ID,
            vaultProgram: this.vaultProgram.programId,
          })
        : this.program.methods.removeBalanceLiquidity(lpTokenAmount, tokenAOutAmount, tokenBOutAmount).accounts({
            pool: this.address,
            lpMint: this.poolState.lpMint,
            aVault: this.poolState.aVault,
            aTokenVault: this.vaultA.vaultState.tokenVault,
            aVaultLp: this.poolState.aVaultLp,
            aVaultLpMint: this.vaultA.vaultState.lpMint,
            bVault: this.poolState.bVault,
            bTokenVault: this.vaultB.vaultState.tokenVault,
            bVaultLp: this.poolState.bVaultLp,
            bVaultLpMint: this.vaultB.vaultState.lpMint,
            userAToken,
            userBToken,
            user: owner,
            userPoolLp,
            tokenProgram: TOKEN_PROGRAM_ID,
            vaultProgram: this.vaultProgram.programId,
          });

    const withdrawTx = await programMethod
      .remainingAccounts(this.swapCurve.getRemainingAccounts())
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .transaction();

    return new Transaction({
      feePayer: owner,
      ...(await this.program.provider.connection.getLatestBlockhash(this.program.provider.connection.commitment)),
    }).add(withdrawTx);
  }

  public async getUserLockEscrow(owner: PublicKey): Promise<LockEscrow | null> {
    const [lockEscrowPK] = deriveLockEscrowPda(this.address, owner, this.program.programId);
    const lockEscrowAccount = await this.program.account.lockEscrow.fetchNullable(lockEscrowPK);
    if (!lockEscrowAccount) return null;

    const lockEscrowVault = await this.program.provider.connection.getTokenAccountBalance(
      lockEscrowAccount.escrowVault,
    );

    const [lockEscrow, _lockEscrowBump] = deriveLockEscrowPda(this.address, owner, this.program.programId);
    const unClaimedFee = calculateUnclaimedLockEscrowFee(
      lockEscrowAccount.totalLockedAmount,
      lockEscrowAccount.lpPerToken,
      lockEscrowAccount.unclaimedFeePending,
      this.poolInfo.virtualPriceRaw,
    );
    // Patch the bug from v1 impl
    const escrowVaultAmount = new BN(lockEscrowVault.value.amount);
    const unclaimedFeeCap = unClaimedFee.gt(escrowVaultAmount) ? escrowVaultAmount : unClaimedFee;

    const { tokenAOutAmount, tokenBOutAmount } = this.getWithdrawQuote(unclaimedFeeCap, 0);
    return {
      address: lockEscrow,
      amount: lockEscrowAccount.totalLockedAmount || new BN(0),
      fee: {
        claimed: {
          tokenA: lockEscrowAccount.aFee || new BN(0),
          tokenB: lockEscrowAccount.bFee || new BN(0),
        },
        unClaimed: {
          lp: unclaimedFeeCap,
          tokenA: tokenAOutAmount || new BN(0),
          tokenB: tokenBOutAmount || new BN(0),
        },
      },
    };
  }

  /**
   * `lockLiquidity` is a function that lock liquidity in Meteora pool, owner is able to claim fee later,
   * @param {PublicKey} owner - PublicKey - The public key of the escrow's owner, who get the locked liquidity, and can claim fee later
   * @param {BN} amount - The amount of LP tokens to lock.
   * @param {BN} feePayer - The payer of that lock liquidity.
   * @returns A transaction object
   */
  public async lockLiquidity(
    owner: PublicKey,
    amount: BN,
    feePayer?: PublicKey,
    opt?: {
      stakeLiquidity?: {
        ratio?: Decimal;
      };
    },
  ): Promise<Transaction> {
    const payer = feePayer ? feePayer : owner;
    const [lockEscrowPK] = deriveLockEscrowPda(this.address, owner, this.program.programId);

    const preInstructions: TransactionInstruction[] = [];
    const stakeForFeeInstructions: Array<TransactionInstruction> = [];

    const lockEscrowAccount = await this.program.account.lockEscrow.fetchNullable(lockEscrowPK);
    if (!lockEscrowAccount) {
      const createLockEscrowIx = await this.program.methods
        .createLockEscrow()
        .accounts({
          pool: this.address,
          lockEscrow: lockEscrowPK,
          owner,
          lpMint: this.poolState.lpMint,
          payer,
          systemProgram: SystemProgram.programId,
        })
        .instruction();
      preInstructions.push(createLockEscrowIx);
    }

    const [[userAta, createUserAtaIx], [escrowAta, createEscrowAtaIx]] = await Promise.all([
      getOrCreateATAInstruction(this.poolState.lpMint, payer, this.program.provider.connection, payer),
      getOrCreateATAInstruction(this.poolState.lpMint, lockEscrowPK, this.program.provider.connection, payer),
    ]);

    createUserAtaIx && preInstructions.push(createUserAtaIx);
    createEscrowAtaIx && preInstructions.push(createEscrowAtaIx);

    const { userLockAmount, feeWrapperLockAmount } = calculateLockAmounts(amount, opt?.stakeLiquidity?.ratio);

    if (feeWrapperLockAmount.gt(new BN(0))) {
      const { stakeForFeeProgram } = createProgram(this.program.provider.connection);

      const vaultKey = deriveFeeVault(this.address, STAKE_FOR_FEE_PROGRAM_ID);
      const vaultState = await getFeeVaultState(vaultKey, stakeForFeeProgram);

      if (!vaultState) {
        throw new Error(`Fee vault not found for pool ${this.address.toBase58()}`);
      }

      const [lockEscrowFeeVaultPK] = deriveLockEscrowPda(this.address, vaultKey, this.program.programId);

      const [escrowFeeVaultAta, createEscrowFeeVaultAtaIx] = await getOrCreateATAInstruction(
        this.poolState.lpMint,
        lockEscrowFeeVaultPK,
        this.program.provider.connection,
        payer,
      );

      createEscrowFeeVaultAtaIx && stakeForFeeInstructions.push(createEscrowFeeVaultAtaIx);

      const lockTx = await this.program.methods
        .lock(feeWrapperLockAmount)
        .accounts({
          pool: this.address,
          lockEscrow: lockEscrowFeeVaultPK,
          owner: payer,
          lpMint: this.poolState.lpMint,
          sourceTokens: userAta,
          escrowVault: escrowFeeVaultAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          aVault: this.poolState.aVault,
          bVault: this.poolState.bVault,
          aVaultLp: this.poolState.aVaultLp,
          bVaultLp: this.poolState.bVaultLp,
          aVaultLpMint: this.vaultA.vaultState.lpMint,
          bVaultLpMint: this.vaultB.vaultState.lpMint,
        })
        .instruction();

      stakeForFeeInstructions.push(lockTx);
    }

    const transaction = new Transaction({
      feePayer: payer,
      ...(await this.program.provider.connection.getLatestBlockhash(this.program.provider.connection.commitment)),
    });

    if (userLockAmount.gt(new BN(0))) {
      const lockTx = await this.program.methods
        .lock(userLockAmount)
        .accounts({
          pool: this.address,
          lockEscrow: lockEscrowPK,
          owner: payer,
          lpMint: this.poolState.lpMint,
          sourceTokens: userAta,
          escrowVault: escrowAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          aVault: this.poolState.aVault,
          bVault: this.poolState.bVault,
          aVaultLp: this.poolState.aVaultLp,
          bVaultLp: this.poolState.bVaultLp,
          aVaultLpMint: this.vaultA.vaultState.lpMint,
          bVaultLpMint: this.vaultB.vaultState.lpMint,
        })
        .postInstructions(stakeForFeeInstructions)
        .preInstructions(preInstructions)
        .transaction();

      return transaction.add(lockTx);
    }

    return transaction.add(...stakeForFeeInstructions);
  }

  private async claimWithQuoteMintSol({
    owner,
    payer,
    receiver,
    tempWSolAcc,
    lockEscrowPK,
  }: {
    owner: PublicKey;
    payer: PublicKey;
    receiver: PublicKey;
    tempWSolAcc: PublicKey;
    lockEscrowPK: PublicKey;
  }): Promise<{
    accounts: {
      pool: PublicKey;
      lockEscrow: PublicKey;
      owner: PublicKey;
      lpMint: PublicKey;
      sourceTokens: PublicKey;
      escrowVault: PublicKey;
      tokenProgram: PublicKey;
      aVault: PublicKey;
      bVault: PublicKey;
      aVaultLp: PublicKey;
      bVaultLp: PublicKey;
      aVaultLpMint: PublicKey;
      bVaultLpMint: PublicKey;
      vaultProgram: PublicKey;
      aTokenVault: PublicKey;
      bTokenVault: PublicKey;
      userAToken: PublicKey;
      userBToken: PublicKey;
    };
    preInstructions: TransactionInstruction[];
    postInstructions: TransactionInstruction[];
  }> {
    const preInstructions: TransactionInstruction[] = [];
    const postInstructions: TransactionInstruction[] = [];

    const isTokenAMintNative = this.poolState.tokenAMint.toBase58() === NATIVE_MINT.toBase58();
    const isTokenBMintNative = this.poolState.tokenBMint.toBase58() === NATIVE_MINT.toBase58();

    const [
      [userAta, createUserAtaIx],
      [escrowAta, createEscrowAtaIx],
      [tokenAAta, createTokenAAtaIx],
      [tokenBAta, createTokenBAtaIx],
    ] = await Promise.all([
      getOrCreateATAInstruction(this.poolState.lpMint, owner, this.program.provider.connection, payer),
      getOrCreateATAInstruction(this.poolState.lpMint, lockEscrowPK, this.program.provider.connection, payer),
      getOrCreateATAInstruction(
        this.poolState.tokenAMint,
        isTokenAMintNative ? tempWSolAcc : receiver,
        this.program.provider.connection,
        payer,
      ),
      getOrCreateATAInstruction(
        this.poolState.tokenBMint,
        isTokenBMintNative ? tempWSolAcc : receiver,
        this.program.provider.connection,
        payer,
      ),
    ]);
    createUserAtaIx && preInstructions.push(createUserAtaIx);
    createEscrowAtaIx && preInstructions.push(createEscrowAtaIx);
    createTokenAAtaIx && preInstructions.push(createTokenAAtaIx);
    createTokenBAtaIx && preInstructions.push(createTokenBAtaIx);

    const closeWrappedSOLIx = await unwrapSOLInstruction(tempWSolAcc, receiver);
    closeWrappedSOLIx && postInstructions.push(closeWrappedSOLIx);

    const accounts = {
      pool: this.address,
      lockEscrow: lockEscrowPK,
      owner,
      lpMint: this.poolState.lpMint,
      sourceTokens: userAta,
      escrowVault: escrowAta,
      tokenProgram: TOKEN_PROGRAM_ID,
      aVault: this.poolState.aVault,
      bVault: this.poolState.bVault,
      aVaultLp: this.poolState.aVaultLp,
      bVaultLp: this.poolState.bVaultLp,
      aVaultLpMint: this.vaultA.vaultState.lpMint,
      bVaultLpMint: this.vaultB.vaultState.lpMint,
      vaultProgram: this.vaultProgram.programId,
      aTokenVault: this.vaultA.vaultState.tokenVault,
      bTokenVault: this.vaultB.vaultState.tokenVault,
      userAToken: tokenAAta,
      userBToken: tokenBAta,
    };

    return { accounts, preInstructions, postInstructions };
  }

  private async claimWithQuoteMintNotSol({
    owner,
    payer,
    receiver,
    lockEscrowPK,
  }: {
    owner: PublicKey;
    payer: PublicKey;
    receiver: PublicKey;
    lockEscrowPK: PublicKey;
  }): Promise<{
    accounts: {
      pool: PublicKey;
      lockEscrow: PublicKey;
      owner: PublicKey;
      lpMint: PublicKey;
      sourceTokens: PublicKey;
      escrowVault: PublicKey;
      tokenProgram: PublicKey;
      aVault: PublicKey;
      bVault: PublicKey;
      aVaultLp: PublicKey;
      bVaultLp: PublicKey;
      aVaultLpMint: PublicKey;
      bVaultLpMint: PublicKey;
      vaultProgram: PublicKey;
      aTokenVault: PublicKey;
      bTokenVault: PublicKey;
      userAToken: PublicKey;
      userBToken: PublicKey;
    };
    preInstructions: TransactionInstruction[];
  }> {
    const preInstructions: TransactionInstruction[] = [];

    const [
      [userAta, createUserAtaIx],
      [escrowAta, createEscrowAtaIx],
      [tokenAAta, createTokenAAtaIx],
      [tokenBAta, createTokenBAtaIx],
    ] = await Promise.all([
      getOrCreateATAInstruction(this.poolState.lpMint, owner, this.program.provider.connection, payer),
      getOrCreateATAInstruction(this.poolState.lpMint, lockEscrowPK, this.program.provider.connection, payer),
      getOrCreateATAInstruction(this.poolState.tokenAMint, receiver, this.program.provider.connection, payer),
      getOrCreateATAInstruction(this.poolState.tokenBMint, receiver, this.program.provider.connection, payer),
    ]);
    createUserAtaIx && preInstructions.push(createUserAtaIx);
    createEscrowAtaIx && preInstructions.push(createEscrowAtaIx);
    createTokenAAtaIx && preInstructions.push(createTokenAAtaIx);
    createTokenBAtaIx && preInstructions.push(createTokenBAtaIx);

    const accounts = {
      pool: this.address,
      lockEscrow: lockEscrowPK,
      owner,
      lpMint: this.poolState.lpMint,
      sourceTokens: userAta,
      escrowVault: escrowAta,
      tokenProgram: TOKEN_PROGRAM_ID,
      aVault: this.poolState.aVault,
      bVault: this.poolState.bVault,
      aVaultLp: this.poolState.aVaultLp,
      bVaultLp: this.poolState.bVaultLp,
      aVaultLpMint: this.vaultA.vaultState.lpMint,
      bVaultLpMint: this.vaultB.vaultState.lpMint,
      vaultProgram: this.vaultProgram.programId,
      aTokenVault: this.vaultA.vaultState.tokenVault,
      bTokenVault: this.vaultB.vaultState.tokenVault,
      userAToken: tokenAAta,
      userBToken: tokenBAta,
    };

    return { accounts, preInstructions };
  }

  public async claimLockFee(
    owner: PublicKey,
    maxAmount: BN,
    payer: PublicKey,
    receiver?: PublicKey,
    tempWSolAcc?: PublicKey,
  ): Promise<Transaction> {
    const [lockEscrowPK] = deriveLockEscrowPda(this.address, owner, this.program.programId);

    const isTokenAOrBNative =
      this.poolState.tokenAMint.toBase58() === NATIVE_MINT.toBase58() ||
      this.poolState.tokenBMint.toBase58() === NATIVE_MINT.toBase58();

    let tx: Transaction;

    if (isTokenAOrBNative) {
      const tempWSol = receiver && !receiver.equals(owner) ? tempWSolAcc : owner;
      const feeReceiver = receiver ? receiver : owner;

      const result = await this.claimWithQuoteMintSol({
        owner,
        payer,
        receiver: feeReceiver,
        tempWSolAcc: tempWSol!,
        lockEscrowPK,
      });

      tx = await this.program.methods
        .claimFee(maxAmount)
        .accounts(result.accounts)
        .preInstructions(result.preInstructions)
        .postInstructions(result.postInstructions)
        .transaction();
    } else {
      const feeReceiver = receiver ? receiver : owner;

      const result = await this.claimWithQuoteMintNotSol({
        owner,
        payer,
        receiver: feeReceiver,
        lockEscrowPK,
      });

      tx = await this.program.methods
        .claimFee(maxAmount)
        .accounts(result.accounts)
        .preInstructions(result.preInstructions)
        .transaction();
    }

    return new Transaction({
      feePayer: payer,
      ...(await this.program.provider.connection.getLatestBlockhash(this.program.provider.connection.commitment)),
    }).add(tx);
  }

  /**
   * `moveLockedLP` transfers locked LP tokens from one owner's escrow to another owner's escrow.
   * If the new owner does not have an existing lock escrow, it creates one.
   *
   * @param {PublicKey} owner - The public key of the current owner of the locked LP tokens.
   * @param {PublicKey} newOwner - The public key of the new owner to transfer the locked LP tokens to.
   * @param {BN} maxAmount - The maximum amount of LP tokens to transfer.
   * @param {PublicKey} [payer] - Optional. The public key of the payer for the transaction fees. Defaults to the current owner.
   * @returns {Promise<Transaction>} A promise that resolves to a transaction object for the locked LP token transfer.
   */
  public async moveLockedLP(
    owner: PublicKey,
    newOwner: PublicKey,
    maxAmount: BN,
    payer?: PublicKey,
  ): Promise<Transaction> {
    payer = payer ?? owner;

    const [ownerLockEscrowPK] = deriveLockEscrowPda(this.address, owner, this.program.programId);
    const [newOwnerLockEscrowPK] = deriveLockEscrowPda(this.address, newOwner, this.program.programId);

    const preInstructions: TransactionInstruction[] = [];

    const newOwnerLockEscrow = this.program.account.lockEscrow.fetchNullable(newOwnerLockEscrowPK);

    if (!newOwnerLockEscrow) {
      const createLockEscrowIx = await this.program.methods
        .createLockEscrow()
        .accounts({
          pool: this.address,
          lockEscrow: newOwnerLockEscrowPK,
          owner: newOwner,
          lpMint: this.poolState.lpMint,
          payer,
          systemProgram: SystemProgram.programId,
        })
        .instruction();
      preInstructions.push(createLockEscrowIx);
    }

    const fromEscrowVault = getAssociatedTokenAddressSync(this.poolState.lpMint, ownerLockEscrowPK);

    const [toEscrowVault, createToEscrowVaultIx] = await getOrCreateATAInstruction(
      this.poolState.lpMint,
      newOwnerLockEscrowPK,
      this.program.provider.connection,
      payer,
    );

    createToEscrowVaultIx && preInstructions.push(createToEscrowVaultIx);

    const tx = await this.program.methods
      .moveLockedLp(maxAmount)
      .accounts({
        pool: this.address,
        fromLockEscrow: ownerLockEscrowPK,
        toLockEscrow: newOwnerLockEscrowPK,
        fromEscrowVault,
        toEscrowVault,
        owner,
        lpMint: this.poolState.lpMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        aVault: this.poolState.aVault,
        bVault: this.poolState.bVault,
        aVaultLp: this.poolState.aVaultLp,
        bVaultLp: this.poolState.bVaultLp,
        aVaultLpMint: this.vaultA.vaultState.lpMint,
        bVaultLpMint: this.vaultB.vaultState.lpMint,
      })
      .preInstructions(preInstructions)
      .transaction();

    const transaction = new Transaction({
      feePayer: payer,
      ...(await this.program.provider.connection.getLatestBlockhash(this.program.provider.connection.commitment)),
    }).add(tx);

    return transaction;
  }

  private async createATAPreInstructions(owner: PublicKey, mintList: Array<PublicKey>) {
    return Promise.all(
      mintList.map((mint) => {
        return getOrCreateATAInstruction(mint, owner, this.program.provider.connection);
      }),
    );
  }

  private calculateProtocolTradingFee(amount: BN): BN {
    const { protocolTradeFeeDenominator, protocolTradeFeeNumerator } = this.poolState.fees;
    return amount.mul(protocolTradeFeeNumerator).div(protocolTradeFeeDenominator);
  }

  private calculateTradingFee(amount: BN): BN {
    const { tradeFeeDenominator, tradeFeeNumerator } = this.poolState.fees;
    return amount.mul(tradeFeeNumerator).div(tradeFeeDenominator);
  }

  private computeActualInAmount(
    poolTokenAmount: BN,
    poolLpSupply: BN,
    poolVaultALp: BN,
    poolVaultBLp: BN,
    vaultALpSupply: BN,
    vaultBLpSupply: BN,
    vaultAWithdrawableAmount: BN,
    vaultBWithdrawableAmount: BN,
  ): [BN, BN] {
    const aVaultLpMinted = this.getShareByAmount(poolTokenAmount, poolLpSupply, poolVaultALp, true);
    const bVaultLpMinted = this.getShareByAmount(poolTokenAmount, poolLpSupply, poolVaultBLp, true);

    const actualTokenAInAmount = this.getAmountByShare(aVaultLpMinted, vaultAWithdrawableAmount, vaultALpSupply, true);
    const actualTokenBInAmount = this.getAmountByShare(bVaultLpMinted, vaultBWithdrawableAmount, vaultBLpSupply, true);

    return [actualTokenAInAmount, actualTokenBInAmount];
  }

  private getShareByAmount(amount: BN, tokenAmount: BN, lpSupply: BN, roundUp?: boolean): BN {
    if (tokenAmount.isZero()) return new BN(0);

    return roundUp ? amount.mul(lpSupply).divRound(tokenAmount) : amount.mul(lpSupply).div(tokenAmount);
  }

  private getAmountByShare(amount: BN, tokenAmount: BN, lpSupply: BN, roundUp?: boolean): BN {
    if (lpSupply.isZero()) return new BN(0);

    return roundUp ? amount.mul(tokenAmount).divRound(lpSupply) : amount.mul(tokenAmount).div(lpSupply);
  }
}
