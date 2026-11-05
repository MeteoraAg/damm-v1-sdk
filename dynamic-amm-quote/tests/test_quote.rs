use anchor_client::{solana_client::nonblocking::rpc_client::RpcClient, Cluster};
use anchor_lang::AccountDeserialize;
use anchor_lang::InstructionData;
use anchor_lang::ToAccountMetas;
use anchor_spl::{
    associated_token::get_associated_token_address,
    token::{spl_token::state::AccountState, Mint, TokenAccount},
};
use dynamic_amm_quote::QuoteData;
use prog_dynamic_amm::state::Pool;
use prog_dynamic_vault::state::Vault;
use solana_program_test::*;
use solana_sdk::account::AccountSharedData;
use solana_sdk::clock::Clock;
use solana_sdk::instruction::Instruction;
use solana_sdk::transaction::Transaction;
use solana_sdk::{
    account::Account,
    program_pack::Pack,
    pubkey::Pubkey,
    signature::Keypair,
    signer::Signer,
    system_program,
    sysvar::{self},
};
use std::collections::HashMap;

pub async fn process_and_assert_ok(
    instructions: &[Instruction],
    payer: &Keypair,
    signers: &[&Keypair],
    banks_client: &mut BanksClient,
) {
    let recent_blockhash = banks_client.get_latest_blockhash().await.unwrap();
    let mut all_signers = vec![payer];
    all_signers.extend_from_slice(signers);

    let tx = Transaction::new_signed_with_payer(
        instructions,
        Some(&payer.pubkey()),
        &all_signers,
        recent_blockhash,
    );

    assert!(banks_client.process_transaction(tx.clone()).await.is_ok());
}

struct SetupContextResult {
    mock_user_keypair: Keypair,
    banks_client: BanksClient,
}

async fn setup_accounts_and_start(
    rpc_client: &RpcClient,
    mut test: ProgramTest,
    pool_key: Pubkey,
) -> SetupContextResult {
    let mock_keypair = Keypair::new();

    let pool_account = rpc_client.get_account(&pool_key).await.unwrap();
    let pool_state = Pool::try_deserialize(&mut pool_account.data.as_ref()).unwrap();

    let vault_accounts = rpc_client
        .get_multiple_accounts(&[pool_state.a_vault, pool_state.b_vault])
        .await
        .unwrap();

    let vault_a_account = vault_accounts[0].as_ref().unwrap();
    let vault_b_account = vault_accounts[1].as_ref().unwrap();

    let vault_a_state = Vault::try_deserialize(&mut vault_a_account.data.as_ref()).unwrap();
    let vault_b_state = Vault::try_deserialize(&mut vault_b_account.data.as_ref()).unwrap();

    let account_keys = [
        pool_key,
        pool_state.a_vault,
        pool_state.b_vault,
        pool_state.token_a_mint,
        pool_state.token_b_mint,
        pool_state.a_vault_lp,
        pool_state.b_vault_lp,
        pool_state.lp_mint,
        pool_state.protocol_token_a_fee,
        pool_state.protocol_token_b_fee,
        vault_a_state.token_vault,
        vault_a_state.lp_mint,
        vault_b_state.token_vault,
        vault_b_state.lp_mint,
        sysvar::clock::ID,
    ];

    let accounts = rpc_client
        .get_multiple_accounts(&account_keys)
        .await
        .unwrap();

    let keyed_accounts = account_keys.iter().zip(accounts).collect::<Vec<_>>();
    let pool_related_accounts = &keyed_accounts[..account_keys.len() - 1];
    let clock_account = keyed_accounts.iter().last();

    for (key, account) in pool_related_accounts {
        if let Some(account) = account {
            if account.owner.eq(&anchor_spl::token::ID)
                && account.data.len() == anchor_spl::token::spl_token::state::Mint::LEN
            {
                let token_state = anchor_spl::token::spl_token::state::Account {
                    mint: *key.to_owned(),
                    owner: mock_keypair.pubkey(),
                    amount: 100_000_000_000_000_000,
                    state: AccountState::Initialized,
                    ..Default::default()
                };

                let associated_token_address =
                    get_associated_token_address(&mock_keypair.pubkey(), &token_state.mint);

                let mut new_token_state_bytes =
                    [0u8; anchor_spl::token::spl_token::state::Account::LEN];

                anchor_spl::token::spl_token::state::Account::pack(
                    token_state,
                    &mut new_token_state_bytes,
                )
                .unwrap();

                test.add_account(
                    associated_token_address,
                    Account {
                        lamports: u32::MAX.into(),
                        data: new_token_state_bytes.to_vec(),
                        owner: account.owner,
                        ..Default::default()
                    },
                );
            }

            test.add_account(*key.to_owned(), account.clone());
        }
    }

    test.add_account(
        mock_keypair.pubkey(),
        Account {
            lamports: u32::MAX.into(),
            data: vec![],
            owner: system_program::ID,
            ..Default::default()
        },
    );

    let mut context = test.start_with_context().await;

    if let Some(clock_account) = clock_account.and_then(|(_key, account)| account.as_ref()) {
        let share_clock_account: AccountSharedData = clock_account.to_owned().into();
        let clock = bincode::deserialize::<Clock>(clock_account.data.as_ref()).unwrap();
        context.set_account(&sysvar::clock::ID, &share_clock_account);
        context.warp_to_slot(clock.slot).unwrap();
    }

    SetupContextResult {
        mock_user_keypair: mock_keypair,
        banks_client: context.banks_client,
    }
}

async fn get_quote_data(banks_client: &mut BanksClient, pool: Pubkey) -> QuoteData {
    let pool_state = banks_client
        .get_account(pool)
        .await
        .unwrap()
        .map(|account| Pool::try_deserialize(&mut account.data.as_ref()).unwrap())
        .unwrap();

    let vault_a_state = banks_client
        .get_account(pool_state.a_vault)
        .await
        .unwrap()
        .map(|account| Vault::try_deserialize(&mut account.data.as_ref()).unwrap())
        .unwrap();

    let vault_b_state = banks_client
        .get_account(pool_state.b_vault)
        .await
        .unwrap()
        .map(|account| Vault::try_deserialize(&mut account.data.as_ref()).unwrap())
        .unwrap();

    let pool_vault_a_lp_state = banks_client
        .get_account(pool_state.a_vault_lp)
        .await
        .unwrap()
        .map(|account| TokenAccount::try_deserialize(&mut account.data.as_ref()).unwrap())
        .unwrap();

    let pool_vault_b_lp_state = banks_client
        .get_account(pool_state.b_vault_lp)
        .await
        .unwrap()
        .map(|account| TokenAccount::try_deserialize(&mut account.data.as_ref()).unwrap())
        .unwrap();

    let vault_a_lp_mint_state = banks_client
        .get_account(vault_a_state.lp_mint)
        .await
        .unwrap()
        .map(|account| Mint::try_deserialize(&mut account.data.as_ref()).unwrap())
        .unwrap();

    let vault_b_lp_mint_state = banks_client
        .get_account(vault_b_state.lp_mint)
        .await
        .unwrap()
        .map(|account| Mint::try_deserialize(&mut account.data.as_ref()).unwrap())
        .unwrap();

    let vault_a_token = banks_client
        .get_account(vault_a_state.token_vault)
        .await
        .unwrap()
        .map(|account| TokenAccount::try_deserialize(&mut account.data.as_ref()).unwrap())
        .unwrap();

    let vault_b_token = banks_client
        .get_account(vault_b_state.token_vault)
        .await
        .unwrap()
        .map(|account| TokenAccount::try_deserialize(&mut account.data.as_ref()).unwrap())
        .unwrap();

    let clock = banks_client
        .get_account(sysvar::clock::ID)
        .await
        .unwrap()
        .map(|account| bincode::deserialize(account.data.as_ref()).unwrap())
        .unwrap();

    QuoteData {
        pool: pool_state,
        vault_a: vault_a_state,
        vault_b: vault_b_state,
        pool_vault_a_lp_token: pool_vault_a_lp_state,
        pool_vault_b_lp_token: pool_vault_b_lp_state,
        vault_a_lp_mint: vault_a_lp_mint_state,
        vault_b_lp_mint: vault_b_lp_mint_state,
        vault_a_token,
        vault_b_token,
        clock,
        stake_data: HashMap::new(),
    }
}

#[allow(clippy::too_many_arguments)]
async fn swap(
    banks_client: &mut BanksClient,
    pool: Pubkey,
    in_amount: u64,
    out_amount: u64,
    in_token_mint: Pubkey,
    out_token_mint: Pubkey,
    quote_data: QuoteData,
    mock_user_keypair: &Keypair,
) -> u64 {
    let QuoteData {
        vault_a: vault_a_state,
        pool: pool_state,
        vault_b: vault_b_state,
        ..
    } = quote_data;

    let ix_data = prog_dynamic_amm::instruction::Swap {
        in_amount,
        minimum_out_amount: out_amount,
    }
    .data();

    let user_source_token =
        get_associated_token_address(&mock_user_keypair.pubkey(), &in_token_mint);
    let user_destination_token =
        get_associated_token_address(&mock_user_keypair.pubkey(), &out_token_mint);

    let before_token_balance = banks_client
        .get_account(user_destination_token)
        .await
        .unwrap()
        .map(|account| TokenAccount::try_deserialize(&mut account.data.as_ref()).unwrap())
        .unwrap()
        .amount;

    let protocol_token_fee = if pool_state.token_a_mint.eq(&in_token_mint) {
        pool_state.protocol_token_a_fee
    } else {
        pool_state.protocol_token_b_fee
    };

    let ix_accounts = prog_dynamic_amm::accounts::Swap {
        pool,
        user: mock_user_keypair.pubkey(),
        user_destination_token,
        user_source_token,
        a_vault: pool_state.a_vault,
        b_vault: pool_state.b_vault,
        a_vault_lp: pool_state.a_vault_lp,
        b_vault_lp: pool_state.b_vault_lp,
        a_token_vault: vault_a_state.token_vault,
        b_token_vault: vault_b_state.token_vault,
        a_vault_lp_mint: vault_a_state.lp_mint,
        b_vault_lp_mint: vault_b_state.lp_mint,
        protocol_token_fee,
        vault_program: prog_dynamic_vault::ID,
        token_program: anchor_spl::token::ID,
    }
    .to_account_metas(None);

    let ix = Instruction {
        program_id: prog_dynamic_amm::ID,
        accounts: ix_accounts,
        data: ix_data,
    };

    process_and_assert_ok(&[ix], mock_user_keypair, &[mock_user_keypair], banks_client).await;

    let after_token_balance = banks_client
        .get_account(user_destination_token)
        .await
        .unwrap()
        .map(|account| TokenAccount::try_deserialize(&mut account.data.as_ref()).unwrap())
        .unwrap()
        .amount;

    after_token_balance - before_token_balance
}

#[tokio::test]
async fn test_quote() {
    let pools: [Pubkey; 3] = [
        solana_sdk::pubkey!("32D4zRxNc1EssbJieVHfPhZM3rH6CzfUPrWUuWxD9prG"),
        solana_sdk::pubkey!("12axRhGcPfHdg345DSdtzrj51vkf6uk2jAxDF5E1cQY"),
        solana_sdk::pubkey!("HKyrNi2yfBQyFY7jH3c2h9YqVrmuLqe3tUZXFQhNY6PW"),
    ];

    for pool in pools {
        let mut program_test = ProgramTest::default();

        program_test.prefer_bpf(true);
        program_test.add_program("dynamic_amm", prog_dynamic_amm::ID, None);
        program_test.add_program("dynamic_vault", prog_dynamic_vault::ID, None);

        let rpc_client = RpcClient::new(Cluster::Mainnet.url().to_owned());

        let SetupContextResult {
            mock_user_keypair,
            mut banks_client,
        } = setup_accounts_and_start(&rpc_client, program_test, pool).await;

        let pool_state = banks_client
            .get_account(pool)
            .await
            .unwrap()
            .map(|account| Pool::try_deserialize(&mut account.data.as_ref()).unwrap())
            .unwrap();

        for (in_token_mint, out_token_mint) in [
            (pool_state.token_a_mint, pool_state.token_b_mint),
            (pool_state.token_b_mint, pool_state.token_a_mint),
        ] {
            let in_amount = 100_000_000;
            let quote_data = get_quote_data(&mut banks_client, pool).await;
            let quote =
                dynamic_amm_quote::compute_quote(in_token_mint, in_amount, quote_data.clone())
                    .unwrap();

            println!("{:#?}", quote);

            let token_received = swap(
                &mut banks_client,
                pool,
                in_amount,
                quote.out_amount,
                in_token_mint,
                out_token_mint,
                quote_data,
                &mock_user_keypair,
            )
            .await;

            assert_eq!(
                quote.out_amount, token_received,
                "Swap quote amount doesn't matches actual swap out amount"
            );
        }
    }
}
