pub mod curve;
pub mod depeg;
pub mod math;
use crate::depeg::update_base_virtual_price;
use crate::math::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};
use anyhow::{anyhow, ensure, Context};
use prog_dynamic_amm::constants::FEE_CURVE_POINT_NUMBER;
use prog_dynamic_amm::error::PoolError;
use prog_dynamic_amm::state::{ActivationType, FeeCurveType, Pool, PoolFees};
use prog_dynamic_vault::state::Vault;
use spl_token_swap::curve::calculator::TradeDirection;
use std::collections::HashMap;

pub struct VaultInfo {
    /// Amount of vault lp hold by the pool
    pub lp_amount: u64,
    /// Vault lp mint supply
    pub lp_supply: u64,
    /// Vault state
    pub vault: Vault,
}

#[derive(Clone)]
pub struct QuoteData {
    /// Pool state to swap
    pub pool: Pool,
    /// Vault state of vault A
    pub vault_a: Vault,
    /// Vault state of vault B
    pub vault_b: Vault,
    /// Pool vault A LP token
    pub pool_vault_a_lp_token: TokenAccount,
    /// Pool vault B LP token
    pub pool_vault_b_lp_token: TokenAccount,
    /// Lp mint of vault A
    pub vault_a_lp_mint: Mint,
    /// Lp mint of vault B
    pub vault_b_lp_mint: Mint,
    /// Token account of vault A
    pub vault_a_token: TokenAccount,
    /// Token account of vault B
    pub vault_b_token: TokenAccount,
    /// Clock account
    pub clock: Clock,
    /// Stake account data. Only for depeg pools
    pub stake_data: HashMap<Pubkey, Vec<u8>>,
}

#[derive(Debug, Clone)]
pub struct QuoteResult {
    /// Swap out amount
    pub out_amount: u64,
    /// Total fee amount. Fee is charged based on in token mint.
    pub fee: u64,
}

pub fn compute_quote(
    in_token_mint: Pubkey,
    in_amount: u64,
    quote_data: QuoteData,
) -> anyhow::Result<QuoteResult> {
    let QuoteData {
        pool,
        vault_a,
        vault_b,
        pool_vault_a_lp_token,
        pool_vault_b_lp_token,
        vault_a_lp_mint,
        vault_b_lp_mint,
        vault_a_token,
        vault_b_token,
        clock,
        stake_data,
    } = quote_data;

    let activation_type =
        ActivationType::try_from(pool.bootstrapping.activation_type).map_err(|e| anyhow!(e))?;

    let current_point = match activation_type {
        ActivationType::Slot => clock.slot,
        ActivationType::Timestamp => clock.unix_timestamp as u64,
    };

    ensure!(pool.enabled, "Pool disabled");
    ensure!(
        current_point >= pool.bootstrapping.activation_point,
        "Swap is disabled"
    );

    let mut curve = pool.curve_type;
    update_base_virtual_price(&mut curve, &clock, stake_data, pool.stake)?;

    let current_time: u64 = clock.unix_timestamp.try_into()?;

    ensure!(
        in_token_mint == pool.token_a_mint || in_token_mint == pool.token_b_mint,
        "In token mint not matches with pool token mints"
    );

    let token_a_amount = vault_a
        .get_amount_by_share(
            current_time,
            pool_vault_a_lp_token.amount,
            vault_a_lp_mint.supply,
        )
        .context("Fail to get token a amount")?;

    let token_b_amount = vault_b
        .get_amount_by_share(
            current_time,
            pool_vault_b_lp_token.amount,
            vault_b_lp_mint.supply,
        )
        .context("Fail to get token b amount")?;

    let trade_direction = if in_token_mint == pool.token_a_mint {
        TradeDirection::AtoB
    } else {
        TradeDirection::BtoA
    };

    let (
        mut in_vault,
        out_vault,
        in_vault_lp,
        in_vault_lp_mint,
        out_vault_lp_mint,
        out_vault_token_account,
        in_token_total_amount,
        out_token_total_amount,
    ) = match trade_direction {
        TradeDirection::AtoB => (
            vault_a,
            vault_b,
            pool_vault_a_lp_token,
            vault_a_lp_mint,
            vault_b_lp_mint,
            vault_b_token,
            token_a_amount,
            token_b_amount,
        ),
        TradeDirection::BtoA => (
            vault_b,
            vault_a,
            pool_vault_b_lp_token,
            vault_b_lp_mint,
            vault_a_lp_mint,
            vault_a_token,
            token_b_amount,
            token_a_amount,
        ),
    };

    let latest_pool_fees = get_latest_pool_fees(&pool, current_point)?;

    let trade_fee = latest_pool_fees
        .trading_fee(in_amount.into())
        .context("Fail to calculate trading fee")?;

    let protocol_fee = latest_pool_fees
        .protocol_trading_fee(trade_fee)
        .context("Fail to calculate protocol trading fee")?;

    // Protocol fee is a cut from trade fee
    let trade_fee = trade_fee
        .checked_sub(protocol_fee)
        .context("Fail to calculate trade fee")?;

    let in_amount_after_protocol_fee = in_amount
        .checked_sub(protocol_fee.try_into()?)
        .context("Fail to calculate in_amount_after_protocol_fee")?;

    let before_in_token_total_amount = in_token_total_amount;

    let in_lp = in_vault
        .get_unmint_amount(
            current_time,
            in_amount_after_protocol_fee,
            in_vault_lp_mint.supply,
        )
        .context("Fail to get in_vault_lp")?;

    in_vault.total_amount = in_vault
        .total_amount
        .checked_add(in_amount_after_protocol_fee)
        .context("Fail to add in_vault.total_amount")?;

    let after_in_token_total_amount = in_vault
        .get_amount_by_share(
            current_time,
            in_lp
                .checked_add(in_vault_lp.amount)
                .context("Fail to get new in_vault_lp")?,
            in_vault_lp_mint
                .supply
                .checked_add(in_lp)
                .context("Fail to get new in_vault_lp_mint")?,
        )
        .context("Fail to get after_in_token_total_amount")?;

    let actual_in_amount = after_in_token_total_amount
        .checked_sub(before_in_token_total_amount)
        .context("Fail to get actual_in_amount")?;

    let actual_in_amount_after_fee = actual_in_amount
        .checked_sub(trade_fee.try_into()?)
        .context("Fail to calculate in_amount_after_fee")?;

    let swap_curve = get_swap_curve(pool.curve_type);

    let SwapResult {
        destination_amount_swapped,
        ..
    } = swap_curve
        .swap(
            actual_in_amount_after_fee,
            in_token_total_amount,
            out_token_total_amount,
            trade_direction,
        )
        .context("Fail to get swap result")?;

    let out_vault_lp = out_vault
        .get_unmint_amount(
            current_time,
            destination_amount_swapped.try_into()?,
            out_vault_lp_mint.supply,
        )
        .context("Fail to get out_vault_lp")?;

    let out_amount = out_vault
        .get_amount_by_share(current_time, out_vault_lp, out_vault_lp_mint.supply)
        .context("Fail to get out_amount")?;

    ensure!(
        out_amount < out_vault_token_account.amount,
        "Out amount > vault reserve"
    );

    Ok(QuoteResult {
        fee: trade_fee.try_into()?,
        out_amount,
    })
}

// Compute the underlying token A, B in the pool
pub fn compute_pool_tokens(
    current_time: u64,
    vault_a: VaultInfo,
    vault_b: VaultInfo,
) -> Result<(u64, u64)> {
    let token_a_amount = vault_a
        .vault
        .get_amount_by_share(current_time, vault_a.lp_amount, vault_a.lp_supply)
        .ok_or(PoolError::MathOverflow)?;
    let token_b_amount = vault_b
        .vault
        .get_amount_by_share(current_time, vault_b.lp_amount, vault_b.lp_supply)
        .ok_or(PoolError::MathOverflow)?;
    Ok((token_a_amount, token_b_amount))
}

pub fn get_latest_pool_fees(state: &Pool, current_point: u64) -> anyhow::Result<PoolFees> {
    if state.fee_curve.fee_curve_type == FeeCurveType::None || state.is_update_fee_completed {
        return Ok(state.fees);
    }

    let points = state.fee_curve.points;

    let get_latest_trade_bps = move || -> u16 {
        for i in 0..FEE_CURVE_POINT_NUMBER {
            // current_point is between i-1 and i
            if points[i].activated_point >= current_point {
                if i == 0 {
                    return points[i].fee_bps;
                }
                if state.fee_curve.fee_curve_type == FeeCurveType::Flat {
                    return points[i - 1].fee_bps;
                }

                let m: u64 = points[i - 1].fee_bps.into();
                let n: u64 = points[i].fee_bps.into();
                let a = points[i - 1].activated_point;
                let b = points[i].activated_point;

                let denominator = b - a;
                if denominator == 0 {
                    return m as u16;
                } else {
                    let numerator = n * (current_point - a) + m * (b - current_point);
                    return (numerator / denominator) as u16;
                }
            }
        }
        points[FEE_CURVE_POINT_NUMBER - 1].fee_bps
    };

    let latest_trade_fee_bps = get_latest_trade_bps();
    let trade_fee_numerator = u64::from(latest_trade_fee_bps)
        .checked_mul(10)
        .context("Overflow")?;

    Ok(PoolFees {
        trade_fee_numerator,
        trade_fee_denominator: state.fees.trade_fee_denominator,
        protocol_trade_fee_numerator: state.fees.protocol_trade_fee_numerator,
        protocol_trade_fee_denominator: state.fees.protocol_trade_fee_denominator,
    })
}
