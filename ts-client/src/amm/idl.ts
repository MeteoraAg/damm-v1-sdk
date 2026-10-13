/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/amm.json`.
 */
export type Amm = {
  address: 'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB';
  metadata: {
    name: 'amm';
    version: '0.5.7';
    spec: '0.1.0';
    description: 'Mercurial Dynamic AMM';
  };
  docs: ['Program for AMM'];
  instructions: [
    {
      name: 'addBalanceLiquidity';
      docs: ['Deposit tokens to the pool in a balanced ratio.'];
      discriminator: [168, 227, 50, 62, 189, 171, 84, 176];
      accounts: [
        {
          name: 'pool';
          docs: ['Pool account (PDA)'];
          writable: true;
        },
        {
          name: 'lpMint';
          docs: ['LP token mint of the pool'];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'userPoolLp';
          docs: ['user pool lp token account. lp will be burned from this account upon success liquidity removal.'];
          writable: true;
        },
        {
          name: 'aVaultLp';
          docs: [
            'LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
          ];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'bVaultLp';
          docs: [
            'LP token account of vault B. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
          ];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'aVault';
          docs: ['Vault account for token a. token a of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'bVault';
          docs: ['Vault account for token b. token b of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'aVaultLpMint';
          docs: ['LP token mint of vault a'];
          writable: true;
        },
        {
          name: 'bVaultLpMint';
          docs: ['LP token mint of vault b'];
          writable: true;
        },
        {
          name: 'aTokenVault';
          docs: ['Token vault account of vault A'];
          writable: true;
        },
        {
          name: 'bTokenVault';
          docs: ['Token vault account of vault B'];
          writable: true;
        },
        {
          name: 'userAToken';
          docs: [
            'User token A account. Token will be transfer from this account if it is add liquidity operation. Else, token will be transfer into this account.',
          ];
          writable: true;
        },
        {
          name: 'userBToken';
          docs: [
            'User token B account. Token will be transfer from this account if it is add liquidity operation. Else, token will be transfer into this account.',
          ];
          writable: true;
        },
        {
          name: 'user';
          docs: ['User account. Must be owner of user_a_token, and user_b_token.'];
          signer: true;
        },
        {
          name: 'vaultProgram';
          docs: ['Vault program. the pool will deposit/withdraw liquidity from the vault.'];
          address: '24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi';
        },
        {
          name: 'tokenProgram';
          docs: ['Token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
      ];
      args: [
        {
          name: 'poolTokenAmount';
          type: 'u64';
        },
        {
          name: 'maximumTokenAAmount';
          type: 'u64';
        },
        {
          name: 'maximumTokenBAmount';
          type: 'u64';
        },
      ];
    },
    {
      name: 'addImbalanceLiquidity';
      docs: ['Deposit tokens to the pool in an imbalance ratio. Only supported by pool with stable swap curve.'];
      discriminator: [79, 35, 122, 84, 173, 15, 93, 191];
      accounts: [
        {
          name: 'pool';
          docs: ['Pool account (PDA)'];
          writable: true;
        },
        {
          name: 'lpMint';
          docs: ['LP token mint of the pool'];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'userPoolLp';
          docs: ['user pool lp token account. lp will be burned from this account upon success liquidity removal.'];
          writable: true;
        },
        {
          name: 'aVaultLp';
          docs: [
            'LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
          ];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'bVaultLp';
          docs: [
            'LP token account of vault B. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
          ];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'aVault';
          docs: ['Vault account for token a. token a of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'bVault';
          docs: ['Vault account for token b. token b of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'aVaultLpMint';
          docs: ['LP token mint of vault a'];
          writable: true;
        },
        {
          name: 'bVaultLpMint';
          docs: ['LP token mint of vault b'];
          writable: true;
        },
        {
          name: 'aTokenVault';
          docs: ['Token vault account of vault A'];
          writable: true;
        },
        {
          name: 'bTokenVault';
          docs: ['Token vault account of vault B'];
          writable: true;
        },
        {
          name: 'userAToken';
          docs: [
            'User token A account. Token will be transfer from this account if it is add liquidity operation. Else, token will be transfer into this account.',
          ];
          writable: true;
        },
        {
          name: 'userBToken';
          docs: [
            'User token B account. Token will be transfer from this account if it is add liquidity operation. Else, token will be transfer into this account.',
          ];
          writable: true;
        },
        {
          name: 'user';
          docs: ['User account. Must be owner of user_a_token, and user_b_token.'];
          signer: true;
        },
        {
          name: 'vaultProgram';
          docs: ['Vault program. the pool will deposit/withdraw liquidity from the vault.'];
          address: '24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi';
        },
        {
          name: 'tokenProgram';
          docs: ['Token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
      ];
      args: [
        {
          name: 'minimumPoolTokenAmount';
          type: 'u64';
        },
        {
          name: 'tokenAAmount';
          type: 'u64';
        },
        {
          name: 'tokenBAmount';
          type: 'u64';
        },
      ];
    },
    {
      name: 'bootstrapLiquidity';
      docs: ['Bootstrap the pool when liquidity is depleted.'];
      discriminator: [4, 228, 215, 71, 225, 253, 119, 206];
      accounts: [
        {
          name: 'pool';
          docs: ['Pool account (PDA)'];
          writable: true;
        },
        {
          name: 'lpMint';
          docs: ['LP token mint of the pool'];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'userPoolLp';
          docs: ['user pool lp token account. lp will be burned from this account upon success liquidity removal.'];
          writable: true;
        },
        {
          name: 'aVaultLp';
          docs: [
            'LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
          ];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'bVaultLp';
          docs: [
            'LP token account of vault B. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
          ];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'aVault';
          docs: ['Vault account for token a. token a of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'bVault';
          docs: ['Vault account for token b. token b of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'aVaultLpMint';
          docs: ['LP token mint of vault a'];
          writable: true;
        },
        {
          name: 'bVaultLpMint';
          docs: ['LP token mint of vault b'];
          writable: true;
        },
        {
          name: 'aTokenVault';
          docs: ['Token vault account of vault A'];
          writable: true;
        },
        {
          name: 'bTokenVault';
          docs: ['Token vault account of vault B'];
          writable: true;
        },
        {
          name: 'userAToken';
          docs: [
            'User token A account. Token will be transfer from this account if it is add liquidity operation. Else, token will be transfer into this account.',
          ];
          writable: true;
        },
        {
          name: 'userBToken';
          docs: [
            'User token B account. Token will be transfer from this account if it is add liquidity operation. Else, token will be transfer into this account.',
          ];
          writable: true;
        },
        {
          name: 'user';
          docs: ['User account. Must be owner of user_a_token, and user_b_token.'];
          signer: true;
        },
        {
          name: 'vaultProgram';
          docs: ['Vault program. the pool will deposit/withdraw liquidity from the vault.'];
          address: '24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi';
        },
        {
          name: 'tokenProgram';
          docs: ['Token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
      ];
      args: [
        {
          name: 'tokenAAmount';
          type: 'u64';
        },
        {
          name: 'tokenBAmount';
          type: 'u64';
        },
      ];
    },
    {
      name: 'claimFee';
      docs: ['Claim fee'];
      discriminator: [169, 32, 79, 137, 136, 232, 70, 137];
      accounts: [
        {
          name: 'pool';
          docs: ['Pool account'];
          writable: true;
          relations: ['lockEscrow'];
        },
        {
          name: 'lpMint';
          docs: ['LP token mint of the pool'];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'lockEscrow';
          docs: ['Lock account'];
          writable: true;
        },
        {
          name: 'owner';
          docs: ['Owner of lock account'];
          writable: true;
          signer: true;
          relations: ['lockEscrow'];
        },
        {
          name: 'sourceTokens';
          docs: ['owner lp token account'];
          writable: true;
        },
        {
          name: 'escrowVault';
          docs: ['Escrow vault'];
          writable: true;
          relations: ['lockEscrow'];
        },
        {
          name: 'tokenProgram';
          docs: ['Token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'aTokenVault';
          docs: ['Token vault account of vault A'];
          writable: true;
        },
        {
          name: 'bTokenVault';
          docs: ['Token vault account of vault B'];
          writable: true;
        },
        {
          name: 'aVault';
          docs: ['Vault account for token a. token a of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'bVault';
          docs: ['Vault account for token b. token b of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'aVaultLp';
          docs: [
            'LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
          ];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'bVaultLp';
          docs: [
            'LP token account of vault B. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
          ];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'aVaultLpMint';
          docs: ['LP token mint of vault a'];
          writable: true;
        },
        {
          name: 'bVaultLpMint';
          docs: ['LP token mint of vault b'];
          writable: true;
        },
        {
          name: 'userAToken';
          docs: [
            'User token A account. Token will be transfer from this account if it is add liquidity operation. Else, token will be transfer into this account.',
          ];
          writable: true;
        },
        {
          name: 'userBToken';
          docs: [
            'User token B account. Token will be transfer from this account if it is add liquidity operation. Else, token will be transfer into this account.',
          ];
          writable: true;
        },
        {
          name: 'vaultProgram';
          docs: ['Vault program. the pool will deposit/withdraw liquidity from the vault.'];
          address: '24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi';
        },
      ];
      args: [
        {
          name: 'maxAmount';
          type: 'u64';
        },
      ];
    },
    {
      name: 'claimProtocolFee2';
      docs: ['Claim protocol fee 2'];
      discriminator: [235, 194, 54, 69, 65, 10, 236, 112];
      accounts: [
        {
          name: 'receiverTokenAccount';
          docs: ['Receiver token account for the claimed token. Validated through the protocol_fee program.'];
          writable: true;
        },
        {
          name: 'tokenAMint';
          relations: ['pool'];
        },
        {
          name: 'tokenBMint';
          relations: ['pool'];
        },
        {
          name: 'tokenAProgram';
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'tokenBProgram';
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'pool';
          docs: ['Pool account (PDA)'];
        },
        {
          name: 'protocolTokenAFee';
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'protocolTokenBFee';
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'aVaultLp';
          relations: ['pool'];
        },
        {
          name: 'signer';
          signer: true;
          address: 'FkU5rQCWQM131skHCpcEbK8P1JrQGsBgqXe55w525SSF';
        },
      ];
      args: [
        {
          name: 'maxAmount';
          type: 'u64';
        },
      ];
    },
    {
      name: 'closeConfig';
      docs: ['Close config'];
      discriminator: [145, 9, 72, 157, 95, 125, 61, 85];
      accounts: [
        {
          name: 'config';
          writable: true;
        },
        {
          name: 'admin';
          writable: true;
          signer: true;
        },
        {
          name: 'rentReceiver';
          writable: true;
        },
      ];
      args: [];
    },
    {
      name: 'closeOperatorAccount';
      docs: ['Close operator account'];
      discriminator: [171, 9, 213, 74, 120, 23, 3, 29];
      accounts: [
        {
          name: 'operator';
          writable: true;
        },
        {
          name: 'signer';
          signer: true;
        },
        {
          name: 'rentReceiver';
          writable: true;
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [95, 95, 101, 118, 101, 110, 116, 95, 97, 117, 116, 104, 111, 114, 105, 116, 121];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [];
    },
    {
      name: 'createConfig';
      docs: ['Create config'];
      discriminator: [201, 207, 243, 114, 75, 111, 47, 189];
      accounts: [
        {
          name: 'config';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [99, 111, 110, 102, 105, 103];
              },
              {
                kind: 'arg';
                path: 'config_parameters.index';
              },
            ];
          };
        },
        {
          name: 'admin';
          writable: true;
          signer: true;
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'configParameters';
          type: {
            defined: {
              name: 'configParameters';
            };
          };
        },
      ];
    },
    {
      name: 'createLockEscrow';
      docs: ['Create lock account'];
      discriminator: [54, 87, 165, 19, 69, 227, 218, 224];
      accounts: [
        {
          name: 'pool';
          docs: ['Pool account'];
        },
        {
          name: 'lockEscrow';
          docs: ['Lock account'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [108, 111, 99, 107, 95, 101, 115, 99, 114, 111, 119];
              },
              {
                kind: 'account';
                path: 'pool';
              },
              {
                kind: 'account';
                path: 'owner';
              },
            ];
          };
        },
        {
          name: 'owner';
        },
        {
          name: 'lpMint';
          docs: ['LP token mint of the pool'];
          relations: ['pool'];
        },
        {
          name: 'payer';
          docs: ['Payer account'];
          writable: true;
          signer: true;
        },
        {
          name: 'systemProgram';
          docs: ['System program.'];
          address: '11111111111111111111111111111111';
        },
      ];
      args: [];
    },
    {
      name: 'createMintMetadata';
      docs: ['Create mint metadata account for old pools'];
      discriminator: [13, 70, 168, 41, 250, 100, 148, 90];
      accounts: [
        {
          name: 'pool';
          docs: ['Pool account'];
        },
        {
          name: 'lpMint';
          docs: ['LP mint account of the pool'];
          relations: ['pool'];
        },
        {
          name: 'aVaultLp';
          docs: ['Vault A LP account of the pool'];
          relations: ['pool'];
        },
        {
          name: 'mintMetadata';
          writable: true;
        },
        {
          name: 'metadataProgram';
          address: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';
        },
        {
          name: 'systemProgram';
          docs: ['System program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'payer';
          docs: ['Payer'];
          writable: true;
          signer: true;
        },
      ];
      args: [];
    },
    {
      name: 'createOperatorAccount';
      docs: ['Create operator account'];
      discriminator: [221, 64, 246, 149, 240, 153, 229, 163];
      accounts: [
        {
          name: 'operator';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [111, 112, 101, 114, 97, 116, 111, 114];
              },
              {
                kind: 'account';
                path: 'whitelistedAddress';
              },
            ];
          };
        },
        {
          name: 'whitelistedAddress';
        },
        {
          name: 'signer';
          signer: true;
        },
        {
          name: 'payer';
          writable: true;
          signer: true;
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [95, 95, 101, 118, 101, 110, 116, 95, 97, 117, 116, 104, 111, 114, 105, 116, 121];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'permission';
          type: 'u128';
        },
      ];
    },
    {
      name: 'enableOrDisablePool';
      docs: ['Enable or disable a pool. A disabled pool allow only remove balanced liquidity operation.'];
      discriminator: [128, 6, 228, 131, 55, 161, 52, 169];
      accounts: [
        {
          name: 'pool';
          docs: ['Pool account (PDA)'];
          writable: true;
        },
        {
          name: 'admin';
          docs: ['Admin account. Must be owner of the pool.'];
          signer: true;
        },
      ];
      args: [
        {
          name: 'enable';
          type: 'bool';
        },
      ];
    },
    {
      name: 'getPoolInfo';
      docs: ['Get the general information of the pool.'];
      discriminator: [9, 48, 220, 101, 22, 240, 78, 200];
      accounts: [
        {
          name: 'pool';
          docs: ['Pool account (PDA)'];
        },
        {
          name: 'lpMint';
          docs: ['LP token mint of the pool'];
          relations: ['pool'];
        },
        {
          name: 'aVaultLp';
          docs: [
            'LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
          ];
          relations: ['pool'];
        },
        {
          name: 'bVaultLp';
          docs: [
            'LP token account of vault B. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
          ];
          relations: ['pool'];
        },
        {
          name: 'aVault';
          docs: ['Vault account for token a. token a of the pool will be deposit / withdraw from this vault account.'];
          relations: ['pool'];
        },
        {
          name: 'bVault';
          docs: ['Vault account for token b. token b of the pool will be deposit / withdraw from this vault account.'];
          relations: ['pool'];
        },
        {
          name: 'aVaultLpMint';
          docs: ['LP token mint of vault a'];
        },
        {
          name: 'bVaultLpMint';
          docs: ['LP token mint of vault b'];
        },
      ];
      args: [];
    },
    {
      name: 'initializeCustomizablePermissionlessConstantProductPool';
      docs: ['Initialize permissionless pool with customizable params'];
      discriminator: [145, 24, 172, 194, 219, 125, 3, 190];
      accounts: [
        {
          name: 'pool';
          docs: ['Pool account (PDA address)'];
          writable: true;
        },
        {
          name: 'lpMint';
          docs: ['LP token mint of the pool'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [108, 112, 95, 109, 105, 110, 116];
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'tokenAMint';
          docs: ['Token A mint of the pool. Eg: USDT'];
        },
        {
          name: 'tokenBMint';
          docs: ['Token B mint of the pool. Eg: USDC'];
        },
        {
          name: 'aVault';
          docs: ['Vault account for token A. Token A of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
        },
        {
          name: 'bVault';
          docs: ['Vault account for token B. Token B of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
        },
        {
          name: 'aTokenVault';
          docs: ['Token vault account of vault A'];
          writable: true;
        },
        {
          name: 'bTokenVault';
          docs: ['Token vault account of vault B'];
          writable: true;
        },
        {
          name: 'aVaultLpMint';
          docs: ['LP token mint of vault A'];
          writable: true;
        },
        {
          name: 'bVaultLpMint';
          docs: ['LP token mint of vault B'];
          writable: true;
        },
        {
          name: 'aVaultLp';
          docs: [
            'LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'aVault';
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'bVaultLp';
          docs: ['LP token account of vault B. Used to receive/burn vault LP upon deposit/withdraw from the vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'bVault';
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'payerTokenA';
          docs: ['Payer token account for pool token A mint. Used to bootstrap the pool with initial liquidity.'];
          writable: true;
        },
        {
          name: 'payerTokenB';
          docs: ['Admin token account for pool token B mint. Used to bootstrap the pool with initial liquidity.'];
          writable: true;
        },
        {
          name: 'payerPoolLp';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'payer';
              },
              {
                kind: 'const';
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'lpMint';
              },
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: 'protocolTokenAFee';
          docs: ['Protocol fee token account for token A. Used to receive trading fee.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [102, 101, 101];
              },
              {
                kind: 'account';
                path: 'tokenAMint';
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'protocolTokenBFee';
          docs: ['Protocol fee token account for token B. Used to receive trading fee.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [102, 101, 101];
              },
              {
                kind: 'account';
                path: 'tokenBMint';
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'payer';
          docs: [
            'Admin account. This account will be the admin of the pool, and the payer for PDA during initialize pool.',
          ];
          writable: true;
          signer: true;
        },
        {
          name: 'rent';
          docs: ['Rent account.'];
          address: 'SysvarRent111111111111111111111111111111111';
        },
        {
          name: 'mintMetadata';
          writable: true;
        },
        {
          name: 'metadataProgram';
        },
        {
          name: 'vaultProgram';
          docs: ['Vault program. The pool will deposit/withdraw liquidity from the vault.'];
          address: '24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi';
        },
        {
          name: 'tokenProgram';
          docs: ['Token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          docs: ['Associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'systemProgram';
          docs: ['System program.'];
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'tokenAAmount';
          type: 'u64';
        },
        {
          name: 'tokenBAmount';
          type: 'u64';
        },
        {
          name: 'params';
          type: {
            defined: {
              name: 'customizableParams';
            };
          };
        },
      ];
    },
    {
      name: 'initializePermissionedPool';
      docs: ['Initialize a new permissioned pool.'];
      discriminator: [77, 85, 178, 157, 50, 48, 212, 126];
      accounts: [
        {
          name: 'pool';
          docs: ['Pool account (arbitrary address)'];
          writable: true;
          signer: true;
        },
        {
          name: 'lpMint';
          docs: ['LP token mint of the pool'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [108, 112, 95, 109, 105, 110, 116];
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'tokenAMint';
          docs: ['Token A mint of the pool. Eg: USDT'];
        },
        {
          name: 'tokenBMint';
          docs: ['Token B mint of the pool. Eg: USDC'];
        },
        {
          name: 'aVault';
          docs: ['Vault account for token A. Token A of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
        },
        {
          name: 'bVault';
          docs: ['Vault account for token B. Token B of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
        },
        {
          name: 'aVaultLpMint';
          docs: ['LP token mint of vault A'];
          writable: true;
        },
        {
          name: 'bVaultLpMint';
          docs: ['LP token mint of vault B'];
          writable: true;
        },
        {
          name: 'aVaultLp';
          docs: [
            'LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'aVault';
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'bVaultLp';
          docs: ['LP token account of vault B. Used to receive/burn vault LP upon deposit/withdraw from the vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'bVault';
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'adminTokenA';
          docs: ['Admin token account for pool token A mint. Used to bootstrap the pool with initial liquidity.'];
          writable: true;
        },
        {
          name: 'adminTokenB';
          docs: ['Admin token account for pool token B mint. Used to bootstrap the pool with initial liquidity.'];
          writable: true;
        },
        {
          name: 'adminPoolLp';
          docs: [
            'Admin pool LP token account. Used to receive LP during first deposit (initialize pool)',
            'Admin pool LP token account. Used to receive LP during first deposit (initialize pool)',
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'admin';
              },
              {
                kind: 'const';
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'lpMint';
              },
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: 'protocolTokenAFee';
          docs: ['Protocol fee token account for token A. Used to receive trading fee.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [102, 101, 101];
              },
              {
                kind: 'account';
                path: 'tokenAMint';
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'protocolTokenBFee';
          docs: ['Protocol fee token account for token B. Used to receive trading fee.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [102, 101, 101];
              },
              {
                kind: 'account';
                path: 'tokenBMint';
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'admin';
          docs: [
            'Admin account. This account will be the admin of the pool, and the payer for PDA during initialize pool.',
          ];
          writable: true;
          signer: true;
        },
        {
          name: 'feeOwner';
        },
        {
          name: 'rent';
          docs: ['Rent account.'];
          address: 'SysvarRent111111111111111111111111111111111';
        },
        {
          name: 'mintMetadata';
          writable: true;
        },
        {
          name: 'metadataProgram';
        },
        {
          name: 'vaultProgram';
          docs: ['Vault program. The pool will deposit/withdraw liquidity from the vault.'];
          address: '24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi';
        },
        {
          name: 'tokenProgram';
          docs: ['Token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          docs: ['Associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'systemProgram';
          docs: ['System program.'];
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'curveType';
          type: {
            defined: {
              name: 'curveType';
            };
          };
        },
      ];
    },
    {
      name: 'initializePermissionlessConstantProductPoolWithConfig';
      docs: ['Initialize permissionless pool with config'];
      discriminator: [7, 166, 138, 171, 206, 171, 236, 244];
      accounts: [
        {
          name: 'pool';
          docs: ['Pool account (PDA address)'];
          writable: true;
        },
        {
          name: 'config';
        },
        {
          name: 'lpMint';
          docs: ['LP token mint of the pool'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [108, 112, 95, 109, 105, 110, 116];
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'tokenAMint';
          docs: ['Token A mint of the pool. Eg: USDT'];
        },
        {
          name: 'tokenBMint';
          docs: ['Token B mint of the pool. Eg: USDC'];
        },
        {
          name: 'aVault';
          docs: ['Vault account for token A. Token A of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
        },
        {
          name: 'bVault';
          docs: ['Vault account for token B. Token B of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
        },
        {
          name: 'aTokenVault';
          docs: ['Token vault account of vault A'];
          writable: true;
        },
        {
          name: 'bTokenVault';
          docs: ['Token vault account of vault B'];
          writable: true;
        },
        {
          name: 'aVaultLpMint';
          docs: ['LP token mint of vault A'];
          writable: true;
        },
        {
          name: 'bVaultLpMint';
          docs: ['LP token mint of vault B'];
          writable: true;
        },
        {
          name: 'aVaultLp';
          docs: [
            'LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'aVault';
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'bVaultLp';
          docs: ['LP token account of vault B. Used to receive/burn vault LP upon deposit/withdraw from the vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'bVault';
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'payerTokenA';
          docs: ['Payer token account for pool token A mint. Used to bootstrap the pool with initial liquidity.'];
          writable: true;
        },
        {
          name: 'payerTokenB';
          docs: ['Admin token account for pool token B mint. Used to bootstrap the pool with initial liquidity.'];
          writable: true;
        },
        {
          name: 'payerPoolLp';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'payer';
              },
              {
                kind: 'const';
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'lpMint';
              },
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: 'protocolTokenAFee';
          docs: ['Protocol fee token account for token A. Used to receive trading fee.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [102, 101, 101];
              },
              {
                kind: 'account';
                path: 'tokenAMint';
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'protocolTokenBFee';
          docs: ['Protocol fee token account for token B. Used to receive trading fee.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [102, 101, 101];
              },
              {
                kind: 'account';
                path: 'tokenBMint';
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'payer';
          docs: [
            'Admin account. This account will be the admin of the pool, and the payer for PDA during initialize pool.',
          ];
          writable: true;
          signer: true;
        },
        {
          name: 'rent';
          docs: ['Rent account.'];
          address: 'SysvarRent111111111111111111111111111111111';
        },
        {
          name: 'mintMetadata';
          writable: true;
        },
        {
          name: 'metadataProgram';
        },
        {
          name: 'vaultProgram';
          docs: ['Vault program. The pool will deposit/withdraw liquidity from the vault.'];
          address: '24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi';
        },
        {
          name: 'tokenProgram';
          docs: ['Token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          docs: ['Associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'systemProgram';
          docs: ['System program.'];
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'tokenAAmount';
          type: 'u64';
        },
        {
          name: 'tokenBAmount';
          type: 'u64';
        },
      ];
    },
    {
      name: 'initializePermissionlessConstantProductPoolWithConfig2';
      docs: ['Initialize permissionless pool with config 2'];
      discriminator: [48, 149, 220, 130, 61, 11, 9, 178];
      accounts: [
        {
          name: 'pool';
          docs: ['Pool account (PDA address)'];
          writable: true;
        },
        {
          name: 'config';
        },
        {
          name: 'lpMint';
          docs: ['LP token mint of the pool'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [108, 112, 95, 109, 105, 110, 116];
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'tokenAMint';
          docs: ['Token A mint of the pool. Eg: USDT'];
        },
        {
          name: 'tokenBMint';
          docs: ['Token B mint of the pool. Eg: USDC'];
        },
        {
          name: 'aVault';
          docs: ['Vault account for token A. Token A of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
        },
        {
          name: 'bVault';
          docs: ['Vault account for token B. Token B of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
        },
        {
          name: 'aTokenVault';
          docs: ['Token vault account of vault A'];
          writable: true;
        },
        {
          name: 'bTokenVault';
          docs: ['Token vault account of vault B'];
          writable: true;
        },
        {
          name: 'aVaultLpMint';
          docs: ['LP token mint of vault A'];
          writable: true;
        },
        {
          name: 'bVaultLpMint';
          docs: ['LP token mint of vault B'];
          writable: true;
        },
        {
          name: 'aVaultLp';
          docs: [
            'LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'aVault';
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'bVaultLp';
          docs: ['LP token account of vault B. Used to receive/burn vault LP upon deposit/withdraw from the vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'bVault';
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'payerTokenA';
          docs: ['Payer token account for pool token A mint. Used to bootstrap the pool with initial liquidity.'];
          writable: true;
        },
        {
          name: 'payerTokenB';
          docs: ['Admin token account for pool token B mint. Used to bootstrap the pool with initial liquidity.'];
          writable: true;
        },
        {
          name: 'payerPoolLp';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'payer';
              },
              {
                kind: 'const';
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'lpMint';
              },
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: 'protocolTokenAFee';
          docs: ['Protocol fee token account for token A. Used to receive trading fee.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [102, 101, 101];
              },
              {
                kind: 'account';
                path: 'tokenAMint';
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'protocolTokenBFee';
          docs: ['Protocol fee token account for token B. Used to receive trading fee.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [102, 101, 101];
              },
              {
                kind: 'account';
                path: 'tokenBMint';
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'payer';
          docs: [
            'Admin account. This account will be the admin of the pool, and the payer for PDA during initialize pool.',
          ];
          writable: true;
          signer: true;
        },
        {
          name: 'rent';
          docs: ['Rent account.'];
          address: 'SysvarRent111111111111111111111111111111111';
        },
        {
          name: 'mintMetadata';
          writable: true;
        },
        {
          name: 'metadataProgram';
        },
        {
          name: 'vaultProgram';
          docs: ['Vault program. The pool will deposit/withdraw liquidity from the vault.'];
          address: '24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi';
        },
        {
          name: 'tokenProgram';
          docs: ['Token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          docs: ['Associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'systemProgram';
          docs: ['System program.'];
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'tokenAAmount';
          type: 'u64';
        },
        {
          name: 'tokenBAmount';
          type: 'u64';
        },
        {
          name: 'activationPoint';
          type: {
            option: 'u64';
          };
        },
      ];
    },
    {
      name: 'initializePermissionlessPool';
      docs: ['Initialize a new permissionless pool.'];
      discriminator: [118, 173, 41, 157, 173, 72, 97, 103];
      accounts: [
        {
          name: 'pool';
          docs: ['Pool account (PDA address)'];
          writable: true;
        },
        {
          name: 'lpMint';
          docs: ['LP token mint of the pool'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [108, 112, 95, 109, 105, 110, 116];
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'tokenAMint';
          docs: ['Token A mint of the pool. Eg: USDT'];
        },
        {
          name: 'tokenBMint';
          docs: ['Token B mint of the pool. Eg: USDC'];
        },
        {
          name: 'aVault';
          docs: ['Vault account for token A. Token A of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
        },
        {
          name: 'bVault';
          docs: ['Vault account for token B. Token B of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
        },
        {
          name: 'aTokenVault';
          docs: ['Token vault account of vault A'];
          writable: true;
        },
        {
          name: 'bTokenVault';
          docs: ['Token vault account of vault B'];
          writable: true;
        },
        {
          name: 'aVaultLpMint';
          docs: ['LP token mint of vault A'];
          writable: true;
        },
        {
          name: 'bVaultLpMint';
          docs: ['LP token mint of vault B'];
          writable: true;
        },
        {
          name: 'aVaultLp';
          docs: [
            'LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'aVault';
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'bVaultLp';
          docs: ['LP token account of vault B. Used to receive/burn vault LP upon deposit/withdraw from the vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'bVault';
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'payerTokenA';
          docs: ['Payer token account for pool token A mint. Used to bootstrap the pool with initial liquidity.'];
          writable: true;
        },
        {
          name: 'payerTokenB';
          docs: ['Admin token account for pool token B mint. Used to bootstrap the pool with initial liquidity.'];
          writable: true;
        },
        {
          name: 'payerPoolLp';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'payer';
              },
              {
                kind: 'const';
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'lpMint';
              },
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: 'protocolTokenAFee';
          docs: ['Protocol fee token account for token A. Used to receive trading fee.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [102, 101, 101];
              },
              {
                kind: 'account';
                path: 'tokenAMint';
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'protocolTokenBFee';
          docs: ['Protocol fee token account for token B. Used to receive trading fee.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [102, 101, 101];
              },
              {
                kind: 'account';
                path: 'tokenBMint';
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'payer';
          docs: [
            'Admin account. This account will be the admin of the pool, and the payer for PDA during initialize pool.',
          ];
          writable: true;
          signer: true;
        },
        {
          name: 'feeOwner';
        },
        {
          name: 'rent';
          docs: ['Rent account.'];
          address: 'SysvarRent111111111111111111111111111111111';
        },
        {
          name: 'mintMetadata';
          writable: true;
        },
        {
          name: 'metadataProgram';
        },
        {
          name: 'vaultProgram';
          docs: ['Vault program. The pool will deposit/withdraw liquidity from the vault.'];
          address: '24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi';
        },
        {
          name: 'tokenProgram';
          docs: ['Token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          docs: ['Associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'systemProgram';
          docs: ['System program.'];
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'curveType';
          type: {
            defined: {
              name: 'curveType';
            };
          };
        },
        {
          name: 'tokenAAmount';
          type: 'u64';
        },
        {
          name: 'tokenBAmount';
          type: 'u64';
        },
      ];
    },
    {
      name: 'initializePermissionlessPoolWithFeeTier';
      docs: ['Initialize a new permissionless pool with customized fee tier'];
      discriminator: [6, 135, 68, 147, 229, 82, 169, 113];
      accounts: [
        {
          name: 'pool';
          docs: ['Pool account (PDA address)'];
          writable: true;
        },
        {
          name: 'lpMint';
          docs: ['LP token mint of the pool'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [108, 112, 95, 109, 105, 110, 116];
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'tokenAMint';
          docs: ['Token A mint of the pool. Eg: USDT'];
        },
        {
          name: 'tokenBMint';
          docs: ['Token B mint of the pool. Eg: USDC'];
        },
        {
          name: 'aVault';
          docs: ['Vault account for token A. Token A of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
        },
        {
          name: 'bVault';
          docs: ['Vault account for token B. Token B of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
        },
        {
          name: 'aTokenVault';
          docs: ['Token vault account of vault A'];
          writable: true;
        },
        {
          name: 'bTokenVault';
          docs: ['Token vault account of vault B'];
          writable: true;
        },
        {
          name: 'aVaultLpMint';
          docs: ['LP token mint of vault A'];
          writable: true;
        },
        {
          name: 'bVaultLpMint';
          docs: ['LP token mint of vault B'];
          writable: true;
        },
        {
          name: 'aVaultLp';
          docs: [
            'LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'aVault';
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'bVaultLp';
          docs: ['LP token account of vault B. Used to receive/burn vault LP upon deposit/withdraw from the vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'bVault';
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'payerTokenA';
          docs: ['Payer token account for pool token A mint. Used to bootstrap the pool with initial liquidity.'];
          writable: true;
        },
        {
          name: 'payerTokenB';
          docs: ['Admin token account for pool token B mint. Used to bootstrap the pool with initial liquidity.'];
          writable: true;
        },
        {
          name: 'payerPoolLp';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'payer';
              },
              {
                kind: 'const';
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'lpMint';
              },
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: 'protocolTokenAFee';
          docs: ['Protocol fee token account for token A. Used to receive trading fee.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [102, 101, 101];
              },
              {
                kind: 'account';
                path: 'tokenAMint';
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'protocolTokenBFee';
          docs: ['Protocol fee token account for token B. Used to receive trading fee.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [102, 101, 101];
              },
              {
                kind: 'account';
                path: 'tokenBMint';
              },
              {
                kind: 'account';
                path: 'pool';
              },
            ];
          };
        },
        {
          name: 'payer';
          docs: [
            'Admin account. This account will be the admin of the pool, and the payer for PDA during initialize pool.',
          ];
          writable: true;
          signer: true;
        },
        {
          name: 'feeOwner';
        },
        {
          name: 'rent';
          docs: ['Rent account.'];
          address: 'SysvarRent111111111111111111111111111111111';
        },
        {
          name: 'mintMetadata';
          writable: true;
        },
        {
          name: 'metadataProgram';
        },
        {
          name: 'vaultProgram';
          docs: ['Vault program. The pool will deposit/withdraw liquidity from the vault.'];
          address: '24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi';
        },
        {
          name: 'tokenProgram';
          docs: ['Token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          docs: ['Associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'systemProgram';
          docs: ['System program.'];
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'curveType';
          type: {
            defined: {
              name: 'curveType';
            };
          };
        },
        {
          name: 'tradeFeeBps';
          type: 'u64';
        },
        {
          name: 'tokenAAmount';
          type: 'u64';
        },
        {
          name: 'tokenBAmount';
          type: 'u64';
        },
      ];
    },
    {
      name: 'lock';
      docs: ['Lock Lp token'];
      discriminator: [21, 19, 208, 43, 237, 62, 255, 87];
      accounts: [
        {
          name: 'pool';
          docs: ['Pool account'];
          writable: true;
          relations: ['lockEscrow'];
        },
        {
          name: 'lpMint';
          docs: ['LP token mint of the pool'];
          relations: ['pool'];
        },
        {
          name: 'lockEscrow';
          docs: ['Lock account'];
          writable: true;
        },
        {
          name: 'owner';
          docs: ['Can be anyone'];
          writable: true;
          signer: true;
        },
        {
          name: 'sourceTokens';
          docs: ['owner lp token account'];
          writable: true;
        },
        {
          name: 'escrowVault';
          docs: ['Escrow vault'];
          writable: true;
          relations: ['lockEscrow'];
        },
        {
          name: 'tokenProgram';
          docs: ['Token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'aVault';
          docs: ['Vault account for token a. token a of the pool will be deposit / withdraw from this vault account.'];
          relations: ['pool'];
        },
        {
          name: 'bVault';
          docs: ['Vault account for token b. token b of the pool will be deposit / withdraw from this vault account.'];
          relations: ['pool'];
        },
        {
          name: 'aVaultLp';
          docs: [
            'LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
          ];
          relations: ['pool'];
        },
        {
          name: 'bVaultLp';
          docs: [
            'LP token account of vault B. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
          ];
          relations: ['pool'];
        },
        {
          name: 'aVaultLpMint';
          docs: ['LP token mint of vault a'];
        },
        {
          name: 'bVaultLpMint';
          docs: ['LP token mint of vault b'];
        },
      ];
      args: [
        {
          name: 'maxAmount';
          type: 'u64';
        },
      ];
    },
    {
      name: 'overrideCurveParam';
      docs: [
        'Update swap curve parameters. This function do not allow update of curve type. For example: stable swap curve to constant product curve. Only supported by pool with stable swap curve.',
        'Only amp is allowed to be override. The other attributes of stable swap curve will be ignored.',
      ];
      discriminator: [98, 86, 204, 51, 94, 71, 69, 187];
      accounts: [
        {
          name: 'pool';
          docs: ['Pool account (PDA)'];
          writable: true;
        },
        {
          name: 'admin';
          docs: ['Admin account.'];
          signer: true;
        },
      ];
      args: [
        {
          name: 'curveType';
          type: {
            defined: {
              name: 'curveType';
            };
          };
        },
      ];
    },
    {
      name: 'partnerClaimFee';
      docs: ['Partner claim fee'];
      discriminator: [57, 53, 176, 30, 123, 70, 52, 64];
      accounts: [
        {
          name: 'pool';
          docs: ['Pool account (PDA)'];
          writable: true;
        },
        {
          name: 'aVaultLp';
          relations: ['pool'];
        },
        {
          name: 'protocolTokenAFee';
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'protocolTokenBFee';
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'partnerTokenA';
          writable: true;
        },
        {
          name: 'partnerTokenB';
          writable: true;
        },
        {
          name: 'tokenProgram';
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'partnerAuthority';
          signer: true;
        },
      ];
      args: [
        {
          name: 'maxAmountA';
          type: 'u64';
        },
        {
          name: 'maxAmountB';
          type: 'u64';
        },
      ];
    },
    {
      name: 'removeBalanceLiquidity';
      docs: [
        "Withdraw tokens from the pool in a balanced ratio. User will still able to withdraw from pool even the pool is disabled. This allow user to exit their liquidity when there's some unforeseen event happen.",
      ];
      discriminator: [133, 109, 44, 179, 56, 238, 114, 33];
      accounts: [
        {
          name: 'pool';
          docs: ['Pool account (PDA)'];
          writable: true;
        },
        {
          name: 'lpMint';
          docs: ['LP token mint of the pool'];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'userPoolLp';
          docs: ['user pool lp token account. lp will be burned from this account upon success liquidity removal.'];
          writable: true;
        },
        {
          name: 'aVaultLp';
          docs: [
            'LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
          ];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'bVaultLp';
          docs: [
            'LP token account of vault B. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
          ];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'aVault';
          docs: ['Vault account for token a. token a of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'bVault';
          docs: ['Vault account for token b. token b of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'aVaultLpMint';
          docs: ['LP token mint of vault a'];
          writable: true;
        },
        {
          name: 'bVaultLpMint';
          docs: ['LP token mint of vault b'];
          writable: true;
        },
        {
          name: 'aTokenVault';
          docs: ['Token vault account of vault A'];
          writable: true;
        },
        {
          name: 'bTokenVault';
          docs: ['Token vault account of vault B'];
          writable: true;
        },
        {
          name: 'userAToken';
          docs: [
            'User token A account. Token will be transfer from this account if it is add liquidity operation. Else, token will be transfer into this account.',
          ];
          writable: true;
        },
        {
          name: 'userBToken';
          docs: [
            'User token B account. Token will be transfer from this account if it is add liquidity operation. Else, token will be transfer into this account.',
          ];
          writable: true;
        },
        {
          name: 'user';
          docs: ['User account. Must be owner of user_a_token, and user_b_token.'];
          signer: true;
        },
        {
          name: 'vaultProgram';
          docs: ['Vault program. the pool will deposit/withdraw liquidity from the vault.'];
          address: '24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi';
        },
        {
          name: 'tokenProgram';
          docs: ['Token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
      ];
      args: [
        {
          name: 'poolTokenAmount';
          type: 'u64';
        },
        {
          name: 'minimumATokenOut';
          type: 'u64';
        },
        {
          name: 'minimumBTokenOut';
          type: 'u64';
        },
      ];
    },
    {
      name: 'removeLiquiditySingleSide';
      docs: ['Withdraw only single token from the pool. Only supported by pool with stable swap curve.'];
      discriminator: [84, 84, 177, 66, 254, 185, 10, 251];
      accounts: [
        {
          name: 'pool';
          docs: ['Pool account (PDA)'];
          writable: true;
        },
        {
          name: 'lpMint';
          docs: ['LP token mint of the pool'];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'userPoolLp';
          docs: ['User pool lp token account. LP will be burned from this account upon success liquidity removal.'];
          writable: true;
        },
        {
          name: 'aVaultLp';
          docs: [
            'LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
          ];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'bVaultLp';
          docs: [
            'LP token account of vault B. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
          ];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'aVault';
          docs: ['Vault account for token A. Token A of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'bVault';
          docs: ['Vault account for token B. Token B of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'aVaultLpMint';
          docs: ['LP token mint of vault A'];
          writable: true;
        },
        {
          name: 'bVaultLpMint';
          docs: ['LP token mint of vault B'];
          writable: true;
        },
        {
          name: 'aTokenVault';
          docs: ['Token vault account of vault A'];
          writable: true;
        },
        {
          name: 'bTokenVault';
          docs: ['Token vault account of vault B'];
          writable: true;
        },
        {
          name: 'userDestinationToken';
          docs: ['User token account to receive token upon success liquidity removal.'];
          writable: true;
        },
        {
          name: 'user';
          docs: ['User account. Must be owner of the user_pool_lp account.'];
          signer: true;
        },
        {
          name: 'vaultProgram';
          docs: ['Vault program. The pool will deposit/withdraw liquidity from the vault.'];
          address: '24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi';
        },
        {
          name: 'tokenProgram';
          docs: ['Token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
      ];
      args: [
        {
          name: 'poolTokenAmount';
          type: 'u64';
        },
        {
          name: 'minimumOutAmount';
          type: 'u64';
        },
      ];
    },
    {
      name: 'setPoolFees';
      docs: ['Update trading fee charged for liquidity provider, and admin.'];
      discriminator: [102, 44, 158, 54, 205, 37, 126, 78];
      accounts: [
        {
          name: 'pool';
          docs: ['Pool account (PDA)'];
          writable: true;
        },
        {
          name: 'feeOperator';
          docs: ['Fee operator account'];
          signer: true;
        },
      ];
      args: [
        {
          name: 'fees';
          type: {
            defined: {
              name: 'poolFees';
            };
          };
        },
        {
          name: 'newPartnerFeeNumerator';
          type: 'u64';
        },
      ];
    },
    {
      name: 'setWhitelistedVault';
      docs: ['Set whitelisted vault'];
      discriminator: [12, 148, 94, 42, 55, 57, 83, 247];
      accounts: [
        {
          name: 'pool';
          writable: true;
        },
        {
          name: 'admin';
          signer: true;
        },
      ];
      args: [
        {
          name: 'whitelistedVault';
          type: 'pubkey';
        },
      ];
    },
    {
      name: 'swap';
      docs: [
        'Swap token A to B, or vice versa. An amount of trading fee will be charged for liquidity provider, and the admin of the pool.',
      ];
      discriminator: [248, 198, 158, 145, 225, 117, 135, 200];
      accounts: [
        {
          name: 'pool';
          docs: ['Pool account (PDA)'];
          writable: true;
        },
        {
          name: 'userSourceToken';
          docs: [
            'User token account. Token from this account will be transfer into the vault by the pool in exchange for another token of the pool.',
          ];
          writable: true;
        },
        {
          name: 'userDestinationToken';
          docs: ['User token account. The exchanged token will be transfer into this account from the pool.'];
          writable: true;
        },
        {
          name: 'aVault';
          docs: ['Vault account for token a. token a of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'bVault';
          docs: ['Vault account for token b. token b of the pool will be deposit / withdraw from this vault account.'];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'aTokenVault';
          docs: ['Token vault account of vault A'];
          writable: true;
        },
        {
          name: 'bTokenVault';
          docs: ['Token vault account of vault B'];
          writable: true;
        },
        {
          name: 'aVaultLpMint';
          docs: ['Lp token mint of vault a'];
          writable: true;
        },
        {
          name: 'bVaultLpMint';
          docs: ['Lp token mint of vault b'];
          writable: true;
        },
        {
          name: 'aVaultLp';
          docs: [
            'LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
          ];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'bVaultLp';
          docs: [
            'LP token account of vault B. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
          ];
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'protocolTokenFee';
          docs: [
            "Protocol fee token account. Used to receive trading fee. It's mint field must matched with user_source_token mint field.",
          ];
          writable: true;
        },
        {
          name: 'user';
          docs: ['User account. Must be owner of user_source_token.'];
          signer: true;
        },
        {
          name: 'vaultProgram';
          docs: ['Vault program. the pool will deposit/withdraw liquidity from the vault.'];
          address: '24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi';
        },
        {
          name: 'tokenProgram';
          docs: ['Token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
      ];
      args: [
        {
          name: 'inAmount';
          type: 'u64';
        },
        {
          name: 'minimumOutAmount';
          type: 'u64';
        },
      ];
    },
    {
      name: 'updateActivationPoint';
      docs: ['Update activation slot'];
      discriminator: [150, 62, 125, 219, 171, 220, 26, 237];
      accounts: [
        {
          name: 'pool';
          docs: ['Pool account (PDA)'];
          writable: true;
        },
        {
          name: 'admin';
          docs: ['Admin account.'];
          signer: true;
        },
      ];
      args: [
        {
          name: 'newActivationPoint';
          type: 'u64';
        },
      ];
    },
    {
      name: 'withdrawProtocolFees';
      docs: ['Withdraw protocol fee'];
      discriminator: [11, 68, 165, 98, 18, 208, 134, 73];
      accounts: [
        {
          name: 'pool';
          docs: ['Pool account (PDA)'];
        },
        {
          name: 'aVaultLp';
          relations: ['pool'];
        },
        {
          name: 'protocolTokenAFee';
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'protocolTokenBFee';
          writable: true;
          relations: ['pool'];
        },
        {
          name: 'tokenAMint';
          relations: ['pool'];
        },
        {
          name: 'tokenBMint';
          relations: ['pool'];
        },
        {
          name: 'treasuryTokenA';
          writable: true;
        },
        {
          name: 'treasuryTokenB';
          writable: true;
        },
        {
          name: 'operator';
        },
        {
          name: 'signer';
          signer: true;
        },
        {
          name: 'tokenProgram';
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
      ];
      args: [
        {
          name: 'maxAmountA';
          type: 'u64';
        },
        {
          name: 'maxAmountB';
          type: 'u64';
        },
      ];
    },
    {
      name: 'zapProtocolFee';
      discriminator: [213, 155, 187, 34, 56, 182, 91, 240];
      accounts: [
        {
          name: 'pool';
        },
        {
          name: 'aVaultLp';
          relations: ['pool'];
        },
        {
          name: 'protocolTokenFee';
          writable: true;
        },
        {
          name: 'tokenMint';
        },
        {
          name: 'receiverToken';
          writable: true;
        },
        {
          name: 'operator';
          docs: ['zap claim fee operator'];
        },
        {
          name: 'signer';
          docs: ['operator'];
          signer: true;
        },
        {
          name: 'tokenProgram';
          docs: ['Token program'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'sysvarInstructions';
          address: 'Sysvar1nstructions1111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'maxAmount';
          type: 'u64';
        },
      ];
    },
  ];
  accounts: [
    {
      name: 'config';
      discriminator: [155, 12, 170, 224, 30, 250, 204, 130];
    },
    {
      name: 'lockEscrow';
      discriminator: [190, 106, 121, 6, 200, 182, 21, 75];
    },
    {
      name: 'operator';
      discriminator: [219, 31, 188, 145, 69, 139, 204, 117];
    },
    {
      name: 'pool';
      discriminator: [241, 154, 109, 4, 17, 177, 109, 188];
    },
    {
      name: 'vault';
      discriminator: [211, 8, 232, 43, 2, 152, 117, 119];
    },
  ];
  events: [
    {
      name: 'addLiquidity';
      discriminator: [31, 94, 125, 90, 227, 52, 61, 186];
    },
    {
      name: 'bootstrapLiquidity';
      discriminator: [121, 127, 38, 136, 92, 55, 14, 247];
    },
    {
      name: 'claimFee';
      discriminator: [75, 122, 154, 48, 140, 74, 123, 163];
    },
    {
      name: 'claimProtocolFee2';
      discriminator: [45, 244, 0, 189, 44, 147, 96, 67];
    },
    {
      name: 'closeConfig';
      discriminator: [249, 181, 108, 89, 4, 150, 90, 174];
    },
    {
      name: 'createConfig';
      discriminator: [199, 152, 10, 19, 39, 39, 157, 104];
    },
    {
      name: 'createLockEscrow';
      discriminator: [74, 94, 106, 141, 49, 17, 98, 109];
    },
    {
      name: 'lock';
      discriminator: [220, 183, 67, 215, 153, 207, 56, 234];
    },
    {
      name: 'migrateFeeAccount';
      discriminator: [223, 234, 232, 26, 252, 105, 180, 125];
    },
    {
      name: 'overrideCurveParam';
      discriminator: [247, 20, 165, 248, 75, 5, 54, 246];
    },
    {
      name: 'partnerClaimFees';
      discriminator: [135, 131, 10, 94, 119, 209, 202, 48];
    },
    {
      name: 'poolCreated';
      discriminator: [202, 44, 41, 88, 104, 220, 157, 82];
    },
    {
      name: 'poolEnabled';
      discriminator: [2, 151, 18, 83, 204, 134, 92, 191];
    },
    {
      name: 'poolInfo';
      discriminator: [207, 20, 87, 97, 251, 212, 234, 45];
    },
    {
      name: 'removeLiquidity';
      discriminator: [116, 244, 97, 232, 103, 31, 152, 58];
    },
    {
      name: 'setPoolFees';
      discriminator: [245, 26, 198, 164, 88, 18, 75, 9];
    },
    {
      name: 'swap';
      discriminator: [81, 108, 227, 190, 205, 208, 10, 196];
    },
    {
      name: 'transferAdmin';
      discriminator: [228, 169, 131, 244, 61, 56, 65, 254];
    },
    {
      name: 'withdrawProtocolFees';
      discriminator: [30, 240, 207, 196, 139, 239, 79, 28];
    },
  ];
  errors: [
    {
      code: 6000;
      name: 'mathOverflow';
      msg: 'Math operation overflow';
    },
    {
      code: 6001;
      name: 'invalidFee';
      msg: 'Invalid fee setup';
    },
    {
      code: 6002;
      name: 'invalidInvariant';
      msg: 'Invalid invariant d';
    },
    {
      code: 6003;
      name: 'feeCalculationFailure';
      msg: 'Fee calculation failure';
    },
    {
      code: 6004;
      name: 'exceededSlippage';
      msg: 'Exceeded slippage tolerance';
    },
    {
      code: 6005;
      name: 'invalidCalculation';
      msg: 'Invalid curve calculation';
    },
    {
      code: 6006;
      name: 'zeroTradingTokens';
      msg: 'Given pool token amount results in zero trading tokens';
    },
    {
      code: 6007;
      name: 'conversionError';
      msg: 'Math conversion overflow';
    },
    {
      code: 6008;
      name: 'faultyLpMint';
      msg: "LP mint authority must be 'A' vault lp, without freeze authority, and 0 supply";
    },
    {
      code: 6009;
      name: 'mismatchedTokenMint';
      msg: 'Token mint mismatched';
    },
    {
      code: 6010;
      name: 'mismatchedLpMint';
      msg: 'LP mint mismatched';
    },
    {
      code: 6011;
      name: 'mismatchedOwner';
      msg: 'Invalid lp token owner';
    },
    {
      code: 6012;
      name: 'invalidVaultAccount';
      msg: 'Invalid vault account';
    },
    {
      code: 6013;
      name: 'invalidVaultLpAccount';
      msg: 'Invalid vault lp account';
    },
    {
      code: 6014;
      name: 'invalidPoolLpMintAccount';
      msg: 'Invalid pool lp mint account';
    },
    {
      code: 6015;
      name: 'poolDisabled';
      msg: 'Pool disabled';
    },
    {
      code: 6016;
      name: 'invalidAdminAccount';
      msg: 'Invalid admin account';
    },
    {
      code: 6017;
      name: 'invalidProtocolFeeAccount';
      msg: 'Invalid protocol fee account';
    },
    {
      code: 6018;
      name: 'sameAdminAccount';
      msg: 'Same admin account';
    },
    {
      code: 6019;
      name: 'identicalSourceDestination';
      msg: 'Identical user source and destination token account';
    },
    {
      code: 6020;
      name: 'apyCalculationError';
      msg: 'Apy calculation error';
    },
    {
      code: 6021;
      name: 'insufficientSnapshot';
      msg: 'Insufficient virtual price snapshot';
    },
    {
      code: 6022;
      name: 'nonUpdatableCurve';
      msg: 'Current curve is non-updatable';
    },
    {
      code: 6023;
      name: 'misMatchedCurve';
      msg: 'New curve is mismatched with old curve';
    },
    {
      code: 6024;
      name: 'invalidAmplification';
      msg: 'Amplification is invalid';
    },
    {
      code: 6025;
      name: 'unsupportedOperation';
      msg: 'Operation is not supported';
    },
    {
      code: 6026;
      name: 'exceedMaxAChanges';
      msg: 'Exceed max amplification changes';
    },
    {
      code: 6027;
      name: 'invalidRemainingAccountsLen';
      msg: 'Invalid remaining accounts length';
    },
    {
      code: 6028;
      name: 'invalidRemainingAccounts';
      msg: 'Invalid remaining account';
    },
    {
      code: 6029;
      name: 'mismatchedDepegMint';
      msg: "Token mint B doesn't matches depeg type token mint";
    },
    {
      code: 6030;
      name: 'invalidApyAccount';
      msg: 'Invalid APY account';
    },
    {
      code: 6031;
      name: 'invalidTokenMultiplier';
      msg: 'Invalid token multiplier';
    },
    {
      code: 6032;
      name: 'invalidDepegInformation';
      msg: 'Invalid depeg information';
    },
    {
      code: 6033;
      name: 'updateTimeConstraint';
      msg: 'Update time constraint violated';
    },
    {
      code: 6034;
      name: 'exceedMaxFeeBps';
      msg: 'Exceeded max fee bps';
    },
    {
      code: 6035;
      name: 'invalidAdmin';
      msg: 'Invalid admin';
    },
    {
      code: 6036;
      name: 'poolIsNotPermissioned';
      msg: 'Pool is not permissioned';
    },
    {
      code: 6037;
      name: 'invalidDepositAmount';
      msg: 'Invalid deposit amount';
    },
    {
      code: 6038;
      name: 'invalidFeeOwner';
      msg: 'Invalid fee owner';
    },
    {
      code: 6039;
      name: 'nonDepletedPool';
      msg: 'Pool is not depleted';
    },
    {
      code: 6040;
      name: 'amountNotPeg';
      msg: 'Token amount is not 1:1';
    },
    {
      code: 6041;
      name: 'amountIsZero';
      msg: 'Amount is zero';
    },
    {
      code: 6042;
      name: 'typeCastFailed';
      msg: 'Type cast error';
    },
    {
      code: 6043;
      name: 'amountIsNotEnough';
      msg: 'Amount is not enough';
    },
    {
      code: 6044;
      name: 'invalidActivationDuration';
      msg: 'Invalid activation duration';
    },
    {
      code: 6045;
      name: 'poolIsNotLaunchPool';
      msg: 'Pool is not launch pool';
    },
    {
      code: 6046;
      name: 'unableToModifyActivationPoint';
      msg: 'Unable to modify activation point';
    },
    {
      code: 6047;
      name: 'invalidAuthorityToCreateThePool';
      msg: 'Invalid authority to create the pool';
    },
    {
      code: 6048;
      name: 'invalidActivationType';
      msg: 'Invalid activation type';
    },
    {
      code: 6049;
      name: 'invalidActivationPoint';
      msg: 'Invalid activation point';
    },
    {
      code: 6050;
      name: 'preActivationSwapStarted';
      msg: 'Pre activation swap window started';
    },
    {
      code: 6051;
      name: 'invalidPoolType';
      msg: 'Invalid pool type';
    },
    {
      code: 6052;
      name: 'invalidQuoteMint';
      msg: 'Quote token must be SOL,USDC';
    },
    {
      code: 6053;
      name: 'invalidTokenMetadataProgram';
      msg: 'Invalid token metadata program';
    },
    {
      code: 6054;
      name: 'invalidPermission';
      msg: 'Invalid permission';
    },
    {
      code: 6055;
      name: 'invalidZapOutParameters';
      msg: 'Invalid zap out parameters';
    },
    {
      code: 6056;
      name: 'incorrectAta';
      msg: 'Incorrect ATA';
    },
    {
      code: 6057;
      name: 'invalidWithdrawProtocolFeeZapAccounts';
      msg: 'Invalid withdraw protocol fee zap accounts';
    },
    {
      code: 6058;
      name: 'mintRestrictedFromZap';
      msg: 'SOL,USDC protocol fee cannot be withdrawn via zap';
    },
    {
      code: 6059;
      name: 'cpiDisabled';
      msg: 'CPI disabled';
    },
    {
      code: 6060;
      name: 'missingZapOutInstruction';
      msg: 'Missing zap out instruction';
    },
    {
      code: 6061;
      name: 'invalidZapAccounts';
      msg: 'Invalid zap accounts';
    },
    {
      code: 6062;
      name: 'invalidClaimProtocolFeeAccounts';
      msg: 'Invalid claim protocol fee accounts';
    },
    {
      code: 6063;
      name: 'lpMintSupplyAccountingNotPatched';
      msg: 'Pool LP mint supply accounting is not patched';
    },
    {
      code: 6064;
      name: 'invalidLpOwner';
      msg: 'User is not the owner of the pool LP token account';
    },
    {
      code: 6065;
      name: 'invalidVaultLpSupplyAccounting';
      msg: 'Invalid vault LP supply accounting';
    },
  ];
  types: [
    {
      name: 'addLiquidity';
      docs: ['Add liquidity event'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'lpMintAmount';
            docs: ['LP amount user received upon add liquidity.'];
            type: 'u64';
          },
          {
            name: 'tokenAAmount';
            docs: ['Amount of token A user deposited.'];
            type: 'u64';
          },
          {
            name: 'tokenBAmount';
            docs: ['Amount of token B user deposited.'];
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'bootstrapLiquidity';
      docs: ['Bootstrap liquidity event'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'lpMintAmount';
            docs: ['LP amount user received upon add liquidity.'];
            type: 'u64';
          },
          {
            name: 'tokenAAmount';
            docs: ['Amount of token A user deposited.'];
            type: 'u64';
          },
          {
            name: 'tokenBAmount';
            docs: ['Amount of token B user deposited.'];
            type: 'u64';
          },
          {
            name: 'pool';
            docs: ['Pool address'];
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'bootstrapping';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'activationPoint';
            docs: ['Activation point, can be slot or timestamp'];
            type: 'u64';
          },
          {
            name: 'whitelistedVault';
            docs: ['Whitelisted vault to be able to buy pool before activation_point'];
            type: 'pubkey';
          },
          {
            name: 'poolCreator';
            docs: ['Need to store pool creator in lauch pool, so they can modify liquidity before activation_point'];
            type: 'pubkey';
          },
          {
            name: 'activationType';
            docs: ['Activation type, 0 means by slot, 1 means by timestamp'];
            type: 'u8';
          },
        ];
      };
    },
    {
      name: 'claimFee';
      docs: ['Claim fee'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'pool';
            docs: ['Pool address'];
            type: 'pubkey';
          },
          {
            name: 'owner';
            docs: ['Owner of lock escrow'];
            type: 'pubkey';
          },
          {
            name: 'amount';
            docs: ['Lp amount'];
            type: 'u64';
          },
          {
            name: 'aFee';
            docs: ['A fee'];
            type: 'u64';
          },
          {
            name: 'bFee';
            docs: ['B fee'];
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'claimProtocolFee2';
      docs: ['Claim protocol fee 2'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'pool';
            docs: ['Pool address'];
            type: 'pubkey';
          },
          {
            name: 'receiverTokenAccount';
            docs: ['Receiver token account'];
            type: 'pubkey';
          },
          {
            name: 'tokenMint';
            docs: ['Token mint'];
            type: 'pubkey';
          },
          {
            name: 'amount';
            docs: ['Amount of protocol fee being withdrawn'];
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'closeConfig';
      docs: ['Close config'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'config';
            docs: ['Config pubkey'];
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'config';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'poolFees';
            type: {
              defined: {
                name: 'poolFees';
              };
            };
          },
          {
            name: 'activationDuration';
            type: 'u64';
          },
          {
            name: 'vaultConfigKey';
            type: 'pubkey';
          },
          {
            name: 'poolCreatorAuthority';
            docs: [
              "Only pool_creator_authority can use the current config to initialize new pool. When it's Pubkey::default, it's a public config.",
            ];
            type: 'pubkey';
          },
          {
            name: 'activationType';
            docs: ['Activation type'];
            type: 'u8';
          },
          {
            name: 'partnerFeeNumerator';
            type: 'u64';
          },
          {
            name: 'padding';
            type: {
              array: ['u8', 219];
            };
          },
        ];
      };
    },
    {
      name: 'configParameters';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'tradeFeeNumerator';
            type: 'u64';
          },
          {
            name: 'protocolTradeFeeNumerator';
            type: 'u64';
          },
          {
            name: 'activationDuration';
            type: 'u64';
          },
          {
            name: 'vaultConfigKey';
            type: 'pubkey';
          },
          {
            name: 'poolCreatorAuthority';
            type: 'pubkey';
          },
          {
            name: 'activationType';
            type: 'u8';
          },
          {
            name: 'index';
            type: 'u64';
          },
          {
            name: 'partnerFeeNumerator';
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'createConfig';
      docs: ['Create config'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'tradeFeeNumerator';
            docs: ['New trade fee numerator'];
            type: 'u64';
          },
          {
            name: 'protocolTradeFeeNumerator';
            docs: ['New protocol fee numerator'];
            type: 'u64';
          },
          {
            name: 'config';
            docs: ['Config pubkey'];
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'createLockEscrow';
      docs: ['Create lock escrow'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'pool';
            docs: ['Pool address'];
            type: 'pubkey';
          },
          {
            name: 'owner';
            docs: ['Owner of lock escrow'];
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'curveType';
      docs: ['Type of the swap curve'];
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'constantProduct';
          },
          {
            name: 'stable';
            fields: [
              {
                name: 'amp';
                docs: ['Amplification coefficient'];
                type: 'u64';
              },
              {
                name: 'tokenMultiplier';
                docs: [
                  'Multiplier for the pool token. Used to normalized token with different decimal into the same precision.',
                ];
                type: {
                  defined: {
                    name: 'tokenMultiplier';
                  };
                };
              },
              {
                name: 'depeg';
                docs: [
                  'Depeg pool information. Contains functions to allow token amount to be repeg using stake / interest bearing token virtual price',
                ];
                type: {
                  defined: {
                    name: 'depeg';
                  };
                };
              },
              {
                name: 'lastAmpUpdatedTimestamp';
                docs: [
                  'The last amp updated timestamp. Used to prevent update_curve_info called infinitely many times within a short period',
                ];
                type: 'u64';
              },
            ];
          },
        ];
      };
    },
    {
      name: 'customizableParams';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'tradeFeeNumerator';
            docs: ['Trading fee.'];
            type: 'u32';
          },
          {
            name: 'activationPoint';
            docs: ['The pool start trading.'];
            type: {
              option: 'u64';
            };
          },
          {
            name: 'hasAlphaVault';
            docs: ['Whether the pool support alpha vault'];
            type: 'bool';
          },
          {
            name: 'activationType';
            docs: ['Activation type'];
            type: 'u8';
          },
          {
            name: 'padding';
            docs: ['padding'];
            type: {
              array: ['u8', 90];
            };
          },
        ];
      };
    },
    {
      name: 'depeg';
      docs: ['Contains information for depeg pool'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'baseVirtualPrice';
            docs: ['The virtual price of staking / interest bearing token'];
            type: 'u64';
          },
          {
            name: 'baseCacheUpdated';
            docs: ['The last time base_virtual_price is updated'];
            type: 'u64';
          },
          {
            name: 'depegType';
            docs: ['Type of the depeg pool'];
            type: {
              defined: {
                name: 'depegType';
              };
            };
          },
        ];
      };
    },
    {
      name: 'depegType';
      docs: ['Type of depeg pool'];
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'none';
          },
          {
            name: 'marinade';
          },
          {
            name: 'lido';
          },
          {
            name: 'splStake';
          },
        ];
      };
    },
    {
      name: 'lock';
      docs: ['lock'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'pool';
            docs: ['Pool address'];
            type: 'pubkey';
          },
          {
            name: 'owner';
            docs: ['Owner of lock escrow'];
            type: 'pubkey';
          },
          {
            name: 'amount';
            docs: ['Locked amount'];
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'lockEscrow';
      docs: ['State of lock escrow account'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'pool';
            docs: ['Pool address'];
            type: 'pubkey';
          },
          {
            name: 'owner';
            docs: ['Owner address'];
            type: 'pubkey';
          },
          {
            name: 'escrowVault';
            docs: ['Vault address, store the lock user lock'];
            type: 'pubkey';
          },
          {
            name: 'bump';
            docs: ['bump, used to sign'];
            type: 'u8';
          },
          {
            name: 'totalLockedAmount';
            docs: ['Total locked amount'];
            type: 'u64';
          },
          {
            name: 'lpPerToken';
            docs: ['Lp per token, virtual price of lp token'];
            type: 'u128';
          },
          {
            name: 'unclaimedFeePending';
            docs: ['Unclaimed fee pending'];
            type: 'u64';
          },
          {
            name: 'aFee';
            docs: ['Total a fee claimed so far'];
            type: 'u64';
          },
          {
            name: 'bFee';
            docs: ['Total b fee claimed so far'];
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'lockedProfitTracker';
      docs: ['LockedProfitTracker struct'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'lastUpdatedLockedProfit';
            docs: ['The total locked profit from the last report'];
            type: 'u64';
          },
          {
            name: 'lastReport';
            docs: ['The last timestamp (in seconds) rebalancing'];
            type: 'u64';
          },
          {
            name: 'lockedProfitDegradation';
            docs: ['Rate per second of degradation'];
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'migrateFeeAccount';
      docs: ['Migrate fee account event'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'pool';
            docs: ['Pool address'];
            type: 'pubkey';
          },
          {
            name: 'newAdminTokenAFee';
            docs: ['New admin token a fee'];
            type: 'pubkey';
          },
          {
            name: 'newAdminTokenBFee';
            docs: ['New admin token b fee'];
            type: 'pubkey';
          },
          {
            name: 'tokenAAmount';
            docs: ['Transfer token a fee amount'];
            type: 'u64';
          },
          {
            name: 'tokenBAmount';
            docs: ['Transfer token b fee amount'];
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'operator';
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'whitelistedAddress';
            type: 'pubkey';
          },
          {
            name: 'permission';
            type: 'u128';
          },
          {
            name: 'padding';
            type: {
              array: ['u64', 2];
            };
          },
        ];
      };
    },
    {
      name: 'overrideCurveParam';
      docs: ['Override curve param event'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'newAmp';
            docs: ['The new amplification for stable curve'];
            type: 'u64';
          },
          {
            name: 'updatedTimestamp';
            docs: ['Updated timestamp'];
            type: 'u64';
          },
          {
            name: 'pool';
            docs: ['Pool address'];
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'padding';
      docs: ['Padding for future pool fields'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'padding0';
            docs: ['Padding 0'];
            type: {
              array: ['u8', 6];
            };
          },
          {
            name: 'padding1';
            docs: ['Padding 1'];
            type: {
              array: ['u64', 20];
            };
          },
          {
            name: 'padding2';
            docs: ['Padding 2'];
            type: {
              array: ['u64', 21];
            };
          },
        ];
      };
    },
    {
      name: 'partnerClaimFees';
      docs: ['Partner claim fees'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'pool';
            docs: ['Pool address'];
            type: 'pubkey';
          },
          {
            name: 'feeA';
            docs: ['Fee B'];
            type: 'u64';
          },
          {
            name: 'feeB';
            docs: ['Fee B'];
            type: 'u64';
          },
          {
            name: 'partner';
            docs: ['Partner'];
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'partnerInfo';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'feeNumerator';
            type: 'u64';
          },
          {
            name: 'partnerAuthority';
            type: 'pubkey';
          },
          {
            name: 'pendingFeeA';
            type: 'u64';
          },
          {
            name: 'pendingFeeB';
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'pool';
      docs: ['State of pool account'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'lpMint';
            docs: ['LP token mint of the pool'];
            type: 'pubkey';
          },
          {
            name: 'tokenAMint';
            docs: ['Token A mint of the pool. Eg: USDT'];
            type: 'pubkey';
          },
          {
            name: 'tokenBMint';
            docs: ['Token B mint of the pool. Eg: USDC'];
            type: 'pubkey';
          },
          {
            name: 'aVault';
            docs: [
              'Vault account for token A. Token A of the pool will be deposit / withdraw from this vault account.',
            ];
            type: 'pubkey';
          },
          {
            name: 'bVault';
            docs: [
              'Vault account for token B. Token B of the pool will be deposit / withdraw from this vault account.',
            ];
            type: 'pubkey';
          },
          {
            name: 'aVaultLp';
            docs: [
              'LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
            ];
            type: 'pubkey';
          },
          {
            name: 'bVaultLp';
            docs: [
              'LP token account of vault B. Used to receive/burn the vault LP upon deposit/withdraw from the vault.',
            ];
            type: 'pubkey';
          },
          {
            name: 'aVaultLpBump';
            docs: ['"A" vault lp bump. Used to create signer seeds.'];
            type: 'u8';
          },
          {
            name: 'enabled';
            docs: ['Flag to determine whether the pool is enabled, or disabled.'];
            type: 'bool';
          },
          {
            name: 'protocolTokenAFee';
            docs: ['Protocol fee token account for token A. Used to receive trading fee.'];
            type: 'pubkey';
          },
          {
            name: 'protocolTokenBFee';
            docs: ['Protocol fee token account for token B. Used to receive trading fee.'];
            type: 'pubkey';
          },
          {
            name: 'feeLastUpdatedAt';
            docs: ['Fee last updated timestamp'];
            type: 'u64';
          },
          {
            name: 'padding0';
            type: {
              array: ['u8', 24];
            };
          },
          {
            name: 'fees';
            docs: ['Store the fee charges setting.'];
            type: {
              defined: {
                name: 'poolFees';
              };
            };
          },
          {
            name: 'poolType';
            docs: ['Pool type'];
            type: {
              defined: {
                name: 'poolType';
              };
            };
          },
          {
            name: 'stake';
            docs: ['Stake pubkey of SPL stake pool'];
            type: 'pubkey';
          },
          {
            name: 'totalLockedLp';
            docs: ['Total locked lp token'];
            type: 'u64';
          },
          {
            name: 'bootstrapping';
            docs: ['bootstrapping config'];
            type: {
              defined: {
                name: 'bootstrapping';
              };
            };
          },
          {
            name: 'partnerInfo';
            type: {
              defined: {
                name: 'partnerInfo';
              };
            };
          },
          {
            name: 'lpMintSupply';
            docs: ['LP mint supply tracked by the pool'];
            type: 'u64';
          },
          {
            name: 'padding';
            docs: ['Padding for future pool field'];
            type: {
              defined: {
                name: 'padding';
              };
            };
          },
          {
            name: 'curveType';
            docs: ['The type of the swap curve supported by the pool.'];
            type: {
              defined: {
                name: 'curveType';
              };
            };
          },
        ];
      };
    },
    {
      name: 'poolCreated';
      docs: ['New pool created event'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'lpMint';
            docs: ['LP token mint of the pool'];
            type: 'pubkey';
          },
          {
            name: 'tokenAMint';
            docs: ['Token A mint of the pool. Eg: USDT'];
            type: 'pubkey';
          },
          {
            name: 'tokenBMint';
            docs: ['Token B mint of the pool. Eg: USDC'];
            type: 'pubkey';
          },
          {
            name: 'poolType';
            docs: ['Pool type'];
            type: {
              defined: {
                name: 'poolType';
              };
            };
          },
          {
            name: 'pool';
            docs: ['Pool address'];
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'poolEnabled';
      docs: ['Pool enabled state change event'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'pool';
            docs: ['Pool address'];
            type: 'pubkey';
          },
          {
            name: 'enabled';
            docs: ['Pool enabled state'];
            type: 'bool';
          },
        ];
      };
    },
    {
      name: 'poolFees';
      docs: ['Information regarding fee charges'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'tradeFeeNumerator';
            docs: [
              'Trade fees are extra token amounts that are held inside the token',
              'accounts during a trade, making the value of liquidity tokens rise.',
              'Trade fee numerator',
            ];
            type: 'u64';
          },
          {
            name: 'tradeFeeDenominator';
            docs: ['Trade fee denominator'];
            type: 'u64';
          },
          {
            name: 'protocolTradeFeeNumerator';
            docs: [
              'Protocol trading fees are extra token amounts that are held inside the token',
              'accounts during a trade, with the equivalent in pool tokens minted to',
              'the protocol of the program.',
              'Protocol trade fee numerator',
            ];
            type: 'u64';
          },
          {
            name: 'protocolTradeFeeDenominator';
            docs: ['Protocol trade fee denominator'];
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'poolInfo';
      docs: ['Pool info event'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'tokenAAmount';
            docs: ['Total token A amount in the pool'];
            type: 'u64';
          },
          {
            name: 'tokenBAmount';
            docs: ['Total token B amount in the pool'];
            type: 'u64';
          },
          {
            name: 'virtualPrice';
            docs: ['Current virtual price'];
            type: 'f64';
          },
          {
            name: 'currentTimestamp';
            docs: ['Current unix timestamp'];
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'poolType';
      docs: ['Pool type'];
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'permissioned';
          },
          {
            name: 'permissionless';
          },
        ];
      };
    },
    {
      name: 'removeLiquidity';
      docs: ['Remove liquidity event'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'lpUnmintAmount';
            docs: ['LP amount burned from user upon add remove liquidity.'];
            type: 'u64';
          },
          {
            name: 'tokenAOutAmount';
            docs: ['Amount of token A user received.'];
            type: 'u64';
          },
          {
            name: 'tokenBOutAmount';
            docs: ['Amount of token B user received.'];
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'setPoolFees';
      docs: ['Set pool fees event'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'tradeFeeNumerator';
            docs: ['New trade fee numerator'];
            type: 'u64';
          },
          {
            name: 'tradeFeeDenominator';
            docs: ['New trade fee denominator'];
            type: 'u64';
          },
          {
            name: 'protocolTradeFeeNumerator';
            docs: ['New protocol fee numerator'];
            type: 'u64';
          },
          {
            name: 'protocolTradeFeeDenominator';
            docs: ['New protocol fee denominator'];
            type: 'u64';
          },
          {
            name: 'pool';
            docs: ['Pool address'];
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'swap';
      docs: ['Swap event'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'inAmount';
            docs: ['Token amount user deposited to the pool for token exchange.'];
            type: 'u64';
          },
          {
            name: 'outAmount';
            docs: ['Token amount user received from the pool.'];
            type: 'u64';
          },
          {
            name: 'tradeFee';
            docs: ['Trading fee charged for liquidity provider.'];
            type: 'u64';
          },
          {
            name: 'protocolFee';
            docs: ['Trading fee charged for the protocol.'];
            type: 'u64';
          },
          {
            name: 'hostFee';
            docs: ['Host fee charged'];
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'tokenMultiplier';
      docs: ['Multiplier for the pool token. Used to normalized token with different decimal into the same precision.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'tokenAMultiplier';
            docs: ['Multiplier for token A of the pool.'];
            type: 'u64';
          },
          {
            name: 'tokenBMultiplier';
            docs: ['Multiplier for token B of the pool.'];
            type: 'u64';
          },
          {
            name: 'precisionFactor';
            docs: [
              'Record the highest token decimal in the pool. For example, Token A is 6 decimal, token B is 9 decimal. This will save value of 9.',
            ];
            type: 'u8';
          },
        ];
      };
    },
    {
      name: 'transferAdmin';
      docs: ['Transfer admin event'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'admin';
            docs: ['Old admin of the pool'];
            type: 'pubkey';
          },
          {
            name: 'newAdmin';
            docs: ['New admin of the pool'];
            type: 'pubkey';
          },
          {
            name: 'pool';
            docs: ['Pool address'];
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'vault';
      docs: ['Vault struct'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'enabled';
            docs: [
              'The flag, if admin set enable = false, then the user can only withdraw and cannot deposit in the vault.',
            ];
            type: 'u8';
          },
          {
            name: 'bumps';
            docs: ['Vault nonce, to create vault seeds'];
            type: {
              defined: {
                name: 'vaultBumps';
              };
            };
          },
          {
            name: 'totalAmount';
            docs: [
              'The total liquidity of the vault, including remaining tokens in token_vault and the liquidity in all strategies.',
            ];
            type: 'u64';
          },
          {
            name: 'tokenVault';
            docs: ['Token account, hold liquidity in vault reserve'];
            type: 'pubkey';
          },
          {
            name: 'feeVault';
            docs: [
              'Hold lp token of vault, each time rebalance crank is called, vault calculate performance fee and mint corresponding lp token amount to fee_vault. fee_vault is owned by treasury address',
            ];
            type: 'pubkey';
          },
          {
            name: 'tokenMint';
            docs: ['Token mint that vault supports'];
            type: 'pubkey';
          },
          {
            name: 'lpMint';
            docs: ['Lp mint of vault'];
            type: 'pubkey';
          },
          {
            name: 'strategies';
            docs: [
              'The list of strategy addresses that vault supports, vault can support up to MAX_STRATEGY strategies at the same time.',
            ];
            type: {
              array: ['pubkey', 29];
            };
          },
          {
            name: 'version';
            docs: [
              'Vault version. 0 = legacy (LP supply from lp_mint.supply), 1 = LP supply tracked in `total_lp_supply`',
            ];
            type: 'u8';
          },
          {
            name: 'totalLpSupply';
            docs: ['Total LP supply tracked by the vault (only valid when version = 1)'];
            type: 'u64';
          },
          {
            name: 'padding0';
            docs: ['Padding, keeps the layout compatible with the legacy 30th strategy slot'];
            type: {
              array: ['u8', 23];
            };
          },
          {
            name: 'base';
            docs: ['The base address to create vault seeds'];
            type: 'pubkey';
          },
          {
            name: 'admin';
            docs: ['Admin of vault'];
            type: 'pubkey';
          },
          {
            name: 'operator';
            docs: [
              'Person who can send the crank. Operator can only send liquidity to strategies that admin defined, and claim reward to account of treasury address',
            ];
            type: 'pubkey';
          },
          {
            name: 'lockedProfitTracker';
            docs: ['Stores information for locked profit.'];
            type: {
              defined: {
                name: 'lockedProfitTracker';
              };
            };
          },
        ];
      };
    },
    {
      name: 'vaultBumps';
      docs: ['Vault bumps struct'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'vaultBump';
            docs: ['vaultBump'];
            type: 'u8';
          },
          {
            name: 'tokenVaultBump';
            docs: ['tokenVaultBump'];
            type: 'u8';
          },
        ];
      };
    },
    {
      name: 'withdrawProtocolFees';
      docs: ['Withdraw protocol fees'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'pool';
            docs: ['Pool address'];
            type: 'pubkey';
          },
          {
            name: 'protocolAFee';
            docs: ['Protocol A fee being withdrawn'];
            type: 'u64';
          },
          {
            name: 'protocolBFee';
            docs: ['Protocol B fee being withdrawn'];
            type: 'u64';
          },
          {
            name: 'protocolAFeeOwner';
            docs: ['Protocol A fee owner'];
            type: 'pubkey';
          },
          {
            name: 'protocolBFeeOwner';
            docs: ['Protocol B fee owner'];
            type: 'pubkey';
          },
        ];
      };
    },
  ];
};
