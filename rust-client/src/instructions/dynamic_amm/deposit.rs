use self::fee_estimation::DEFAULT_COMPUTE_UNIT;
use crate::*;
use anchor_lang::InstructionData;
use anchor_lang::ToAccountMetas;
use anchor_spl::associated_token::get_associated_token_address;
use anchor_spl::token::Mint;
use prog_dynamic_amm::state::Pool;
use prog_dynamic_vault::state::Vault;
use solana_rpc_client::rpc_client::RpcClient;
use solana_sdk::commitment_config::CommitmentConfig;
use solana_sdk::compute_budget::ComputeBudgetInstruction;
use solana_sdk::instruction::Instruction;
use solana_sdk::signer::keypair::read_keypair_file;
use solana_sdk::signer::Signer;
use solana_sdk::transaction::Transaction;
#[derive(Parser, Debug, Clone)]
pub struct DepositDynamicAmmArgs {
    #[clap(long, env)]
    pub pool: Pubkey,
    #[clap(long, env)]
    pub max_token_a_amount: u64,
    #[clap(long, env)]
    pub max_token_b_amount: u64,
    #[clap(long, env)]
    pub slippage_rate: u64,
}

pub fn process_deposit_dynamic_pool(args: &Args, sub_args: &DepositDynamicAmmArgs) {
    let DepositDynamicAmmArgs {
        pool,
        max_token_a_amount,
        max_token_b_amount,
        slippage_rate,
    } = sub_args;

    let client = RpcClient::new_with_commitment(&args.rpc_url, CommitmentConfig::finalized());
    let keypair = read_keypair_file(&args.keypair_path.clone().unwrap()).unwrap();

    let mut ixs = vec![
        ComputeBudgetInstruction::set_compute_unit_price(args.priority_fee),
        ComputeBudgetInstruction::set_compute_unit_limit(DEFAULT_COMPUTE_UNIT),
    ];

    let program_amm_client = args.to_rpc_args().get_program_client(prog_dynamic_amm::ID);
    let pool_state: Pool = program_amm_client.account(*pool).unwrap();

    let user_pool_lp = get_associated_token_address(&keypair.pubkey(), &pool_state.lp_mint);
    if client.get_account(&user_pool_lp).is_err() {
        ixs.push(
            spl_associated_token_account::instruction::create_associated_token_account(
                &keypair.pubkey(),
                &keypair.pubkey(),
                &pool_state.lp_mint,
                &anchor_spl::token::ID,
            ),
        );
    }
    let program_vault_client = args.to_rpc_args().get_program_client(prog_dynamic_amm::ID);
    let a_vault_state: Vault = program_vault_client.account(pool_state.a_vault).unwrap();
    let b_vault_state: Vault = program_vault_client.account(pool_state.b_vault).unwrap();

    let pool_token_amount = get_pool_token_amount(
        args,
        pool,
        &pool_state,
        &a_vault_state,
        &b_vault_state,
        (*max_token_a_amount).into(),
        (*max_token_b_amount).into(),
        (*slippage_rate).into(),
        &keypair,
    )
    .unwrap();

    ixs.push(Instruction {
        program_id: prog_dynamic_amm::ID,
        accounts: prog_dynamic_amm::accounts::AddOrRemoveBalanceLiquidity {
            pool: *pool,
            lp_mint: pool_state.lp_mint,
            user_pool_lp,
            a_vault_lp: pool_state.a_vault_lp,
            b_vault_lp: pool_state.b_vault_lp,
            a_vault: pool_state.a_vault,
            b_vault: pool_state.b_vault,
            a_vault_lp_mint: a_vault_state.lp_mint,
            b_vault_lp_mint: b_vault_state.lp_mint,
            a_token_vault: a_vault_state.token_vault,
            b_token_vault: b_vault_state.token_vault,
            user_a_token: get_associated_token_address(&keypair.pubkey(), &pool_state.token_a_mint),
            user_b_token: get_associated_token_address(&keypair.pubkey(), &pool_state.token_b_mint),
            user: keypair.pubkey(),
            vault_program: prog_dynamic_vault::ID,
            token_program: anchor_spl::token::ID,
        }
        .to_account_metas(None),
        data: prog_dynamic_amm::instruction::AddBalanceLiquidity {
            pool_token_amount,
            maximum_token_a_amount: *max_token_a_amount,
            maximum_token_b_amount: *max_token_b_amount,
        }
        .data(),
    });

    let blockhash = client.get_latest_blockhash().unwrap();
    let tx =
        Transaction::new_signed_with_payer(&ixs, Some(&keypair.pubkey()), &[&keypair], blockhash);
    let payload = args
        .to_rpc_args()
        .send_transaction_wrapper(
            &tx,
            MAX_RETRIES,
            keypair.pubkey(),
            "".to_string(),
            sucess_cb,
            failed_cb,
        )
        .unwrap();
    let mut result = BTreeMap::new();
    result.insert(0, Some(payload));
    handle_collect_cb_by_tx_action(args.tx_action, None, &result);
}

fn sucess_cb(_wallet_memo: String, sig: Signature) {
    println!("done deposit {:?}", sig);
}
fn failed_cb(_wallet_memo: String) {
    println!("cannot deposit");
}

fn get_pool_token_amount(
    args: &Args,
    pool: &Pubkey,
    pool_state: &Pool,
    a_vault_state: &Vault,
    b_vault_state: &Vault,
    max_token_a_amount: u128,
    max_token_b_amount: u128,
    slippage_rate: u128,
    keypair: &Keypair,
) -> anyhow::Result<u64> {
    // get total pool amount
    let program_amm_client = args.to_rpc_args().get_program_client(prog_dynamic_amm::ID);
    let client = RpcClient::new_with_commitment(&args.rpc_url, CommitmentConfig::finalized());
    let blockhash = client.get_latest_blockhash()?;
    let tx = Transaction::new_signed_with_payer(
        &vec![Instruction {
            program_id: prog_dynamic_amm::ID,
            accounts: prog_dynamic_amm::accounts::GetPoolInfo {
                a_vault: pool_state.a_vault,
                a_vault_lp: pool_state.a_vault_lp,
                a_vault_lp_mint: a_vault_state.lp_mint,
                b_vault: pool_state.b_vault,
                b_vault_lp: pool_state.b_vault_lp,
                b_vault_lp_mint: b_vault_state.lp_mint,
                lp_mint: pool_state.lp_mint,
                pool: *pool,
            }
            .to_account_metas(None),
            data: prog_dynamic_amm::instruction::GetPoolInfo {}.data(),
        }],
        Some(&keypair.pubkey()),
        &[keypair],
        blockhash,
    );
    let simulation = args.to_rpc_args().simulation_transaction(vec![], &tx)?;

    let logs = simulation.value.logs.expect("No log in simulation found");
    let pool_info: prog_dynamic_amm::event::PoolInfo =
        transaction_utils::parse_event_log(&logs, prog_dynamic_amm::ID)
            .expect("Event log not found");

    let pool_lp_mint: Mint = program_amm_client.account(pool_state.lp_mint)?;

    let pool_token_by_a: u128 = max_token_a_amount
        .checked_mul(pool_lp_mint.supply.into())
        .unwrap()
        .checked_div(pool_info.token_a_amount.into())
        .unwrap();

    let pool_token_by_b: u128 = max_token_b_amount
        .checked_mul(pool_lp_mint.supply.into())
        .unwrap()
        .checked_div(pool_info.token_b_amount.into())
        .unwrap();
    let pool_token_amount = pool_token_by_a
        .min(pool_token_by_b)
        .checked_mul(100u128.checked_sub(slippage_rate).unwrap())
        .unwrap()
        .checked_div(100)
        .unwrap();

    Ok(pool_token_amount as u64)
}
