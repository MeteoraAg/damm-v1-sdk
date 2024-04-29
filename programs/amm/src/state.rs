//! Pool account state

use crate::curve::curve_type::CurveType;
use crate::curve::fees::PoolFees;
use anchor_lang::prelude::*;
use std::fmt::Debug;

#[derive(AnchorSerialize, AnchorDeserialize, Default, Debug, Clone, Copy)]
/// Padding for future pool fields
pub struct Padding {
    /// Padding 0
    pub padding_0: [u8; 7], // 7
    /// Padding 1
    pub padding: [u128; 29], // 464
}

/// Pool type
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum PoolType {
    /// Permissioned
    Permissioned,
    /// Permissionless
    Permissionless,
}
impl Default for PoolType {
    fn default() -> Self {
        PoolType::Permissioned
    }
}

#[account]
#[derive(Default, Debug)]
/// State of pool account
pub struct Pool {
    /// LP token mint of the pool
    pub lp_mint: Pubkey, //32
    /// Token A mint of the pool. Eg: USDT
    pub token_a_mint: Pubkey, //32
    /// Token B mint of the pool. Eg: USDC
    pub token_b_mint: Pubkey, //32
    /// Vault account for token A. Token A of the pool will be deposit / withdraw from this vault account.
    pub a_vault: Pubkey, //32
    /// Vault account for token B. Token B of the pool will be deposit / withdraw from this vault account.
    pub b_vault: Pubkey, //32
    /// LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault.
    pub a_vault_lp: Pubkey, //32
    /// LP token account of vault B. Used to receive/burn the vault LP upon deposit/withdraw from the vault.
    pub b_vault_lp: Pubkey, //32
    /// "A" vault lp bump. Used to create signer seeds.
    pub a_vault_lp_bump: u8, //1
    /// Flag to determine whether the pool is enabled, or disabled.
    pub enabled: bool, //1
    /// Admin fee token account for token A. Used to receive trading fee.
    pub admin_token_a_fee: Pubkey, //32
    /// Admin fee token account for token B. Used to receive trading fee.
    pub admin_token_b_fee: Pubkey, //32
    /// Owner of the pool.
    pub admin: Pubkey, //32
    /// Store the fee charges setting.
    pub fees: PoolFees, //48
    /// Pool type
    pub pool_type: PoolType,
    /// Stake pubkey of SPL stake pool
    pub stake: Pubkey,
    /// Total locked lp token
    pub total_locked_lp: u64,
    /// Padding for future pool field
    pub padding: Padding, // 512 Refer: curve_type.rs for the test
    /// The type of the swap curve supported by the pool.
    // Leaving curve_type as last field give us the flexibility to add specific curve information / new curve type
    pub curve_type: CurveType, //9
}

#[account]
#[derive(Default, Debug)]
/// State of lock escrow account
pub struct LockEscrow {
    /// Pool address
    pub pool: Pubkey,
    /// Owner address
    pub owner: Pubkey,
    /// Vault address, store the lock user lock
    pub escrow_vault: Pubkey,
    /// bump, used to sign
    pub bump: u8,
    /// Total locked amount
    pub total_locked_amount: u64,
    /// Lp per token, virtual price of lp token
    pub lp_per_token: u128,
    /// Unclaimed fee pending
    pub unclaimed_fee_pending: u64,
    /// Total a fee claimed so far
    pub a_fee: u64,
    /// Total b fee claimed so far
    pub b_fee: u64,
}
