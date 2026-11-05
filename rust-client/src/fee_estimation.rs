pub const TRANSFER_SOL_COMPUTE_UNIT: u32 = 500;
pub const DEFAULT_SIGNATURE_FEE: u64 = 5000;
pub const RENT_EXEMPTION_SYSTEM_ACCOUNT: u64 = 890880;
pub const TRANSFER_TOKEN_COMPUTE_UNIT: u32 = 50000;
pub const DEFAULT_COMPUTE_UNIT: u32 = 200000;
pub const CREATE_POOL_COMPUTE_UNIT: u32 = 400000;

pub fn estimate_sol_transfer_fee(priority_fee: u64) -> u64 {
    let compute_unit: u64 = TRANSFER_SOL_COMPUTE_UNIT.into();
    priority_fee * compute_unit + DEFAULT_SIGNATURE_FEE
}

pub fn get_max_transfer_sol(current_balance: u64, transfer_fee: u64) -> u64 {
    current_balance
        .saturating_sub(transfer_fee)
        .saturating_sub(RENT_EXEMPTION_SYSTEM_ACCOUNT)
}
