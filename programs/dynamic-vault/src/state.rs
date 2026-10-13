//! Vault and strategy states

use anchor_lang::prelude::*;
use std::fmt::Debug;

/// Max strategy number that a vault can support.
/// The 30th legacy strategy slot is reused for `version`, `total_lp_supply` and `_padding0`.
pub const MAX_STRATEGY: usize = 29;
/// Vault tracks LP supply internally in `total_lp_supply`
pub const VAULT_VERSION_TRACKED_LP_SUPPLY: u8 = 1;
/// Max bump numer that a strategy can support
pub const MAX_BUMPS: usize = 10;
/// DENOMINATOR of degradation
pub const LOCKED_PROFIT_DEGRADATION_DENOMINATOR: u128 = 1_000_000_000_000;

/// Vault struct
#[account]
#[derive(Debug)]
pub struct Vault {
    /// The flag, if admin set enable = false, then the user can only withdraw and cannot deposit in the vault.
    pub enabled: u8,
    /// Vault nonce, to create vault seeds
    pub bumps: VaultBumps,
    /// The total liquidity of the vault, including remaining tokens in token_vault and the liquidity in all strategies.
    pub total_amount: u64,
    /// Token account, hold liquidity in vault reserve
    pub token_vault: Pubkey,
    /// Hold lp token of vault, each time rebalance crank is called, vault calculate performance fee and mint corresponding lp token amount to fee_vault. fee_vault is owned by treasury address
    pub fee_vault: Pubkey,
    /// Token mint that vault supports
    pub token_mint: Pubkey,
    /// Lp mint of vault
    pub lp_mint: Pubkey,
    /// The list of strategy addresses that vault supports, vault can support up to MAX_STRATEGY strategies at the same time.
    pub strategies: [Pubkey; MAX_STRATEGY],
    /// Vault version. 0 = legacy (LP supply from lp_mint.supply), 1 = LP supply tracked in `total_lp_supply`
    pub version: u8,
    /// Total LP supply tracked by the vault (only valid when version = 1)
    pub total_lp_supply: u64,
    /// Padding, keeps the layout compatible with the legacy 30th strategy slot
    pub _padding0: [u8; 23],
    /// The base address to create vault seeds
    pub base: Pubkey,
    /// Admin of vault
    pub admin: Pubkey,
    /// Person who can send the crank. Operator can only send liquidity to strategies that admin defined, and claim reward to account of treasury address
    pub operator: Pubkey,
    /// Stores information for locked profit.
    pub locked_profit_tracker: LockedProfitTracker,
}

impl Vault {
    /// Get the LP supply used for share pricing, based on vault version.
    /// Returns None when the tracked supply is smaller than the LP mint supply (invalid accounting).
    pub fn get_lp_supply(&self, lp_mint_supply: u64) -> Option<u64> {
        if self.version == VAULT_VERSION_TRACKED_LP_SUPPLY {
            if self.total_lp_supply < lp_mint_supply {
                return None;
            }
            Some(self.total_lp_supply)
        } else {
            Some(lp_mint_supply)
        }
    }

    /// Get amount by share
    pub fn get_amount_by_share(
        &self,
        current_time: u64,
        share: u64,
        total_supply: u64,
    ) -> Option<u64> {
        let total_amount = self.get_unlocked_amount(current_time)?;
        u64::try_from(
            u128::from(share)
                .checked_mul(u128::from(total_amount))?
                .checked_div(u128::from(total_supply))?,
        )
        .ok()
    }
    /// Get unlocked amount of vault
    pub fn get_unlocked_amount(&self, current_time: u64) -> Option<u64> {
        self.total_amount.checked_sub(
            self.locked_profit_tracker
                .calculate_locked_profit(current_time)?,
        )
    }

    /// Get unmint amount by token amount
    pub fn get_unmint_amount(
        &self,
        current_time: u64,
        out_token: u64,
        total_supply: u64,
    ) -> Option<u64> {
        let total_amount = self.get_unlocked_amount(current_time)?;
        u64::try_from(
            u128::from(out_token)
                .checked_mul(u128::from(total_supply))?
                .checked_div(u128::from(total_amount))?,
        )
        .ok()
    }
}

/// LockedProfitTracker struct
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct LockedProfitTracker {
    /// The total locked profit from the last report
    pub last_updated_locked_profit: u64,
    /// The last timestamp (in seconds) rebalancing
    pub last_report: u64,
    /// Rate per second of degradation
    pub locked_profit_degradation: u64,
}

impl LockedProfitTracker {
    /// Calculate locked profit, based from Yearn `https://github.com/yearn/yearn-vaults/blob/main/contracts/Vault.vy#L825`
    pub fn calculate_locked_profit(&self, current_time: u64) -> Option<u64> {
        let duration = u128::from(current_time.checked_sub(self.last_report)?);
        let locked_profit_degradation = u128::from(self.locked_profit_degradation);
        let locked_fund_ratio = duration.checked_mul(locked_profit_degradation)?;

        if locked_fund_ratio > LOCKED_PROFIT_DEGRADATION_DENOMINATOR {
            return Some(0);
        }
        let locked_profit = u128::from(self.last_updated_locked_profit);

        let locked_profit = (locked_profit
            .checked_mul(LOCKED_PROFIT_DEGRADATION_DENOMINATOR - locked_fund_ratio)?)
        .checked_div(LOCKED_PROFIT_DEGRADATION_DENOMINATOR)?;
        let locked_profit = u64::try_from(locked_profit).ok()?;
        Some(locked_profit)
    }
}

impl Default for StrategyType {
    fn default() -> Self {
        StrategyType::Vault
    }
}

/// Strategy struct
#[account]
#[derive(Default, Debug)]
pub struct Strategy {
    /// Lending pool address, that the strategy will deposit/withdraw balance
    pub reserve: Pubkey,
    /// The token account, that holds the collateral token
    pub collateral_vault: Pubkey,
    /// Specify type of strategy
    pub strategy_type: StrategyType,
    /// The liquidity in strategy at the time vault deposit/withdraw from a lending protocol
    pub current_liquidity: u64,
    /// Hold some bumps, in case the strategy needs to use other seeds to sign a CPI call.
    pub bumps: [u8; MAX_BUMPS],
    /// Vault address, that the strategy belongs
    pub vault: Pubkey,
    /// If we remove strategy by remove_strategy2 endpoint, this account will be never added again
    pub is_disable: u8,
}

/// Vault bumps struct
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Debug)]
pub struct VaultBumps {
    /// vault_bump
    pub vault_bump: u8,
    /// token_vault_bump
    pub token_vault_bump: u8,
}

/// Strategy bumps struct
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Debug)]
pub struct StrategyBumps {
    /// strategy_index
    pub strategy_index: u8,
    /// Bumps of PDAs for the integrated protocol.
    pub other_bumps: [u8; MAX_BUMPS],
}

/// StrategyType struct
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum StrategyType {
    /// Deposit in PortFinance’s reserve to get collateral, the value of collateral will increase overtime by accruing interest, and we can claim more liquidity later
    PortFinanceWithoutLM,
    /// Currently we don’t support this strategy
    PortFinanceWithLM,
    /// Deposit in Solend’s reserve
    SolendWithoutLM,
    /// Deposit in Mango’s reserve
    Mango,
    /// Deposit in Solend’s reserve with obligation
    SolendWithLM,
    /// Deposit in Apricot’s reserve
    ApricotWithoutLM,
    /// Deposit in Francium’s reserve
    Francium,
    /// Deposit in Tulip's reserve
    Tulip,
    /// This implementation is to compatible with remove_strategy2 endpoint
    Vault,
    /// Deposit in Drift's spot market
    Drift,
    /// Deposit in Frakt
    Frakt,
    /// Deposit in Marginfi
    Marginfi,
    /// Deposit in Kamino
    Kamino,
}
