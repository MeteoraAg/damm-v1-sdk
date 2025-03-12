use anchor_lang::solana_program::borsh0_10;
use prog_dynamic_amm::constants::depeg;
use spl_stake_pool::state::StakePool;
use std::convert::TryInto;

pub fn get_virtual_price(bytes: &[u8]) -> Option<u64> {
    let stake: StakePool = borsh0_10::try_from_slice_unchecked(bytes).ok()?;

    let total_lamports: u128 = stake.total_lamports.into();
    let pool_token_supply: u128 = stake.pool_token_supply.into();

    // may be higher if we apply deposit fee
    let deposit_price = total_lamports
        .checked_mul(depeg::PRECISION.into())?
        .checked_div(pool_token_supply)?;

    let withdraw_fee_denominator: u128 = stake.sol_withdrawal_fee.denominator.into();
    let withdraw_fee_numerator: u128 = stake.sol_withdrawal_fee.numerator.into();

    // sanity check
    if withdraw_fee_denominator <= withdraw_fee_numerator.checked_mul(10)? {
        return deposit_price.try_into().ok();
    }

    let withdraw_price = total_lamports
        .checked_mul(withdraw_fee_denominator.checked_sub(withdraw_fee_numerator)?)?
        .checked_mul(depeg::PRECISION.into())?
        .checked_div(withdraw_fee_denominator)?
        .checked_div(pool_token_supply)?;

    // deposit price has weight more than 3 times with withdraw price
    let virtual_price = deposit_price
        .checked_mul(3)?
        .checked_add(withdraw_price)?
        .checked_div(4)?;

    virtual_price.try_into().ok()
}
