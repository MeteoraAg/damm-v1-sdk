use anchor_lang::prelude::{Clock, Pubkey};
use anyhow::{Context, Result};

use prog_dynamic_amm::constants::depeg::BASE_CACHE_EXPIRES;
use prog_dynamic_amm::state::CurveType;
use prog_dynamic_amm::state::DepegType;
use std::collections::HashMap;

/// Marinade module consists of functions to support marinade depeg pool operation
pub mod marinade;
/// Solido module consists of functions to support solido depeg pool operation
pub mod solido;
/// SPL stake pool module consists of functions to support SPL stake pool based depeg pool operation
pub mod spl_stake;

fn get_stake_pool_virtual_price(
    depeg_type: DepegType,
    spl_stake_pool: Pubkey,
    stake_data: HashMap<Pubkey, Vec<u8>>,
) -> Option<u64> {
    match depeg_type {
        DepegType::Lido => solido::get_virtual_price(&stake_data.get(&solido::stake::ID)?),
        DepegType::Marinade => marinade::get_virtual_price(&stake_data.get(&marinade::stake::ID)?),
        DepegType::SplStake => spl_stake::get_virtual_price(&stake_data.get(&spl_stake_pool)?),
        DepegType::None => None,
    }
}

/// Update depeg base virtual price
pub fn update_base_virtual_price(
    curve_type: &mut CurveType,
    clock: &Clock,
    stake_data: HashMap<Pubkey, Vec<u8>>,
    spl_stake_pool: Pubkey,
) -> Result<()> {
    match curve_type {
        CurveType::ConstantProduct => Ok(()),
        CurveType::Stable { depeg, .. } => {
            if !depeg.depeg_type.is_none() {
                let cache_expire_time = depeg
                    .base_cache_updated
                    .checked_add(BASE_CACHE_EXPIRES)
                    .context("Math overflow")?;

                if clock.unix_timestamp as u64 > cache_expire_time {
                    let virtual_price =
                        get_stake_pool_virtual_price(depeg.depeg_type, spl_stake_pool, stake_data)
                            .context("Fail to get stake pool virtual price")?;

                    depeg.base_cache_updated = clock.unix_timestamp as u64;
                    depeg.base_virtual_price = virtual_price;
                }
            }
            Ok(())
        }
    }
}
