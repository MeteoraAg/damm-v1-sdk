use super::VAULT_WITH_NON_PDA_BASED_LP_MINT;
use solana_sdk::pubkey::Pubkey;

pub fn derive_vault_key(mint: Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[
            dynamic_vault::seed::VAULT_PREFIX.as_ref(),
            mint.as_ref(),
            dynamic_vault::get_base_address().as_ref(),
        ],
        &dynamic_vault::ID,
    )
    .0
}

pub fn derive_token_vault_key(vault: Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[
            dynamic_vault::seed::TOKEN_VAULT_PREFIX.as_ref(),
            vault.as_ref(),
        ],
        &dynamic_vault::ID,
    )
    .0
}

pub fn derive_lp_mint_key(vault: Pubkey) -> Pubkey {
    let non_derived_based_lp_mint = VAULT_WITH_NON_PDA_BASED_LP_MINT.get(&vault).cloned();

    if let Some(lp_mint) = non_derived_based_lp_mint {
        lp_mint
    } else {
        Pubkey::find_program_address(
            &[dynamic_vault::seed::LP_MINT_PREFIX.as_ref(), vault.as_ref()],
            &dynamic_vault::ID,
        )
        .0
    }
}
