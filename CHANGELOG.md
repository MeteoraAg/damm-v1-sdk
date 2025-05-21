# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

## @meteora-ag/dynamic-amm-sdk [1.3.8] - PR[#218](https://github.com/MeteoraAg/dynamic-amm-sdk/pull/218)

### Changed

- update `@meteora-ag/m3m3` version

## @meteora-ag/dynamic-amm-sdk [1.3.7] - PR[#217](https://github.com/MeteoraAg/dynamic-amm-sdk/pull/217)

### Fixed

- Fix `createPermissionlessConstantProductPoolWithConfig2` to allow user to pass in fee farm configuration value

## @meteora-ag/dynamic-amm-sdk [1.3.3] - PR[#209](https://github.com/MeteoraAg/dynamic-amm-sdk/pull/209)

### Changed

- update readme

## @meteora-ag/dynamic-amm-sdk [1.3.2] - PR[#206](https://github.com/MeteoraAg/dynamic-amm-sdk/pull/206)

### Changed

- Bump `@meteora-ag/m3m3`

## commons [0.0.5] - PR[#195](https://github.com/MeteoraAG/dynamic-amm-sdk/pull/195)

### Added

- PDA helpers to derive accounts for dynamic amm and vault

## @meteora-ag/dynamic-amm-sdk [1.3.1] - PR[#202](https://github.com/MeteoraAg/dynamic-amm-sdk/pull/202)

### Added

- added `moveLockedLP` to transfers locked LP tokens from one owner's escrow to another owner's escrow

## @meteora-ag/dynamic-amm-sdk [1.3.0] - PR[#198](https://github.com/MeteoraAg/dynamic-amm-sdk/pull/198)

### Security

- remove `@solana/spl-token-registry` usage

## @meteora-ag/dynamic-amm-sdk [1.2.1] - PR[#197](https://github.com/MeteoraAg/dynamic-amm-sdk/pull/197)

### Security

- update `@meteora-ag/vault-sdk` version

## @meteora-ag/dynamic-amm-sdk [1.2.0] - PR[#196](https://github.com/MeteoraAg/dynamic-amm-sdk/pull/196)

### Changed

- move to `meteora-ag` org

## @mercurial-finance/dynamic-amm-sdk [1.1.23] - PR[#192](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/192)

### Changed

- Added new parameter `memecoinInfo.isMinted` to `createPermissionlessConstantProductMemecoinPoolWithConfig` to allow creating a fee vault with minted token

## @mercurial-finance/dynamic-amm-sdk [1.1.22] - PR[#191](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/191)

### Added

- Bump `@solana/web3.js`

## @mercurial-finance/dynamic-amm-sdk [1.1.21] - PR[#190](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/190)

### Added

- Update `@meteora-ag/m3m3@1.0.4`

## @mercurial-finance/dynamic-amm-sdk [1.1.20] - PR[#183](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/183)

### Changed

- Use optimal CU when creating pool instead of requesting max CU

## dynamic-amm [0.6.1] - PR [180](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/180)

### Added

- Add a new endpoint `initialize_customizable_permissionless_constant_product_pool`, that allows pool creator to be able to set trading fee, activation_point and alpha-vault
- Add a new endpoint `partner_claim_fees`, that allows pool creator (a.k.a partner) to claim profit shared from the protocol fees.

### Changed

- Endpoint `create_config` require `partner_fee_numerator`. It's used to share portion of protocol fee to the partner (pool_authority)
- New field `PartnerInfo` in `Pool` account. It stores the information of the partner for profit sharing.

## @mercurial-finance/dynamic-amm-sdk [1.1.19] - PR[#180](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/180)

### Added

- `partnerClaimFees` function to allow partner to claim partner profit shared from the protocol fees
- `createCustomizablePermissionlessConstantProductPool` function to allow user to create constant product pool with customizable trading fee, activation point, activation type, and alpha vault.

### Changed

- `createConfig` function require new parameter `partnerFeeNumerator`. It's used to share portion of protocol fee to the partner (pool_authority)

## @mercurial-finance/dynamic-amm-sdk [1.1.18] - PR[#185](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/185)

### Fixed

- Fix `calculateLockAmounts` util not calculating `userLockAmount` correctly if `feeWrapperRatio` is `null` or zero

## @mercurial-finance/dynamic-amm-sdk [1.1.17] - PR[#183](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/183)

### Changed

- Unified all getLatestBlockhash in all the functions

## @mercurial-finance/dynamic-amm-sdk [1.1.16] - PR[#182](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/182)

### Added

- Update ` @meteora-ag/stake-for-fee@1.0.28`

## @mercurial-finance/dynamic-amm-sdk [1.1.15] - PR[#178](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/178)

### Added

- Update ` @meteora-ag/stake-for-fee@1.0.26`

## @mercurial-finance/dynamic-amm-sdk [1.1.14] - PR[#177](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/177)

### Added

- Fix function `swapAndStakeForFee` to accept additional param `inAmountLamport`

## @mercurial-finance/dynamic-amm-sdk [1.1.13] - PR[#176](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/176)

### Added

- Fix function `swapAndStakeForFee`

## @mercurial-finance/dynamic-amm-sdk [1.1.12] - PR[#173](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/173)

### Added

- New function `swapAndStakeForFee`

## @mercurial-finance/dynamic-amm-sdk [1.1.11] - PR[#170](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/170)

### Fixed

- Fix user lock amount was 0

## @mercurial-finance/dynamic-amm-sdk [1.1.10] - PR[#174](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/174)

### Changed

- Allow `startClaimFeeTimestamp` to be set as null to start the claim immediately.

## @mercurial-finance/dynamic-amm-sdk [1.1.9] - PR[#173](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/168)

### Changed

- bump `@meteora-ag/stake-for-fee` version

## @mercurial-finance/dynamic-amm-sdk [1.1.8] - PR[#173](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/168)

### Changed

- Added new parameter `opts.feeVault` for `createPermissionlessConstantProductMemecoinPoolWithConfig` to allow create fee vault with parameters

## dynamic-amm-quote - PR[#171](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/171)

### Fixed

- Fix `compute_quote` result doesn't matches simulation result

## @mercurial-finance/dynamic-amm-sdk [1.1.7] - PR[#168](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/168)

### Added

- Added `createPermissionlessConstantProductMemecoinPoolWithConfig` that include create mint instruction for create pool

## @mercurial-finance/dynamic-amm-sdk [1.1.6] - PR[#161](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/163)

### Added

- Added `poolFees` in `getFeeConfigurations` function

## @mercurial-finance/dynamic-amm-sdk [1.1.5] - PR[#161](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/163)

### Added

- Swap options on create pool config
- Added `calculateSwapQuoteForGoingToCreateMemecoinPool` to allow swap quote on going to be created pool.

## @mercurial-finance/dynamic-amm-sdk [1.1.4] - PR[#161](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/164)

### Changed

- Added extra param `swapInitiator` for `getSwapQuote` function

## @mercurial-finance/dynamic-amm-sdk [1.1.3] - PR[#161](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/161)

### Changed

- update readme

## @mercurial-finance/dynamic-amm-sdk [1.1.2] - PR[#158](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/158)

### Changed

- options to skip preinstruction create associated token account in `createPermissionlessConstantProductPoolWithConfig` function

## @mercurial-finance/dynamic-amm-sdk [1.1.1] - PR[#157](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/157)

### Fixed

- Fix locked LP pending claim fee calculation

## dynamic-amm-quote [0.0.3] - PR[#151](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/151)

### Changed

- Throw error if the pool is disabled, or not activated for trading yet.

## dynamic-amm [0.6.0] - PR[#151](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/151)

### Added

- Added `activation_type` field to `Bootstrapping` (previously known as `AlphaVault`). Used to determine whether the pool is activated by slot or timestamp.
- Added `update_activation_point` endpoint. Admin only.
- Added `initialize_permissionless_constant_product_pool_with_config2` endpoint. Allow user to create constant product pool with `activation_point` set earlier than the default `activation_point` derived from the config.

### Changed

- Renamed `AlphaVault` structure to `Bootstrapping`
- Renamed `AlphaVaultConfig` to `BootstrappingConfig`
- Renamed `activation_duration_in_slot` to `activation_duration`. The duration will be in slot or timestamp, based on `activation_type`

### Deprecated

- `pool_creator` field of `AlphaVault` structure.

## @mercurial-finance/dynamic-amm-sdk [1.1.0] - PR[#151](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/151)

### Added

- Added `createPermissionlessConstantProductPoolWithConfig2`. Allow user to create constant product pool with `activation_point` set earlier than the default `activation_point` derived from the config.

### Changed

- `createConfig` require new parameter `ActivationType`
- Renamed `AlphaVault` to `Bootstrapping`
- Renamed `ActivationDurationInSlot` to `ActivationDuration`
- `calculateSwapQuote` require new parameter `currentSlot`
- Swap quote throw error if the pool is disabled, or not activated for trading yet.

## @mercurial-finance/dynamic-amm-sdk [1.0.5] - PR [#155](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/155)

### Changed

- update vault-sdk version

## @mercurial-finance/dynamic-amm-sdk [1.0.4] - PR [#154](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/154)

### Changed

- optimize `create` & `createMultiple` function for rpc call

## @mercurial-finance/dynamic-amm-sdk [1.0.2] - PR [#153](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/153)

### Fixed

- `create` function not working

## dynamic-amm [0.5.0] - PR[#149](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/149)

### Changed

- Rename `admin` to `fee_operator` in `set_pool_fee` account context.
- Removed deprecated field `admin` in pool state. It has been replaced by `fee_last_updated_at`.

## @mercurial-finance/dynamic-amm-sdk [1.0.2] - PR[#149](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/149)

### Changed

- Update idl

## @mercurial-finance/dynamic-amm-sdk [1.0.1] - PR [#150](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/150)

### Added

- `searchPoolsByToken`, search pool by passing token mint address

## @mercurial-finance/dynamic-amm-sdk [1.0.0] - PR [#148](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/148)

### Changed

- Refactor `AmmImpl.create` function to use only 2 arguments: provider, poolAddress
- Add 2 examples for ts-client: swap, get_pool_info
- Update @mercurial-finance/vault-sdk to version 2.0.0
- Use tokenMint instead of tokenInfo in most cases
- Provide address and decimals in tokenAMint and tokenBMint
- Differentiate tokenMint and tokenAddress(PublickKey Only)

## @mercurial-finance/dynamic-amm-sdk [0.5.0] - PR [#144](https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/pull/144)

### Changed

- Pump "@solana/spl-token" to 0.4.6 and various relevant packages

## @mercurial-finance/dynamic-amm-sdk [0.4.13] - PR #147

### Deprecated

- deprecated field `admin` in pool state

### Changed

- remove endpoint `transfer_admin`
- All permissioned operations now can be signed from any address in the group of admins instead of a single admin key

## @mercurial-finance/dynamic-amm-sdk [0.4.29] - PR #146

### Fixed

- Fixed `Invalid option nextEpochFee` error when decode LST pool stake pool nextEpochFee

## @mercurial-finance/dynamic-amm-sdk [0.4.28] - PR #145

### Changed

- `getUserLockEscrow` no longer need to pass `lockEscrowAccount` as param

## @mercurial-finance/dynamic-amm-sdk [0.4.27] - PR #142

### Added

- Use `getPoolConfigsWithPoolCreatorAuthority` to retrieve the pool configuration for a specific user. When the pool configuration returned from `getPoolConfigsWithPoolCreatorAuthority` is passed into `createPermissionlessConstantProductPoolWithConfig`, only that user can create pools. Please contact meteora team if you're not whitelisted for the config.

## @mercurial-finance/dynamic-amm-sdk [0.4.26] - PR #139

### Changed

-`lockLiquidity` function is able to specify feePayer

## @mercurial-finance/dynamic-amm-sdk [0.4.25] - PR #132

### Added

- `getPoolConfig` to get pool config based on config pubkey
- `checkPoolWithConfigsExists` now accepts array of config pubkey

## @mercurial-finance/dynamic-amm-sdk [0.4.23] - PR #125

### Changed

- Protocol fee is now part of LP trade fee.
- update swap function `referralToken` param to `referralOwner`

### Added

- `AmmImpl.createPermissionlessConstantProductPoolWithConfig` to create constant product pool based on `config` account.
- `AmmImpl.getFeeConfigurations` to get all fee configurations to be used in `AmmImpl.createPermissionlessConstantProductPoolWithConfig`

## @mercurial-finance/dynamic-amm-sdk [0.4.22] - PR #117

### Added

- `swap` method param `referrerToken` is non-ATA address.
- `AmmImpl.lockLiquidityNewlyCreatedPool` method to help lock liquidity for pool that haven't been created yet
- `skipAta` flag to help skipping check for create ata when creating the pool in `AmmImpl.createPermissionlessPool`

## dynamic-amm [0.1.1] - PR #125

### Added

- Program endpoint `initialize_permissionless_constant_product_pool_with_config`. Able to create constant product pool based on `config` account.
- Program endpoint `create_config`. Config account store default fee configuration to be used in program endpoint `initialize_permissionless_constant_product_pool_with_config`.
- Program endpoint `remove_config`. Remove unused / misconfigured config account.
- Account `config`. Used to store default fee configuration.

### Changed

- Protocol fee is now part of LP trade fee.
- Rename of all `owner_trade_fee` related variables to `protocol_trade_fee`

### Removed

- `MigrateFeeAccount` and `SetAdminFeeAccount` event

## @mercurial-finance/dynamic-amm-sdk [0.4.21] - PR #117

### Added

- Introduced a new lock escrow mechanism supported by the program.
- `AmmImpl.getLockedAtaAmount` to retrieve locked LP amounts from the ATA mechanism (old mechanism).
- `AmmImpl.getLockedLpAmount` to fetch locked LP amounts from two versions of locking: ATA (old) and escrow (new), and then sum them.
- `AmmImpl.getUserLockEscrow` to obtain the user's lock escrow state.
- `AmmImpl.lockLiquidity` to lock the user's LP into the lock escrow.
- `AmmImpl.claimLockFee` to claim fees from locked LPs in the lock escrow.

## dynamic-amm [0.1.2] - PR #134

### Changed

- Protocol fee is now part of LP trade fee.
- update swap function `referralToken` param to `referralOwner`

### Added

- `AmmImpl.createPermissionlessConstantProductPoolWithConfig` to create constant product pool based on `config` account.
- `AmmImpl.getFeeConfigurations` to get all fee configurations to be used in `AmmImpl.createPermissionlessConstantProductPoolWithConfig`

## dynamic-amm [1.3.5] - PR #215

### Changed

- `AmmImpl.claimLockFee` to include `receiver` and `payer` parameters to indicate the receiver and payer of the fees.

## dynamic-amm [1.3.6] - PR #216

### Changed

- `AmmImpl.claimLockFee` to include `tempWSolAcc` parameter to indicate the temporary SOL account to receive the WSOL transaction fee.
- `unwrapSolInstruction` to include `receiver` parameter to indicate the receiver of the unwrapped SOL.
