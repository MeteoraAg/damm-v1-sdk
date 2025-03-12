use crate::{
    constants::{activation::*, fee::*, FEE_CURVE_DURATION_NUMBER, QUOTE_MINTS},
    error::PoolError,
    get_first_key, get_lp_mint_decimal, get_second_key,
    state::{FeeCurveType, Pool},
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
use std::u64;

#[derive(Accounts)]
pub struct InitializeCustomizablePermissionlessConstantProductPool<'info> {
    #[account(
        init,
        seeds = [
            b"pool",
            get_first_key(token_a_mint.key(), token_b_mint.key()).as_ref(),
            get_second_key(token_a_mint.key(), token_b_mint.key()).as_ref(),
        ],
        bump,
        payer = payer,
        space = 8 + std::mem::size_of::<Pool>()
    )]
    /// Pool account (PDA address)
    pub pool: Box<Account<'info, Pool>>,

    /// LP token mint of the pool
    #[account(
        init,
        seeds = [
            "lp_mint".as_ref(),
            pool.key().as_ref()
        ],
        bump,
        payer = payer,
        mint::decimals = get_lp_mint_decimal(token_a_mint.decimals, token_b_mint.decimals),
        mint::authority = a_vault_lp,
    )]
    pub lp_mint: Box<Account<'info, Mint>>,

    /// Token A mint of the pool. Eg: USDT
    pub token_a_mint: Box<Account<'info, Mint>>,
    /// Token B mint of the pool. Eg: USDC
    #[account(
        constraint = token_b_mint.key() != token_a_mint.key() @ PoolError::MismatchedTokenMint
    )]
    pub token_b_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    /// Vault account for token A. Token A of the pool will be deposit / withdraw from this vault account.
    pub a_vault: AccountInfo<'info>,
    #[account(mut)]
    /// Vault account for token B. Token B of the pool will be deposit / withdraw from this vault account.
    pub b_vault: AccountInfo<'info>,

    #[account(mut)]
    /// Token vault account of vault A
    pub a_token_vault: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    /// Token vault account of vault B
    pub b_token_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    /// LP token mint of vault A
    pub a_vault_lp_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    /// LP token mint of vault B
    pub b_vault_lp_mint: Box<Account<'info, Mint>>,
    /// LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault.
    #[account(
        init,
        seeds = [
            a_vault.key().as_ref(),
            pool.key().as_ref()
        ],
        bump,
        payer = payer,
        token::mint = a_vault_lp_mint,
        token::authority = a_vault_lp
    )]
    pub a_vault_lp: Box<Account<'info, TokenAccount>>,
    /// LP token account of vault B. Used to receive/burn vault LP upon deposit/withdraw from the vault.
    #[account(
        init,
        seeds = [
            b_vault.key().as_ref(),
            pool.key().as_ref()
        ],
        bump,
        payer = payer,
        token::mint = b_vault_lp_mint,
        token::authority = a_vault_lp
    )]
    pub b_vault_lp: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    /// Payer token account for pool token A mint. Used to bootstrap the pool with initial liquidity.
    pub payer_token_a: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    /// Admin token account for pool token B mint. Used to bootstrap the pool with initial liquidity.
    pub payer_token_b: Box<Account<'info, TokenAccount>>,

    /// CHECK: Payer pool LP token account. Used to receive LP during first deposit (initialize pool)
    #[account(
        init,
        payer = payer,
        associated_token::mint = lp_mint,
        associated_token::authority = payer,
    )]
    pub payer_pool_lp: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        seeds = [
            "fee".as_ref(),
            token_a_mint.key().as_ref(),
            pool.key().as_ref()
        ],
        bump,
        payer = payer,
        token::mint = token_a_mint,
        token::authority = a_vault_lp
    )]
    /// Protocol fee token account for token A. Used to receive trading fee.
    pub protocol_token_a_fee: Box<Account<'info, TokenAccount>>,

    /// Protocol fee token account for token B. Used to receive trading fee.
    #[account(
        init,
        seeds = [
            "fee".as_ref(),
            token_b_mint.key().as_ref(),
            pool.key().as_ref()
        ],
        bump,
        payer = payer,
        token::mint = token_b_mint,
        token::authority = a_vault_lp
    )]
    pub protocol_token_b_fee: Box<Account<'info, TokenAccount>>,

    /// Admin account. This account will be the admin of the pool, and the payer for PDA during initialize pool.
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Rent account.
    pub rent: Sysvar<'info, Rent>,

    /// CHECK: LP mint metadata PDA. Metaplex do the checking.
    #[account(mut)]
    pub mint_metadata: UncheckedAccount<'info>,

    /// CHECK: Metadata program
    pub metadata_program: UncheckedAccount<'info>,

    /// Vault program. The pool will deposit/withdraw liquidity from the vault.
    pub vault_program: UncheckedAccount<'info>,
    /// Token program.
    pub token_program: Program<'info, Token>,
    /// Associated token program.
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// System program.
    pub system_program: Program<'info, System>,
}

#[derive(Copy, Clone, Debug, AnchorSerialize, AnchorDeserialize, InitSpace, Default, PartialEq)]
pub struct FeeBpsFromDuration {
    // Fee bps
    pub fee_bps: u16, //u16::MAX = 65_535 > 10_000
    // Activated duration (from current point)
    pub activated_duration: u32,
}

#[derive(Copy, Clone, Debug, AnchorSerialize, AnchorDeserialize, Default, InitSpace, PartialEq)]
pub struct FeeCurveInfoFromDuration {
    /// Fee curve type, could be flat or linear
    pub fee_curve_type: FeeCurveType,
    /// Fee curve point
    pub points: [FeeBpsFromDuration; FEE_CURVE_DURATION_NUMBER],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct CustomizableParams {
    /// Trading fee.
    pub trade_fee_numerator: u32,
    /// The pool start trading.
    pub activation_point: Option<u64>,
    /// Whether the pool support alpha vault
    pub has_alpha_vault: bool,
    /// Activation type
    pub activation_type: u8,
    /// Fee curve info
    pub fee_curve: FeeCurveInfoFromDuration,
    /// Padding
    pub padding: [u8; 53],
}
