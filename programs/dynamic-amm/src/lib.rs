//! Mercurial Dynamic AMM
#![deny(rustdoc::all)]
#![allow(rustdoc::missing_doc_code_examples)]
#![warn(clippy::unwrap_used)]
#![warn(clippy::integer_arithmetic)]
#![allow(warnings)]

pub mod constants;
pub mod error;
pub mod event;
pub mod instructions;
pub mod seed;
pub mod state;

use crate::state::CurveType;
use crate::state::PoolFees;
use anchor_lang::prelude::*;
use instructions::*;
#[cfg(feature = "staging")]
declare_id!("ammbh4CQztZ6txJ8AaQgPsWjd6o7GhmvopS2JAo5bCB");

#[cfg(not(feature = "staging"))]
declare_id!("Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB");

/// Program for AMM
#[program]
pub mod dynamic_amm {
    use super::*;

    /// Initialize a new permissionless pool.
    pub fn initialize_permissionless_pool(
        ctx: Context<InitializePermissionlessPool>,
        curve_type: CurveType,
        token_a_amount: u64,
        token_b_amount: u64,
    ) -> Result<()> {
        Ok(())
    }

    /// Initialize permissionless pool with customizable params
    pub fn initialize_customizable_permissionless_constant_product_pool(
        ctx: Context<InitializeCustomizablePermissionlessConstantProductPool>,
        token_a_amount: u64,
        token_b_amount: u64,
        params: CustomizableParams,
    ) -> Result<()> {
        Ok(())
    }

    /// Initialize a new permissionless pool with customized fee tier
    pub fn initialize_permissionless_pool_with_fee_tier(
        ctx: Context<InitializePermissionlessPoolWithFeeTier>,
        curve_type: CurveType,
        trade_fee_bps: u64,
        token_a_amount: u64,
        token_b_amount: u64,
    ) -> Result<()> {
        Ok(())
    }

    /// Partner claim fee
    pub fn partner_claim_fee(
        ctx: Context<PartnerClaimFees>,
        max_amount_a: u64,
        max_amount_b: u64,
    ) -> Result<()> {
        Ok(())
    }

    /// Withdraw only single token from the pool. Only supported by pool with stable swap curve.
    pub fn remove_liquidity_single_side(
        ctx: Context<RemoveLiquiditySingleSide>,
        pool_token_amount: u64,
        minimum_out_amount: u64,
    ) -> Result<()> {
        Ok(())
    }

    /// Deposit tokens to the pool in an imbalance ratio. Only supported by pool with stable swap curve.
    pub fn add_imbalance_liquidity(
        ctx: Context<AddOrRemoveBalanceLiquidity>,
        minimum_pool_token_amount: u64,
        token_a_amount: u64,
        token_b_amount: u64,
    ) -> Result<()> {
        Ok(())
    }

    /// Swap token A to B, or vice versa. An amount of trading fee will be charged for liquidity provider, and the admin of the pool.
    pub fn swap<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, Swap<'info>>,
        in_amount: u64,
        minimum_out_amount: u64,
    ) -> Result<()> {
        Ok(())
    }

    /// Withdraw tokens from the pool in a balanced ratio. User will still able to withdraw from pool even the pool is disabled. This allow user to exit their liquidity when there's some unforeseen event happen.
    pub fn remove_balance_liquidity(
        ctx: Context<AddOrRemoveBalanceLiquidity>,
        pool_token_amount: u64,
        minimum_a_token_out: u64,
        minimum_b_token_out: u64,
    ) -> Result<()> {
        Ok(())
    }

    /// Deposit tokens to the pool in a balanced ratio.
    pub fn add_balance_liquidity(
        ctx: Context<AddOrRemoveBalanceLiquidity>,
        pool_token_amount: u64,
        maximum_token_a_amount: u64,
        maximum_token_b_amount: u64,
    ) -> Result<()> {
        Ok(())
    }

    /// Get the general information of the pool.
    pub fn get_pool_info(ctx: Context<GetPoolInfo>) -> Result<()> {
        Ok(())
    }

    /// Bootstrap the pool when liquidity is depleted.
    pub fn bootstrap_liquidity(
        ctx: Context<BootstrapLiquidity>,
        token_a_amount: u64,
        token_b_amount: u64,
    ) -> Result<()> {
        Ok(())
    }

    /// Create lock account
    pub fn create_lock_escrow(ctx: Context<CreateLockEscrow>) -> Result<()> {
        Ok(())
    }

    /// Lock Lp token
    pub fn lock(ctx: Context<Lock>, amount: u64) -> Result<()> {
        Ok(())
    }

    /// Claim fee
    pub fn claim_fee(ctx: Context<ClaimFee>, max_amount: u64) -> Result<()> {
        Ok(())
    }

    /// ADMIN functions

    /// Initialize a new permissioned pool.
    pub fn initialize_permissioned_pool(
        ctx: Context<InitializePermissionedPool>,
        curve_type: CurveType,
    ) -> Result<()> {
        Ok(())
    }

    /// Enable or disable a pool. A disabled pool allow only remove balanced liquidity operation.
    pub fn enable_or_disable_pool(ctx: Context<EnableOrDisablePool>, enable: bool) -> Result<()> {
        Ok(())
    }

    /// Update trading fee charged for liquidity provider, and admin.
    pub fn set_pool_fees(
        ctx: Context<SetPoolFees>,
        fees: PoolFees,
        new_partner_fee_numerator: u64,
    ) -> Result<()> {
        Ok(())
    }

    /// Update swap curve parameters. This function do not allow update of curve type. For example: stable swap curve to constant product curve. Only supported by pool with stable swap curve.
    /// Only amp is allowed to be override. The other attributes of stable swap curve will be ignored.
    pub fn override_curve_param(
        ctx: Context<OverrideCurveParam>,
        curve_type: CurveType,
    ) -> Result<()> {
        Ok(())
    }

    /// Create mint metadata account for old pools
    pub fn create_mint_metadata(ctx: Context<CreateMintMetadata>) -> Result<()> {
        Ok(())
    }

    /// Create config
    pub fn create_config(
        ctx: Context<CreateConfig>,
        config_parameters: ConfigParameters,
    ) -> Result<()> {
        Ok(())
    }

    /// Close config
    pub fn close_config(ctx: Context<CloseConfig>) -> Result<()> {
        Ok(())
    }

    /// Update activation point
    pub fn update_activation_point(
        ctx: Context<UpdateActivationPoint>,
        new_activation_point: u64,
    ) -> Result<()> {
        Ok(())
    }

    /// Initialize permissionless pool with config
    pub fn initialize_permissionless_constant_product_pool_with_config(
        ctx: Context<InitializePermissionlessConstantProductPoolWithConfig>,
        token_a_amount: u64,
        token_b_amount: u64,
    ) -> Result<()> {
        Ok(())
    }

    /// Initialize permissionless pool with config 2
    pub fn initialize_permissionless_constant_product_pool_with_config2(
        ctx: Context<InitializePermissionlessConstantProductPoolWithConfig>,
        token_a_amount: u64,
        token_b_amount: u64,
        activation_point: Option<u64>,
    ) -> Result<()> {
        Ok(())
    }

    /// Move locked lp
    pub fn move_locked_lp(ctx: Context<MoveLockedLp>, max_amount: u64) -> Result<()> {
        Ok(())
    }
}
