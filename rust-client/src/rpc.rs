use crate::fee_estimation::DEFAULT_SIGNATURE_FEE;
use anchor_client::solana_client::rpc_config::RpcSimulateTransactionAccountsConfig;
use anchor_client::solana_client::rpc_config::RpcSimulateTransactionConfig;
use anchor_client::solana_client::rpc_response::Response;
use anchor_client::solana_client::rpc_response::RpcSimulateTransactionResult;
use anchor_client::Program;
use anchor_client::{Client as AnchorClient, Cluster};
use anchor_lang::AnchorDeserialize;
use solana_rpc_client::rpc_client::RpcClient;
use solana_rpc_client::rpc_client::SerializableTransaction;
use solana_sdk::commitment_config::CommitmentConfig;
use solana_sdk::compute_budget::ComputeBudgetInstruction;
use solana_sdk::message::Message;
use solana_sdk::message::VersionedMessage;
use solana_sdk::signature::Signature;
use solana_sdk::transaction::Transaction;
use solana_sdk::transaction::VersionedTransaction;
use solana_sdk::{pubkey::Pubkey, signer::keypair::Keypair};
use std::rc::Rc;

pub const TX_ACTION_SIMULATION: u8 = 0;
pub const TX_ACTION_SENT_TX: u8 = 1;
pub const TX_ACTION_ESTIMATE_FEE: u8 = 2;

#[derive(Debug, Clone)]
pub struct TransactionPayload {
    pub wallet_memo: String,
    pub payload: Vec<u8>,
}
#[derive(serde::Deserialize, serde::Serialize)]
pub struct SimulationResult {
    pub result: Response<RpcSimulateTransactionResult>,
    pub pre_payer_balance: u64,
    pub post_payer_balance: u64,
}

#[derive(Debug, Clone)]
pub struct RpcArgs {
    pub rpc_url: String,
    pub priority_fee: u64,
    pub tx_action: u8,
    pub keypair_path: Option<String>,
}

impl RpcArgs {
    pub fn get_program_client(&self, program_id: Pubkey) -> Program<Rc<Keypair>> {
        let payer = Keypair::new();
        let client = AnchorClient::new_with_options(
            Cluster::Custom(self.rpc_url.clone(), self.rpc_url.clone()),
            Rc::new(Keypair::from_bytes(&payer.to_bytes()).unwrap()),
            CommitmentConfig::finalized(),
        );
        let program: anchor_client::Program<Rc<Keypair>> = client.program(program_id).unwrap();
        program
    }

    pub fn send_transaction_wrapper(
        &self,
        tx: &Transaction,
        max_retries: u64,
        payer: Pubkey,
        wallet_memo: String,
        sucess_cb: fn(wallet_memo: String, sig: Signature),
        failed_cb: fn(wallet_memo: String),
    ) -> anyhow::Result<TransactionPayload> {
        match self.tx_action {
            TX_ACTION_SIMULATION => {
                let client =
                    RpcClient::new_with_commitment(&self.rpc_url, CommitmentConfig::finalized());
                let pre_payer_balance = client.get_account(&payer)?.lamports;
                let mut result = self.simulation_transaction(vec![payer.to_string()], tx)?;
                let post_payer_balance = if result.value.err.is_none() {
                    let accounts = result.value.accounts.unwrap();
                    let account = accounts[0].clone().unwrap();
                    account.lamports
                } else {
                    pre_payer_balance
                };

                println!("{} {:?}", wallet_memo, result.value.logs);

                result.value.accounts = None;
                Ok(TransactionPayload {
                    wallet_memo,
                    payload: bincode::serialize(&SimulationResult {
                        result,
                        pre_payer_balance,
                        post_payer_balance,
                    })?,
                })
            }
            TX_ACTION_ESTIMATE_FEE => {
                let fee = self.estimate_transaction_fee(wallet_memo.clone(), tx)?;
                Ok(TransactionPayload {
                    wallet_memo,
                    payload: bincode::serialize(&fee)?,
                })
            }
            TX_ACTION_SENT_TX => match self.send_transaction(tx, max_retries) {
                Ok(sig) => {
                    sucess_cb(wallet_memo.clone(), sig);
                    Ok(TransactionPayload {
                        wallet_memo,
                        payload: bincode::serialize(&sig)?,
                    })
                }
                Err(e) => {
                    failed_cb(wallet_memo);
                    Err(anyhow::Error::msg(e))
                }
            },
            _ => {
                panic!("Tx action {} is not supported", self.tx_action);
            }
        }
    }

    pub fn send_versioned_transaction_wrapper(
        &self,
        tx: &VersionedTransaction,
        max_retries: u64,
        payer: Pubkey,
        wallet_memo: String,
        sucess_cb: fn(wallet_memo: String, sig: Signature),
        failed_cb: fn(wallet_memo: String),
    ) -> anyhow::Result<TransactionPayload> {
        match self.tx_action {
            TX_ACTION_SIMULATION => {
                let client =
                    RpcClient::new_with_commitment(&self.rpc_url, CommitmentConfig::finalized());
                let pre_payer_balance = client.get_account(&payer)?.lamports;
                let mut result = self.simulation_transaction(vec![payer.to_string()], tx)?;
                let post_payer_balance = if result.value.err.is_none() {
                    let accounts = result.value.accounts.unwrap();
                    let account = accounts[0].clone().unwrap();
                    account.lamports
                } else {
                    pre_payer_balance
                };
                result.value.accounts = None;
                Ok(TransactionPayload {
                    wallet_memo,
                    payload: bincode::serialize(&SimulationResult {
                        result,
                        pre_payer_balance,
                        post_payer_balance,
                    })?,
                })
            }
            TX_ACTION_ESTIMATE_FEE => {
                let fee = self.estimate_versioned_transaction_fee(wallet_memo.clone(), tx)?;
                Ok(TransactionPayload {
                    wallet_memo,
                    payload: bincode::serialize(&fee)?,
                })
            }
            TX_ACTION_SENT_TX => match self.send_transaction(tx, max_retries) {
                Ok(sig) => {
                    sucess_cb(wallet_memo.clone(), sig);
                    Ok(TransactionPayload {
                        wallet_memo,
                        payload: bincode::serialize(&sig)?,
                    })
                }
                Err(e) => {
                    failed_cb(wallet_memo);
                    Err(anyhow::Error::msg(e))
                }
            },
            _ => panic!("Tx action {} is not supported", self.tx_action),
        }
    }

    pub fn send_transaction(
        &self,
        tx: &impl SerializableTransaction,
        max_retries: u64,
    ) -> anyhow::Result<Signature> {
        let client = RpcClient::new_with_commitment(&self.rpc_url, CommitmentConfig::finalized());
        for _i in 0..max_retries {
            match client.send_and_confirm_transaction_with_spinner(tx) {
                Ok(_) => {
                    return Ok(*tx.get_signature());
                }
                Err(e) => {
                    println!("cannot send tx {:?}", e);
                }
            }
        }
        return Err(anyhow::Error::msg("Cannot send transaction"));
    }

    pub fn simulation_transaction(
        &self,
        addresses: Vec<String>,
        tx: &impl SerializableTransaction,
    ) -> anyhow::Result<Response<RpcSimulateTransactionResult>> {
        // get pre balance
        let client = RpcClient::new_with_commitment(&self.rpc_url, CommitmentConfig::finalized());
        let result = client.simulate_transaction_with_config(
            tx,
            RpcSimulateTransactionConfig {
                commitment: Some(CommitmentConfig::finalized()),
                accounts: Some(RpcSimulateTransactionAccountsConfig {
                    addresses,
                    encoding: None,
                }),
                ..RpcSimulateTransactionConfig::default()
            },
        )?;
        Ok(result)
    }

    pub fn estimate_transaction_fee(
        &self,
        wallet_memo: String,
        tx: &Transaction,
    ) -> anyhow::Result<u64> {
        let num_signature = tx.signatures.len();
        let base_fee = (num_signature as u64) * DEFAULT_SIGNATURE_FEE;

        let x =
            match ComputeBudgetInstruction::deserialize(&mut &tx.message.instructions[0].data[..])
                .unwrap()
            {
                ComputeBudgetInstruction::SetComputeUnitPrice(price) => price,
                ComputeBudgetInstruction::SetComputeUnitLimit(compute_unit) => compute_unit as u64,
                _ => 0,
            };

        let y =
            match ComputeBudgetInstruction::deserialize(&mut &tx.message.instructions[1].data[..])
                .unwrap()
            {
                ComputeBudgetInstruction::SetComputeUnitPrice(price) => price,
                ComputeBudgetInstruction::SetComputeUnitLimit(compute_unit) => compute_unit as u64,
                _ => 0,
            };

        if x == 0 && y == 0 {
            println!("Cannot estimate price {}", wallet_memo);
            return Ok(0);
        }
        let total_fee = base_fee + x * y;
        // println!("Wallet {} fee {}", wallet_memo, total_fee);
        Ok(total_fee)
    }

    pub fn estimate_versioned_transaction_fee(
        &self,
        wallet_memo: String,
        tx: &VersionedTransaction,
    ) -> anyhow::Result<u64> {
        let num_signature = tx.signatures.len();
        let base_fee = (num_signature as u64) * DEFAULT_SIGNATURE_FEE;

        let instructions = match tx.message.clone() {
            VersionedMessage::Legacy(Message {
                header: _,
                account_keys: _,
                recent_blockhash: _,
                instructions,
            }) => instructions,
            VersionedMessage::V0(solana_sdk::message::v0::Message {
                header: _,
                account_keys: _,
                recent_blockhash: _,
                instructions,
                address_table_lookups: _,
            }) => instructions,
        };
        let x = match ComputeBudgetInstruction::deserialize(&mut &instructions[1].data[..]).unwrap()
        {
            ComputeBudgetInstruction::SetComputeUnitPrice(price) => price,
            ComputeBudgetInstruction::SetComputeUnitLimit(compute_unit) => compute_unit as u64,
            _ => 0,
        };

        let y = match ComputeBudgetInstruction::deserialize(&mut &instructions[0].data[..]).unwrap()
        {
            ComputeBudgetInstruction::SetComputeUnitPrice(price) => price,
            ComputeBudgetInstruction::SetComputeUnitLimit(compute_unit) => compute_unit as u64,
            _ => 0,
        };

        if x == 0 && y == 0 {
            println!("Cannot estimate price {}", wallet_memo);
            return Ok(0);
        }
        // println!("{} {}", x, y);
        let total_fee = base_fee + x * y;
        println!("Wallet {} fee {}", wallet_memo, total_fee);
        Ok(total_fee)
    }
}
