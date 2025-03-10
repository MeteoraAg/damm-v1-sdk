use dynamic_amm::{
    constants::fee::MAX_BASIS_POINT,
    state::{CurveType, PoolFees},
};
use solana_sdk::pubkey::Pubkey;

use super::POOL_WITH_NON_PDA_BASED_LP_MINT;

pub const METAPLEX_PROGRAM_ID: Pubkey =
    solana_sdk::pubkey!("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

/// get first key, this is same as max(key1, key2)
fn get_first_key(key1: Pubkey, key2: Pubkey) -> Pubkey {
    if key1 > key2 {
        return key1;
    }
    key2
}
/// get second key, this is same as min(key1, key2)
fn get_second_key(key1: Pubkey, key2: Pubkey) -> Pubkey {
    if key1 > key2 {
        return key2;
    }
    key1
}

fn get_curve_type(curve_type: CurveType) -> u8 {
    match curve_type {
        CurveType::ConstantProduct {} => 0,
        _ => 1,
    }
}

fn get_trade_fee_bps_bytes(trade_fee_bps: u64) -> Vec<u8> {
    let default_fees = PoolFees {
        trade_fee_numerator: 250,
        trade_fee_denominator: 100000,
        protocol_trade_fee_numerator: 0,
        protocol_trade_fee_denominator: 100000,
    };

    // Unwrap on default configured fee is safe
    let default_trade_fee_bps = to_bps(
        default_fees.trade_fee_numerator.into(),
        default_fees.trade_fee_denominator.into(),
    )
    .unwrap();

    if default_trade_fee_bps == trade_fee_bps {
        return vec![];
    }

    trade_fee_bps.to_le_bytes().to_vec()
}

fn to_bps(numerator: u128, denominator: u128) -> Option<u64> {
    let bps = numerator
        .checked_mul(MAX_BASIS_POINT.into())?
        .checked_div(denominator)?;
    bps.try_into().ok()
}

pub fn derive_permissionless_pool_key(
    curve_type: CurveType,
    token_a_mint: Pubkey,
    token_b_mint: Pubkey,
) -> Pubkey {
    let (pool, _bump) = Pubkey::find_program_address(
        &[
            &get_curve_type(curve_type).to_le_bytes(),
            get_first_key(token_a_mint, token_b_mint).as_ref(),
            get_second_key(token_a_mint, token_b_mint).as_ref(),
        ],
        &dynamic_amm::id(),
    );
    pool
}

pub fn derive_customizable_permissionless_constant_product_pool_key(
    mint_a: Pubkey,
    mint_b: Pubkey,
) -> Pubkey {
    Pubkey::find_program_address(
        &[
            b"pool",
            get_first_key(mint_a, mint_b).as_ref(),
            get_second_key(mint_a, mint_b).as_ref(),
        ],
        &dynamic_amm::ID,
    )
    .0
}

pub fn derive_protocol_fee_key(mint_key: Pubkey, pool_key: Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[b"fee", mint_key.as_ref(), pool_key.as_ref()],
        &dynamic_amm::ID,
    )
    .0
}

pub fn derive_metadata_key(lp_mint: Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[b"metadata", METAPLEX_PROGRAM_ID.as_ref(), lp_mint.as_ref()],
        &METAPLEX_PROGRAM_ID,
    )
    .0
}

pub fn derive_vault_lp_key(vault_key: Pubkey, pool_key: Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[vault_key.as_ref(), pool_key.as_ref()], &dynamic_amm::ID).0
}

pub fn derive_lp_mint_key(pool_key: Pubkey) -> Pubkey {
    if let Some(lp_mint) = POOL_WITH_NON_PDA_BASED_LP_MINT.get(&pool_key) {
        *lp_mint
    } else {
        Pubkey::find_program_address(&[b"lp_mint", pool_key.as_ref()], &dynamic_amm::ID).0
    }
}

pub fn derive_lock_escrow_key(pool_key: Pubkey, owner_key: Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[b"lock_escrow", pool_key.as_ref(), owner_key.as_ref()],
        &dynamic_amm::ID,
    )
    .0
}

pub fn derive_permissionless_constant_product_pool_with_config_key(
    mint_a: Pubkey,
    mint_b: Pubkey,
    config: Pubkey,
) -> Pubkey {
    Pubkey::find_program_address(
        &[
            get_first_key(mint_a, mint_b).as_ref(),
            get_second_key(mint_a, mint_b).as_ref(),
            config.as_ref(),
        ],
        &dynamic_amm::ID,
    )
    .0
}

pub fn derive_permissionless_pool_key_with_fee_tier(
    curve_type: CurveType,
    token_a_mint: Pubkey,
    token_b_mint: Pubkey,
    trade_fee_bps: u64,
) -> Pubkey {
    let (pool, _bump) = Pubkey::find_program_address(
        &[
            &get_curve_type(curve_type).to_le_bytes(),
            get_first_key(token_a_mint, token_b_mint).as_ref(),
            get_second_key(token_a_mint, token_b_mint).as_ref(),
            get_trade_fee_bps_bytes(trade_fee_bps).as_ref(),
        ],
        &dynamic_amm::id(),
    );
    pool
}
