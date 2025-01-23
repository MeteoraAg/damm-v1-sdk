use crate::{dynamic_amm::pda::*, dynamic_vault::pda::*};
use anchor_lang::AccountDeserialize;
use anchor_spl::associated_token::get_associated_token_address;
use dynamic_amm::state::{Depeg, TokenMultiplier};
use dynamic_vault::state::Vault;
use solana_sdk::{account::Account, pubkey::Pubkey};
use std::future::Future;

pub enum CurveTypeIx {
    ConstantProduct,
    Stable,
}

impl From<CurveTypeIx> for dynamic_amm::state::CurveType {
    fn from(value: CurveTypeIx) -> Self {
        match value {
            CurveTypeIx::ConstantProduct => dynamic_amm::state::CurveType::ConstantProduct,
            CurveTypeIx::Stable => dynamic_amm::state::CurveType::Stable {
                amp: 0,
                token_multiplier: TokenMultiplier::default(),
                depeg: Depeg::default(),
                last_amp_updated_timestamp: 0,
            },
        }
    }
}

fn get_or_derive_vault_related_keys(
    vault_key: Pubkey,
    vault_account: Result<Account, Box<dyn std::error::Error>>,
) -> Result<(Pubkey, Pubkey), Box<dyn std::error::Error>> {
    if let Ok(account) = vault_account {
        let vault = Vault::try_deserialize(&mut account.data.as_ref())?;
        Ok((vault.token_vault, vault.lp_mint))
    } else {
        let token_vault = derive_token_vault_key(vault_key);
        let lp_mint = crate::dynamic_vault::pda::derive_lp_mint_key(vault_key);
        Ok((token_vault, lp_mint))
    }
}

struct InitPoolRelatedKeys {
    vault_a: Pubkey,
    vault_a_token_vault: Pubkey,
    vault_a_lp_mint: Pubkey,
    vault_a_lp: Pubkey,
    vault_b: Pubkey,
    vault_b_token_vault: Pubkey,
    vault_b_lp_mint: Pubkey,
    vault_b_lp: Pubkey,
    lp_mint: Pubkey,
    protocol_token_a_fee: Pubkey,
    protocol_token_b_fee: Pubkey,
    mint_metadata: Pubkey,
    payer_token_a: Pubkey,
    payer_pool_lp: Pubkey,
    payer_token_b: Pubkey,
}

async fn get_or_derive_initialize_pool_related_keys<F, Fut>(
    pool_key: Pubkey,
    token_a_mint: Pubkey,
    token_b_mint: Pubkey,
    payer: Pubkey,
    account_fetcher: F,
) -> Result<InitPoolRelatedKeys, Box<dyn std::error::Error>>
where
    F: Fn(Pubkey) -> Fut,
    Fut: Future<Output = Result<Account, Box<dyn std::error::Error>>>,
{
    let vault_a_key = derive_vault_key(token_a_mint);
    let vault_b_key = derive_vault_key(token_b_mint);

    let vault_a_account = account_fetcher(vault_a_key).await;
    let (vault_a_token_vault, vault_a_lp_mint) =
        get_or_derive_vault_related_keys(vault_a_key, vault_a_account)?;

    let vault_b_account = account_fetcher(vault_b_key).await;
    let (vault_b_token_vault, vault_b_lp_mint) =
        get_or_derive_vault_related_keys(vault_b_key, vault_b_account)?;

    let lp_mint = crate::dynamic_amm::pda::derive_lp_mint_key(pool_key);

    let protocol_token_a_fee = derive_protocol_fee_key(token_a_mint, pool_key);
    let protocol_token_b_fee = derive_protocol_fee_key(token_b_mint, pool_key);

    let vault_a_lp_key = derive_vault_lp_key(vault_a_key, pool_key);
    let vault_b_lp_key = derive_vault_lp_key(vault_b_key, pool_key);

    let mint_metadata = derive_metadata_key(lp_mint);

    let payer_token_a = get_associated_token_address(&payer, &token_a_mint);
    let payer_token_b = get_associated_token_address(&payer, &token_b_mint);
    let payer_pool_lp = get_associated_token_address(&payer, &lp_mint);

    Ok(InitPoolRelatedKeys {
        vault_a: vault_a_key,
        vault_a_token_vault,
        vault_a_lp_mint,
        vault_a_lp: vault_a_lp_key,
        vault_b: vault_b_key,
        vault_b_token_vault,
        vault_b_lp_mint,
        vault_b_lp: vault_b_lp_key,
        lp_mint,
        protocol_token_a_fee,
        protocol_token_b_fee,
        mint_metadata,
        payer_token_a,
        payer_pool_lp,
        payer_token_b,
    })
}

pub struct IxAccountBuilder;

impl IxAccountBuilder {
    pub async fn initialize_permissionless_pool_with_fee_tier_accounts<F, Fut>(
        curve_type_ix: CurveTypeIx,
        trade_fee_bps: u64,
        token_a_mint: Pubkey,
        token_b_mint: Pubkey,
        payer: Pubkey,
        account_fetcher: F,
    ) -> Result<
        dynamic_amm::accounts::InitializePermissionlessPoolWithFeeTier,
        Box<dyn std::error::Error>,
    >
    where
        F: Fn(Pubkey) -> Fut,
        Fut: Future<Output = Result<Account, Box<dyn std::error::Error>>>,
    {
        let curve_type = curve_type_ix.into();

        let pool_key = derive_permissionless_pool_key_with_fee_tier(
            curve_type,
            token_a_mint,
            token_b_mint,
            trade_fee_bps,
        );

        let InitPoolRelatedKeys {
            vault_a,
            vault_a_token_vault,
            vault_a_lp_mint,
            vault_a_lp,
            vault_b,
            vault_b_token_vault,
            vault_b_lp_mint,
            vault_b_lp,
            lp_mint,
            protocol_token_a_fee,
            protocol_token_b_fee,
            mint_metadata,
            payer_token_a,
            payer_pool_lp,
            payer_token_b,
        } = get_or_derive_initialize_pool_related_keys(
            pool_key,
            token_a_mint,
            token_b_mint,
            payer,
            account_fetcher,
        )
        .await?;

        let accounts = dynamic_amm::accounts::InitializePermissionlessPoolWithFeeTier {
            pool: pool_key,
            token_a_mint,
            token_b_mint,
            lp_mint,
            a_vault: vault_a,
            a_token_vault: vault_a_token_vault,
            a_vault_lp: vault_a_lp,
            a_vault_lp_mint: vault_a_lp_mint,
            b_vault: vault_b,
            b_token_vault: vault_b_token_vault,
            b_vault_lp: vault_b_lp,
            b_vault_lp_mint: vault_b_lp_mint,
            protocol_token_a_fee,
            protocol_token_b_fee,
            mint_metadata,
            payer_token_a,
            payer_pool_lp,
            payer_token_b,
            payer,
            // Deprecated field
            fee_owner: payer,
            vault_program: dynamic_vault::ID,
            metadata_program: mpl_token_metadata::ID,
            rent: solana_sdk::sysvar::rent::ID,
            associated_token_program: anchor_spl::associated_token::ID,
            system_program: solana_sdk::system_program::ID,
            token_program: anchor_spl::token::ID,
        };

        Ok(accounts)
    }

    pub async fn initialize_permissionless_pool_accounts<F, Fut>(
        curve_type_ix: CurveTypeIx,
        token_a_mint: Pubkey,
        token_b_mint: Pubkey,
        payer: Pubkey,
        account_fetcher: F,
    ) -> Result<dynamic_amm::accounts::InitializePermissionlessPool, Box<dyn std::error::Error>>
    where
        F: Fn(Pubkey) -> Fut,
        Fut: Future<Output = Result<Account, Box<dyn std::error::Error>>>,
    {
        let curve_type = curve_type_ix.into();

        let pool_key = derive_permissionless_pool_key(curve_type, token_a_mint, token_b_mint);

        let InitPoolRelatedKeys {
            vault_a,
            vault_a_token_vault,
            vault_a_lp_mint,
            vault_a_lp,
            vault_b,
            vault_b_token_vault,
            vault_b_lp_mint,
            vault_b_lp,
            lp_mint,
            protocol_token_a_fee,
            protocol_token_b_fee,
            mint_metadata,
            payer_token_a,
            payer_pool_lp,
            payer_token_b,
        } = get_or_derive_initialize_pool_related_keys(
            pool_key,
            token_a_mint,
            token_b_mint,
            payer,
            account_fetcher,
        )
        .await?;

        let accounts = dynamic_amm::accounts::InitializePermissionlessPool {
            pool: pool_key,
            token_a_mint,
            token_b_mint,
            lp_mint,
            a_vault: vault_a,
            a_token_vault: vault_a_token_vault,
            a_vault_lp: vault_a_lp,
            a_vault_lp_mint: vault_a_lp_mint,
            b_vault: vault_b,
            b_token_vault: vault_b_token_vault,
            b_vault_lp: vault_b_lp,
            b_vault_lp_mint: vault_b_lp_mint,
            protocol_token_a_fee,
            protocol_token_b_fee,
            mint_metadata,
            payer_token_a,
            payer_pool_lp,
            payer_token_b,
            payer,
            // Deprecated field
            fee_owner: payer,
            vault_program: dynamic_vault::ID,
            metadata_program: mpl_token_metadata::ID,
            rent: solana_sdk::sysvar::rent::ID,
            associated_token_program: anchor_spl::associated_token::ID,
            system_program: solana_sdk::system_program::ID,
            token_program: anchor_spl::token::ID,
        };

        Ok(accounts)
    }

    pub async fn initialize_permissionless_constant_product_pool_with_config_accounts<F, Fut>(
        token_a_mint: Pubkey,
        token_b_mint: Pubkey,
        config: Pubkey,
        payer: Pubkey,
        account_fetcher: F,
    ) -> Result<
        dynamic_amm::accounts::InitializePermissionlessConstantProductPoolWithConfig,
        Box<dyn std::error::Error>,
    >
    where
        F: Fn(Pubkey) -> Fut,
        Fut: Future<Output = Result<Account, Box<dyn std::error::Error>>>,
    {
        let pool_key = derive_permissionless_constant_product_pool_with_config_key(
            token_a_mint,
            token_b_mint,
            config,
        );

        let InitPoolRelatedKeys {
            vault_a,
            vault_a_token_vault,
            vault_a_lp_mint,
            vault_a_lp,
            vault_b,
            vault_b_token_vault,
            vault_b_lp_mint,
            vault_b_lp,
            lp_mint,
            protocol_token_a_fee,
            protocol_token_b_fee,
            mint_metadata,
            payer_token_a,
            payer_pool_lp,
            payer_token_b,
        } = get_or_derive_initialize_pool_related_keys(
            pool_key,
            token_a_mint,
            token_b_mint,
            payer,
            account_fetcher,
        )
        .await?;

        let accounts =
            dynamic_amm::accounts::InitializePermissionlessConstantProductPoolWithConfig {
                pool: pool_key,
                token_a_mint,
                token_b_mint,
                lp_mint,
                a_vault: vault_a,
                a_token_vault: vault_a_token_vault,
                a_vault_lp: vault_a_lp,
                a_vault_lp_mint: vault_a_lp_mint,
                b_vault: vault_b,
                b_token_vault: vault_b_token_vault,
                b_vault_lp: vault_b_lp,
                b_vault_lp_mint: vault_b_lp_mint,
                protocol_token_a_fee,
                protocol_token_b_fee,
                mint_metadata,
                payer_token_a,
                payer_pool_lp,
                payer_token_b,
                payer,
                config,
                vault_program: dynamic_vault::ID,
                metadata_program: mpl_token_metadata::ID,
                rent: solana_sdk::sysvar::rent::ID,
                associated_token_program: anchor_spl::associated_token::ID,
                system_program: solana_sdk::system_program::ID,
                token_program: anchor_spl::token::ID,
            };

        Ok(accounts)
    }

    pub async fn initialize_customizable_permissionless_constant_product_pool<F, Fut>(
        token_a_mint: Pubkey,
        token_b_mint: Pubkey,
        payer: Pubkey,
        account_fetcher: F,
    ) -> Result<
        dynamic_amm::accounts::InitializeCustomizablePermissionlessConstantProductPool,
        Box<dyn std::error::Error>,
    >
    where
        F: Fn(Pubkey) -> Fut,
        Fut: Future<Output = Result<Account, Box<dyn std::error::Error>>>,
    {
        let pool_key = derive_customizable_permissionless_constant_product_pool_key(
            token_a_mint,
            token_b_mint,
        );

        let InitPoolRelatedKeys {
            vault_a,
            vault_a_token_vault,
            vault_a_lp_mint,
            vault_a_lp,
            vault_b,
            vault_b_token_vault,
            vault_b_lp_mint,
            vault_b_lp,
            lp_mint,
            protocol_token_a_fee,
            protocol_token_b_fee,
            mint_metadata,
            payer_token_a,
            payer_pool_lp,
            payer_token_b,
        } = get_or_derive_initialize_pool_related_keys(
            pool_key,
            token_a_mint,
            token_b_mint,
            payer,
            account_fetcher,
        )
        .await?;

        let accounts =
            dynamic_amm::accounts::InitializeCustomizablePermissionlessConstantProductPool {
                pool: pool_key,
                token_a_mint,
                token_b_mint,
                lp_mint,
                a_vault: vault_a,
                a_token_vault: vault_a_token_vault,
                a_vault_lp: vault_a_lp,
                a_vault_lp_mint: vault_a_lp_mint,
                b_vault: vault_b,
                b_token_vault: vault_b_token_vault,
                b_vault_lp: vault_b_lp,
                b_vault_lp_mint: vault_b_lp_mint,
                protocol_token_a_fee,
                protocol_token_b_fee,
                mint_metadata,
                payer_token_a,
                payer_pool_lp,
                payer_token_b,
                payer,
                vault_program: dynamic_vault::ID,
                metadata_program: mpl_token_metadata::ID,
                rent: solana_sdk::sysvar::rent::ID,
                // Deprecated field
                associated_token_program: anchor_spl::associated_token::ID,
                system_program: solana_sdk::system_program::ID,
                token_program: anchor_spl::token::ID,
            };

        Ok(accounts)
    }
}
