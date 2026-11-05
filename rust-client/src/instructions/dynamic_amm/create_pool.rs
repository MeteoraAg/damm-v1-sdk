use self::fee_estimation::CREATE_POOL_COMPUTE_UNIT;
use crate::*;
use anchor_lang::InstructionData;
use anchor_lang::ToAccountMetas;
use anchor_spl::associated_token::get_associated_token_address;
use common::dynamic_amm::pda::derive_permissionless_pool_key_with_fee_tier;
use common::dynamic_amm::pda::derive_protocol_fee_key;
use common::dynamic_amm::pda::derive_vault_lp_key;
use common::dynamic_vault::pda::derive_token_vault_key;
use common::dynamic_vault::pda::derive_vault_key;
use prog_dynamic_amm::state::CurveType;
use solana_rpc_client::rpc_client::RpcClient;
use solana_sdk::commitment_config::CommitmentConfig;
use solana_sdk::compute_budget::ComputeBudgetInstruction;
use solana_sdk::instruction::Instruction;
use solana_sdk::signer::keypair::read_keypair_file;
use solana_sdk::signer::Signer;
use solana_sdk::transaction::Transaction;
#[derive(Parser, Debug, Clone)]
pub struct CreateDynamicAmmPoolArgs {
    #[clap(long, env)]
    pub token_a_mint: Pubkey,
    #[clap(long, env)]
    pub token_b_mint: Pubkey,
    #[clap(long, env)]
    pub trade_fee_bps: u64,
    #[clap(long, env)]
    pub token_a_amount: u64,
    #[clap(long, env)]
    pub token_b_amount: u64,
}

pub fn process_new_dynamic_pool(args: &Args, sub_args: &CreateDynamicAmmPoolArgs) {
    let CreateDynamicAmmPoolArgs {
        token_a_mint,
        token_b_mint,
        trade_fee_bps,
        token_a_amount,
        token_b_amount,
    } = sub_args;

    let client = RpcClient::new_with_commitment(&args.rpc_url, CommitmentConfig::finalized());
    let keypair = read_keypair_file(&args.keypair_path.clone().unwrap()).unwrap();

    let mut ixs = vec![
        ComputeBudgetInstruction::set_compute_unit_price(args.priority_fee),
        ComputeBudgetInstruction::set_compute_unit_limit(CREATE_POOL_COMPUTE_UNIT),
    ];
    // check vault
    let a_vault = derive_vault_key(*token_a_mint);
    let a_token_vault = derive_token_vault_key(a_vault);
    let a_vault_lp_mint = common::dynamic_vault::pda::derive_lp_mint_key(a_vault);
    if client.get_account(&a_vault).is_err() {
        ixs.push(Instruction {
            program_id: prog_dynamic_vault::ID,
            accounts: prog_dynamic_vault::accounts::Initialize {
                vault: a_vault,
                token_vault: a_token_vault,
                token_mint: *token_a_mint,
                token_program: spl_token::ID,
                lp_mint: a_vault_lp_mint,
                rent: anchor_client::solana_sdk::sysvar::rent::ID,
                system_program: solana_program::system_program::ID,
                payer: keypair.pubkey(),
            }
            .to_account_metas(None),
            data: prog_dynamic_vault::instruction::Initialize {}.data(),
        });
    }

    let b_vault = derive_vault_key(*token_b_mint);
    let b_token_vault = derive_token_vault_key(b_vault);
    let b_vault_lp_mint = common::dynamic_vault::pda::derive_lp_mint_key(b_vault);
    if client.get_account(&b_vault).is_err() {
        ixs.push(Instruction {
            program_id: prog_dynamic_vault::ID,
            accounts: prog_dynamic_vault::accounts::Initialize {
                vault: b_vault,
                token_vault: b_token_vault,
                token_mint: *token_b_mint,
                token_program: spl_token::ID,
                lp_mint: b_vault_lp_mint,
                rent: anchor_client::solana_sdk::sysvar::rent::ID,
                system_program: solana_program::system_program::ID,
                payer: keypair.pubkey(),
            }
            .to_account_metas(None),
            data: prog_dynamic_vault::instruction::Initialize {}.data(),
        });
    }

    let pool = derive_permissionless_pool_key_with_fee_tier(
        CurveType::ConstantProduct,
        *token_a_mint,
        *token_b_mint,
        *trade_fee_bps,
    );
    let pool_lp_mint = common::dynamic_amm::pda::derive_lp_mint_key(pool);
    let (mint_metadata, _bump) = mpl_token_metadata::accounts::Metadata::find_pda(&pool_lp_mint);
    ixs.push(Instruction {
        program_id: prog_dynamic_amm::ID,
        accounts: prog_dynamic_amm::accounts::InitializePermissionlessPoolWithFeeTier {
            pool,
            rent: anchor_client::solana_sdk::sysvar::rent::ID,
            system_program: solana_program::system_program::ID,
            payer: keypair.pubkey(),
            a_vault,
            b_vault,
            a_token_vault,
            b_token_vault,
            a_vault_lp_mint,
            b_vault_lp_mint,
            lp_mint: pool_lp_mint,
            token_a_mint: *token_a_mint,
            token_b_mint: *token_b_mint,
            token_program: spl_token::ID,
            associated_token_program: spl_associated_token_account::ID,
            a_vault_lp: derive_vault_lp_key(a_vault, pool),
            b_vault_lp: derive_vault_lp_key(b_vault, pool),
            payer_token_a: get_associated_token_address(&keypair.pubkey(), token_a_mint),
            payer_token_b: get_associated_token_address(&keypair.pubkey(), token_b_mint),
            payer_pool_lp: get_associated_token_address(&keypair.pubkey(), &pool_lp_mint),
            protocol_token_a_fee: derive_protocol_fee_key(*token_a_mint, pool),
            protocol_token_b_fee: derive_protocol_fee_key(*token_b_mint, pool),
            fee_owner: Pubkey::default(),
            vault_program: prog_dynamic_vault::ID,
            metadata_program: mpl_token_metadata::ID,
            mint_metadata,
        }
        .to_account_metas(None),
        data: prog_dynamic_amm::instruction::InitializePermissionlessPoolWithFeeTier {
            curve_type: CurveType::ConstantProduct,
            trade_fee_bps: *trade_fee_bps,
            token_a_amount: *token_a_amount,
            token_b_amount: *token_b_amount,
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
    println!("done create pool {:?}", sig);
}
fn failed_cb(_wallet_memo: String) {
    println!("cannot create pool");
}
