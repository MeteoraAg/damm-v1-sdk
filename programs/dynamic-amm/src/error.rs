//! Error module includes error messages and codes of the program
use anchor_lang::prelude::*;

/// Error messages and codes of the program
#[error_code]
#[derive(PartialEq)]
pub enum PoolError {
    /// Mathematic operation results in overflow.
    #[msg("Math operation overflow")]
    MathOverflow,

    /// Invalid fee configuration
    #[msg("Invalid fee setup")]
    InvalidFee,

    /// Invalid invariant d amount
    #[msg("Invalid invariant d")]
    InvalidInvariant,

    /// Failed to calculate fees.
    #[msg("Fee calculation failure")]
    FeeCalculationFailure,

    /// The operation exceeds slippage defined by the user.
    #[msg("Exceeded slippage tolerance")]
    ExceededSlippage,

    /// Swap curve calculation results in error.
    #[msg("Invalid curve calculation")]
    InvalidCalculation,

    /// Swap curve calculation results in zero token A/B.
    #[msg("Given pool token amount results in zero trading tokens")]
    ZeroTradingTokens,

    /// Type conversion results in error.
    #[msg("Math conversion overflow")]
    ConversionError,

    /// Invalid LP mint account.
    #[msg("LP mint authority must be 'A' vault lp, without freeze authority, and 0 supply")]
    FaultyLpMint,

    /// Invalid token mint account.
    #[msg("Token mint mismatched")]
    MismatchedTokenMint,

    /// Invalid LP mint account.
    #[msg("LP mint mismatched")]
    MismatchedLpMint,

    /// Invalid owner account.
    #[msg("Invalid lp token owner")]
    MismatchedOwner,

    /// Invalid vault account.
    #[msg("Invalid vault account")]
    InvalidVaultAccount,

    /// Invalud vault LP account.
    #[msg("Invalid vault lp account")]
    InvalidVaultLpAccount,

    /// Invalid pool LP mint account.
    #[msg("Invalid pool lp mint account")]
    InvalidPoolLpMintAccount,

    /// The pool was disabled.
    #[msg("Pool disabled")]
    PoolDisabled,

    /// Invalid admin account.
    #[msg("Invalid admin account")]
    InvalidAdminAccount,

    /// Invalid protocol fee token account.
    #[msg("Invalid protocol fee account")]
    InvalidProtocolFeeAccount,

    /// Old and new admin are the same account.
    #[msg("Same admin account")]
    SameAdminAccount,

    /// Source and destination token mint are the same.
    #[msg("Identical user source and destination token account")]
    IdenticalSourceDestination,

    /// APY calculation results in error.
    #[msg("Apy calculation error")]
    ApyCalculationError,

    /// Insufficient virtual price snapshot.
    #[msg("Insufficient virtual price snapshot")]
    InsufficientSnapshot,

    /// Curve is not updatable.
    #[msg("Current curve is non-updatable")]
    NonUpdatableCurve,

    /// The new curve is not the same type as the old curve.
    #[msg("New curve is mismatched with old curve")]
    MisMatchedCurve,

    /// Invalid amplification coefficient value.
    #[msg("Amplification is invalid")]
    InvalidAmplification,

    /// The operation is not supported.
    #[msg("Operation is not supported")]
    UnsupportedOperation,

    /// The ramping of amplification coefficient over the allowed value.
    #[msg("Exceed max amplification changes")]
    ExceedMaxAChanges,

    /// Invalid number of remaining accounts
    #[msg("Invalid remaining accounts length")]
    InvalidRemainingAccountsLen,

    /// Invalid remaining accounts
    #[msg("Invalid remaining account")]
    InvalidRemainingAccounts,

    /// Pool token B mint doesn't match with depeg token mint address
    #[msg("Token mint B doesn't matches depeg type token mint")]
    MismatchedDepegMint,

    /// Invalid APY account
    #[msg("Invalid APY account")]
    InvalidApyAccount,

    /// Invalid token multiplier for stable swap curve
    #[msg("Invalid token multiplier")]
    InvalidTokenMultiplier,

    /// Invalid depeg information
    #[msg("Invalid depeg information")]
    InvalidDepegInformation,

    /// Update time violated the cooldown interval
    #[msg("Update time constraint violated")]
    UpdateTimeConstraint,

    /// Pool fee exceed allowed max fee bps
    #[msg("Exceeded max fee bps")]
    ExceedMaxFeeBps,

    /// Invalid admin
    #[msg("Invalid admin")]
    InvalidAdmin,

    /// Pool is not permissioned
    #[msg("Pool is not permissioned")]
    PoolIsNotPermissioned,

    /// Invalid deposit amount
    #[msg("Invalid deposit amount")]
    InvalidDepositAmount,

    /// Invalid fee owner
    #[msg("Invalid fee owner")]
    InvalidFeeOwner,

    /// Pool is not depleted
    #[msg("Pool is not depleted")]
    NonDepletedPool,

    /// Amount is not peg
    #[msg("Token amount is not 1:1")]
    AmountNotPeg,

    /// Amount is zero
    #[msg("Amount is zero")]
    AmountIsZero,

    /// Type case failed
    #[msg("Type cast error")]
    TypeCastFailed,

    /// AmountIsNotEnough
    #[msg("Amount is not enough")]
    AmountIsNotEnough,

    /// InvalidActivationDuration
    #[msg("Invalid activation duration")]
    InvalidActivationDuration,

    /// Pool is not launch pool
    #[msg("Pool is not launch pool")]
    PoolIsNotLaunchPool,

    /// UnableToModifyActivationPoint
    #[msg("Unable to modify activation point")]
    UnableToModifyActivationPoint,

    /// Invalid authority to create the pool
    #[msg("Invalid authority to create the pool")]
    InvalidAuthorityToCreateThePool,

    #[msg("Invalid activation type")]
    InvalidActivationType,

    #[msg("Invalid activation point")]
    InvalidActivationPoint,

    #[msg("Pre activation swap window started")]
    PreActivationSwapStarted,

    /// Invalid pool type
    #[msg("Invalid pool type")]
    InvalidPoolType,

    #[msg("Quote token must be SOL,USDC")]
    InvalidQuoteMint,

    #[msg("Invalid token metadata program")]
    InvalidTokenMetadataProgram,

    #[msg("Invalid permission")]
    InvalidPermission,

    #[msg("Invalid zap out parameters")]
    InvalidZapOutParameters,

    #[msg("Incorrect ATA")]
    IncorrectATA,

    #[msg("Invalid withdraw protocol fee zap accounts")]
    InvalidWithdrawProtocolFeeZapAccounts,

    #[msg("SOL,USDC protocol fee cannot be withdrawn via zap")]
    MintRestrictedFromZap,

    #[msg("CPI disabled")]
    CpiDisabled,

    #[msg("Missing zap out instruction")]
    MissingZapOutInstruction,

    #[msg("Invalid zap accounts")]
    InvalidZapAccounts,

    #[msg("Invalid claim protocol fee accounts")]
    InvalidClaimProtocolFeeAccounts,

    #[msg("Pool LP mint supply accounting is not patched")]
    LpMintSupplyAccountingNotPatched,

    #[msg("User is not the owner of the pool LP token account")]
    InvalidLpOwner,

    #[msg("Invalid vault LP supply accounting")]
    InvalidVaultLpSupplyAccounting,
}
