use crate::*;
use anchor_lang::AccountDeserialize;
use anchor_spl::token::Mint;
use anchor_spl::token::TokenAccount;
use anyhow::Context;
use bincode::deserialize;
use prog_dynamic_amm::state::Pool;
use prog_dynamic_vault::state::Vault;
use solana_sdk::sysvar::clock;
use solana_sdk::sysvar::clock::Clock;
#[derive(Parser, Debug, Clone)]
pub struct PoolInfoDynamicAmmArgs {
    #[clap(long, env)]
    pub pool: Pubkey,
}

pub fn process_get_dynamic_pool_info(args: &Args, sub_args: &PoolInfoDynamicAmmArgs) {
    let PoolInfoDynamicAmmArgs { pool } = sub_args;

    let program_dynamic_amm = args.to_rpc_args().get_program_client(prog_dynamic_amm::ID);

    let program_dynamic_vault = args
        .to_rpc_args()
        .get_program_client(prog_dynamic_vault::ID);

    let pool_state: Pool = program_dynamic_amm.account(*pool).unwrap();
    let vault_a: Vault = program_dynamic_vault.account(pool_state.a_vault).unwrap();
    let vault_b: Vault = program_dynamic_vault.account(pool_state.b_vault).unwrap();

    let accounts = program_dynamic_amm
        .rpc()
        .get_multiple_accounts(&[
            pool_state.a_vault_lp,
            pool_state.b_vault_lp,
            vault_a.lp_mint,
            vault_b.lp_mint,
            clock::id(),
        ])
        .unwrap();

    let accounts = accounts
        .into_iter()
        .map(|account| account.unwrap().data)
        .collect::<Vec<Vec<u8>>>();

    let mut data = accounts[0].as_slice();
    let pool_vault_a_lp_token = TokenAccount::try_deserialize_unchecked(&mut data).unwrap();

    let mut data = accounts[1].as_slice();
    let pool_vault_b_lp_token = TokenAccount::try_deserialize_unchecked(&mut data).unwrap();

    let mut data = accounts[2].as_slice();
    let vault_a_lp_mint = Mint::try_deserialize_unchecked(&mut data).unwrap();

    let mut data = accounts[3].as_slice();
    let vault_b_lp_mint = Mint::try_deserialize_unchecked(&mut data).unwrap();

    let data = accounts[4].as_slice();
    let clock = deserialize::<Clock>(&data).unwrap();

    let current_time: u64 = clock.unix_timestamp.try_into().unwrap();

    let vault_a_lp_supply = vault_a
        .get_lp_supply(vault_a_lp_mint.supply)
        .context("Invalid vault LP supply accounting")
        .unwrap();

    let vault_b_lp_supply = vault_b
        .get_lp_supply(vault_b_lp_mint.supply)
        .context("Invalid vault LP supply accounting")
        .unwrap();

    let token_a_amount = vault_a
        .get_amount_by_share(
            current_time,
            pool_vault_a_lp_token.amount,
            vault_a_lp_supply,
        )
        .context("Fail to get token a amount")
        .unwrap();

    let token_b_amount = vault_b
        .get_amount_by_share(
            current_time,
            pool_vault_b_lp_token.amount,
            vault_b_lp_supply,
        )
        .context("Fail to get token b amount")
        .unwrap();

    println!(
        "token_a_amount {} token_b_amount {}",
        token_a_amount, token_b_amount
    );
}
