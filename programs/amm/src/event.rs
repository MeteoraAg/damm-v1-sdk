//! Event module includes information about events of the program
use crate::state::PoolType;
use anchor_lang::prelude::*;

/// Add liquidity event
#[event]
pub struct AddLiquidity {
    /// LP amount user received upon add liquidity.
    pub lp_mint_amount: u64,
    /// Amount of token A user deposited.
    pub token_a_amount: u64,
    /// Amount of token B user deposited.
    pub token_b_amount: u64,
}

/// Remove liquidity event
#[event]
pub struct RemoveLiquidity {
    /// LP amount burned from user upon add remove liquidity.
    pub lp_unmint_amount: u64,
    /// Amount of token A user received.
    pub token_a_out_amount: u64,
    /// Amount of token B user received.
    pub token_b_out_amount: u64,
}

/// Bootstrap liquidity event
#[event]
pub struct BootstrapLiquidity {
    /// LP amount user received upon add liquidity.
    pub lp_mint_amount: u64,
    /// Amount of token A user deposited.
    pub token_a_amount: u64,
    /// Amount of token B user deposited.
    pub token_b_amount: u64,
    /// Pool address
    pub pool: Pubkey,
}

/// Swap event
#[event]
pub struct Swap {
    /// Token amount user deposited to the pool for token exchange.
    pub in_amount: u64,
    /// Token amount user received from the pool.
    pub out_amount: u64,
    /// Trading fee charged for liquidity provider.
    pub trade_fee: u64,
    /// Trading fee charged for admin.
    pub admin_fee: u64,
    /// Host fee charged
    pub host_fee: u64,
}

/// Set pool fees event
#[event]
pub struct SetPoolFees {
    /// New trade fee numerator
    pub trade_fee_numerator: u64,
    /// New trade fee denominator
    pub trade_fee_denominator: u64,
    /// New owner (admin) fee numerator
    pub owner_trade_fee_numerator: u64,
    /// New owner (admin) fee denominator
    pub owner_trade_fee_denominator: u64,
    /// Pool address
    pub pool: Pubkey,
}

/// Pool info event
#[event]
pub struct PoolInfo {
    /// Total token A amount in the pool
    pub token_a_amount: u64,
    /// Total token B amount in the pool
    pub token_b_amount: u64,
    /// Current virtual price
    pub virtual_price: f64,
    /// Current unix timestamp
    pub current_timestamp: u64,
}

/// Transfer admin event
#[event]
pub struct TransferAdmin {
    /// Old admin of the pool
    pub admin: Pubkey,
    /// New admin of the pool
    pub new_admin: Pubkey,
    /// Pool address
    pub pool: Pubkey,
}

/// Set admin fee account event
#[event]
pub struct SetAdminFeeAccount {
    /// Old admin token A fee account
    pub admin_token_a_fee: Pubkey,
    /// Old admin token B fee account
    pub admin_token_b_fee: Pubkey,
    /// New admin token A fee account
    pub new_admin_token_a_fee: Pubkey,
    /// New admin token B fee account
    pub new_admin_token_b_fee: Pubkey,
}

/// Override curve param event
#[event]
pub struct OverrideCurveParam {
    /// The new amplification for stable curve
    pub new_amp: u64,
    /// Updated timestamp
    pub updated_timestamp: u64,
    /// Pool address
    pub pool: Pubkey,
}

/// New pool created event
#[event]
pub struct PoolCreated {
    /// LP token mint of the pool
    pub lp_mint: Pubkey, //32
    /// Token A mint of the pool. Eg: USDT
    pub token_a_mint: Pubkey, //32
    /// Token B mint of the pool. Eg: USDC
    pub token_b_mint: Pubkey, //32
    /// Pool type
    pub pool_type: PoolType,
    /// Pool address
    pub pool: Pubkey,
}

/// Pool enabled state change event
#[event]
pub struct PoolEnabled {
    /// Pool address
    pub pool: Pubkey,
    /// Pool enabled state
    pub enabled: bool,
}

/// Migrate fee account event
#[event]
pub struct MigrateFeeAccount {
    /// Pool address
    pub pool: Pubkey,
    /// New admin token a fee
    pub new_admin_token_a_fee: Pubkey,
    /// New admin token b fee
    pub new_admin_token_b_fee: Pubkey,
    /// Transfer token a fee amount
    pub token_a_amount: u64,
    /// Transfer token b fee amount
    pub token_b_amount: u64,
}
