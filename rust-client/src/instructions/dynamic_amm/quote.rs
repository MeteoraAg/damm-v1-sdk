use crate::*;
use anchor_lang::AccountDeserialize;
use anchor_spl::token::Mint;
use anchor_spl::token::TokenAccount;
use bincode::deserialize;
use dynamic_amm_quote::compute_quote;
use dynamic_amm_quote::QuoteData;
use prog_dynamic_amm::state::Pool;
use prog_dynamic_vault::state::Vault;
use solana_sdk::sysvar::clock;
use solana_sdk::sysvar::clock::Clock;
use std::collections::HashMap;
#[derive(Parser, Debug, Clone)]
pub struct QuoteDynamicAmmArgs {
    #[clap(long, env)]
    pub pool: Pubkey,
    #[clap(long, env)]
    pub source_token: Pubkey,
    #[clap(long, env)]
    pub in_amount: u64,
}

pub fn process_quote_dynamic_pool(args: &Args, sub_args: &QuoteDynamicAmmArgs) {
    let QuoteDynamicAmmArgs {
        pool,
        in_amount,
        source_token,
    } = sub_args;

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
            vault_a.token_vault,
            vault_b.token_vault,
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

    let mut data = accounts[4].as_slice();
    let vault_a_token = TokenAccount::try_deserialize_unchecked(&mut data).unwrap();

    let mut data = accounts[5].as_slice();
    let vault_b_token = TokenAccount::try_deserialize_unchecked(&mut data).unwrap();

    let data = accounts[6].as_slice();
    let clock = deserialize::<Clock>(data).unwrap();

    let stake_data = if pool_state.stake != Pubkey::default() {
        let account = program_dynamic_amm
            .rpc()
            .get_account(&pool_state.stake)
            .unwrap();
        let mut stake_data = HashMap::new();
        stake_data.insert(pool_state.stake, account.data);
        stake_data
    } else {
        HashMap::new()
    };

    let quote_data = QuoteData {
        pool: pool_state,
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
    };
    let quote = compute_quote(*source_token, *in_amount, quote_data);
    println!("{:?}", quote);
}
