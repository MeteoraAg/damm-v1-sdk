//! Constants module includes constants value of the program
use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey;

/// Minimum seconds between last AMP changes
pub const MIN_CHANGE_AMP_DURATION: u64 = 600; // 10 minutes

pub const FEE_CURVE_POINT_NUMBER: usize = 7;

pub const FEE_CURVE_DURATION_NUMBER: usize = 6;

pub mod seeds {
    pub const CONFIG_PREFIX: &[u8] = b"config";
}

/// Store constants related to fees
pub mod fee {
    /// Trade fee numerator for constant product swap curve.
    // 25bps, https://docs.uniswap.org/protocol/V2/concepts/advanced-topics/fees
    pub const CONSTANT_PRODUCT_TRADE_FEE_NUMERATOR: u64 = 250;

    /// Trade fee numerator for stable swap curve.
    // 1bps, https://curve.fi/rootfaq
    pub const STABLE_SWAP_TRADE_FEE_NUMERATOR: u64 = 10;

    /// Protocol trade fee numerator for constant product swap curve.
    // 5bps, https://docs.uniswap.org/protocol/V2/concepts/advanced-topics/fees
    // pub const CONSTANT_PRODUCT_PROTOCOL_TRADE_FEE_NUMERATOR: u64 = 50;
    pub const CONSTANT_PRODUCT_PROTOCOL_TRADE_FEE_NUMERATOR: u64 = 0; // Set all protocol fees to zero, we will enable later when we have ve(3, 3)

    /// Protocol trade fee numerator for stable swap curve.
    // 0.5bps, https://curve.fi/rootfaq
    // pub const STABLE_SWAP_PROTOCOL_TRADE_FEE_NUMERATOR: u64 = 5;
    pub const STABLE_SWAP_PROTOCOL_TRADE_FEE_NUMERATOR: u64 = 0; // Set all protocol fees to zero, we will enable later when we have ve(3, 3)

    /// Host trade fee numerator
    // 20% of protocol trade fee
    pub const HOST_TRADE_FEE_NUMERATOR: u64 = 20000;

    /// Default fee denominator. DO NOT simply update it as it will break logic that depends on it as default value.
    pub const FEE_DENOMINATOR: u64 = 100000;
    /// Max fee BPS
    pub const MAX_FEE_BPS: u64 = 1500; // 15%
    /// Max basis point. 100% in pct
    pub const MAX_BASIS_POINT: u64 = 10000;

    // For meme coins
    pub const MEME_MIN_FEE_NUMERATOR: u64 = 250; // 250 / FEE_DENOMINATOR = 0.25%
    pub const MEME_MAX_FEE_NUMERATOR: u64 = 15000; // 15_000 / FEE_DENOMINATOR = 15%

    pub const MEME_MIN_FEE_BPS: u64 = 25; // 0.25%
    pub const MEME_MAX_FEE_BPS: u64 = 1500; // 15%

    pub const MEME_PROTOCOL_FEE_NUMERATOR: u64 = 20000; // 20%

    pub const MEME_MIN_FEE_UPDATE_WINDOW_DURATION: i64 = 60 * 30; // 30 minutes

    pub const MAX_PARTNER_FEE_NUMERATOR: u64 = 50000; // 50%
}

pub mod activation {
    #[cfg(not(feature = "test-bpf"))]
    pub const SLOT_BUFFER: u64 = 9000;
    #[cfg(feature = "test-bpf")]
    pub const SLOT_BUFFER: u64 = 5;

    #[cfg(not(feature = "test-bpf"))]
    pub const TIME_BUFFER: u64 = 3600; // 1 hour
    #[cfg(feature = "test-bpf")]
    pub const TIME_BUFFER: u64 = 5; // 5 secs

    #[cfg(not(feature = "test-bpf"))]
    pub const MAX_ACTIVATION_SLOT_DURATION: u64 = SLOT_BUFFER * 24 * 31; // 31 days
    #[cfg(feature = "test-bpf")]
    pub const MAX_ACTIVATION_SLOT_DURATION: u64 = 30;

    #[cfg(not(feature = "test-bpf"))]
    pub const MAX_ACTIVATION_TIME_DURATION: u64 = TIME_BUFFER * 24 * 31; // 31 days
    #[cfg(feature = "test-bpf")]
    pub const MAX_ACTIVATION_TIME_DURATION: u64 = 30;

    #[cfg(not(feature = "localnet"))]
    pub const FIVE_MINUTES_SLOT_BUFFER: u64 = SLOT_BUFFER / 12; // 5 minutes

    #[cfg(feature = "localnet")]
    pub const FIVE_MINUTES_SLOT_BUFFER: u64 = 5;

    #[cfg(not(feature = "localnet"))]
    pub const FIVE_MINUTES_TIME_BUFFER: u64 = TIME_BUFFER / 12; // 5 minutes

    #[cfg(feature = "localnet")]
    pub const FIVE_MINUTES_TIME_BUFFER: u64 = 5;
}

/// Store constants related to virtual price
pub mod virtual_price {
    /// Decimal price of virtual price
    pub const DECIMAL: u8 = 8;
    /// Precision for virtual price calculation
    // Up-scaling, safe
    pub const PRECISION: i32 = 10_i32.pow(DECIMAL as u32);
}

/// Store constants related to stable swap curve

pub mod stable_curve {
    /// Maximum supported amplification coefficient
    pub const MAX_AMP: u64 = 10_000;
    /// Maximum ramping of amplification coefficient
    pub const MAX_A_CHANGE: u64 = MAX_AMP;
}

/// Store constants related to depeg pool
pub mod depeg {
    /// Base virtual time caching time, 10 minutes
    pub const BASE_CACHE_EXPIRES: u64 = 60 * 10;
    /// Precision for depeg pool virtual price calculation, 6 has been chosen because most of the token was 6 d.p
    pub const PRECISION: u64 = 10_u64.pow(6_u32);
}

// Supported quote mints
const SOL: Pubkey = pubkey!("So11111111111111111111111111111111111111112");
const USDC: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
pub const QUOTE_MINTS: [Pubkey; 2] = [SOL, USDC];
