//! Dynamic Yield Infrastructure For Solana
#![deny(rustdoc::all)]
#![allow(rustdoc::missing_doc_code_examples)]
#![warn(clippy::unwrap_used)]
#![warn(clippy::arithmetic_side_effects)]
#![allow(warnings)]

pub mod seed;
pub mod state;

use std::str::FromStr;

use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use state::Vault;

declare_id!("24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi");

/// Treasury address
pub fn get_treasury_address() -> Pubkey {
    Pubkey::from_str("9kZeN47U2dubGbbzMrzzoRAUvpuxVLRcjW9XiFpYjUo4")
        .expect("Must be correct Solana address")
}
/// Base address, setup by Mercurial
pub fn get_base_address() -> Pubkey {
    Pubkey::from_str("HWzXGcGHy4tcpYfaRDCyLNzXqBTv3E6BttpCH2vJxArv")
        .expect("Must be correct Solana address")
}

/// Base address, setup by Mercurial
pub fn get_base_address_for_idle_vault() -> Pubkey {
    Pubkey::default()
}

/// Program for vault
#[program]
pub mod dynamic_vault {
    use super::*;
    /// initialize new vault
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

/// Accounts for [vault::initialize]
#[derive(Accounts)]
pub struct Initialize<'info> {
    /// This is base account for all vault    
    /// No need base key now because we only allow 1 vault per token now
    // pub base: Signer<'info>,

    /// Vault account
    #[account(
        init,
        seeds = [
            seed::VAULT_PREFIX.as_ref(), token_mint.key().as_ref(), get_base_address().as_ref()
        ],
        bump,
        payer = payer,
        space = 8 + std::mem::size_of::<Vault>(),
    )]
    pub vault: Box<Account<'info, Vault>>,

    /// Payer can be anyone
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Token vault account
    #[account(
        init,
        seeds = [seed::TOKEN_VAULT_PREFIX.as_ref(), vault.key().as_ref()],
        bump,
        payer = payer,
        token::mint = token_mint,
        token::authority = vault,
    )]
    pub token_vault: Box<Account<'info, TokenAccount>>,
    /// Token mint account
    pub token_mint: Box<Account<'info, Mint>>, // allocate some accounts in heap to avoid stack frame size limit
    /// LP mint account
    #[account(
        init,
        seeds = [seed::LP_MINT_PREFIX.as_ref(), vault.key().as_ref()],
        bump,
        payer = payer,
        mint::decimals = token_mint.decimals,
        mint::authority = vault,
    )]
    pub lp_mint: Box<Account<'info, Mint>>,
    /// rent
    pub rent: Sysvar<'info, Rent>,
    /// token_program
    pub token_program: Program<'info, Token>,
    /// system_program
    pub system_program: Program<'info, System>,
}
