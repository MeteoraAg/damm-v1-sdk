use lazy_static::lazy_static;
use solana_sdk::pubkey;
use solana_sdk::pubkey::Pubkey;
use std::collections::HashMap;

lazy_static! {
    pub static ref VAULT_WITH_NON_PDA_BASED_LP_MINT: HashMap<Pubkey, Pubkey> = HashMap::from_iter([
        (
            // ACUSD
            pubkey!("BFJP6RYDxJa4FmFtBpPDYcrPozjC98CELrXqVL7rGMVW"),
            pubkey!("5CuhvouXVx6t5XPiyhRkrfgK5omAf8XnqY1ef6CLjw7o"),
        ),
        (
            // USH
            pubkey!("AzrUPWWyT9ZoAuMTgGHxYCnnWD2veh98FsCcMknVjg3Q"),
            pubkey!("9MSsSzDKq8VzokicRom6ciYPLhhZf65bCCBQLjnC7jUH")
        ),
        (
            // afUSDC
            pubkey!("GGQfASSnFaqPu83jWrL1DMJBJEzG3rdwsDARDGt6Gxmj"),
            pubkey!("4da9saTYgDs37wRSuS8mnFoiWzSYeRtvSWaFRe8rtkFc"),
        ),
        (
            // Bridged USD Coin (Wormhole Ethereum)
            pubkey!("GofttAxULhp5NE9faWNngsnDM1iJiL75AJ2AkSaaC2CC"),
            pubkey!("Bma9RZx1AjNGcojNJpstGe9Wcytxz17YA6rd2Lq1UirT"),
        ),
        (
            // PAI
            pubkey!("671JaLe2zDgBeXK3UtFHBiid7WFCHAKZTmLqAaQxx7cL"),
            pubkey!("9NywobBSCyntrPSZxEZpUbJXLfgUzKbUF2ZqBBkJLEgB"),
        ),
        (
            // UXD
            pubkey!("2dH3aSpt5aEwhoeSaThKRNtNppEpg2DhGKGa1C5Wecc1"),
            pubkey!("Afe5fiLmbKw7aBi1VgWZb9hEY8nRYtib6LNr5RGUJibP"),
        ),
        (
            // WAVAX
            pubkey!("BVJACEffKRHvKbQT9VfEqoxrUWJN2UVdonTKYB2c4MgK"),
            pubkey!("FFmYsMk5xQq3zQf1r4A6Yyf3kaKd3LUQokeVa776rKWH"),
        ),
        (
            // USDT
            pubkey!("5XCP3oD3JAuQyDpfBFFVUxsBxNjPQojpKuL4aVhHsDok"),
            pubkey!("EZun6G5514FeqYtUv26cBHWLqXjAEdjGuoX6ThBpBtKj"),
        ),
        (
            // WBTC
            pubkey!("mPWBpKzzchEjitz7x4Q2d7cbQ3fHibF2BHWbWk8YGnH"),
            pubkey!("4nCGSVN8ZGuewX36TznzisceaNYzURWPesxyGtDvA2iP"),
        ),
        (
            // mSOL
            pubkey!("8p1VKP45hhqq5iZG5fNGoi7ucme8nFLeChoDWNy7rWFm"),
            pubkey!("21bR3D4QR4GzopVco44PVMBXwHFpSYrbrdeNwdKk7umb"),
        ),
        (
            // stSOL
            pubkey!("CGY4XQq8U4VAJpbkaFPHZeXpW3o4KQ5LowVsn6hnMwKe"),
            pubkey!("28KR3goEditLnzBZShRk2H7xvgzc176EoFwMogjdfSkn"),
        ),
        (
            // wSOL
            pubkey!("FERjPVNEa7Udq8CEv68h6tPL46Tq7ieE49HrE2wea3XT"),
            pubkey!("FZN7QZ8ZUUAxMPfxYEYkH3cXUASzH8EqA6B4tyCL8f1j"),
        ),
        (
            // USDC
            pubkey!("3ESUFCnRNgZ7Mn2mPPUMmXYaKU8jpnV9VtA17M7t2mHQ"),
            pubkey!("3RpEekjLE5cdcG15YcXJUpxSepemvq2FpmMcgo342BwC"),
        ),
    ]);
}

#[cfg(feature = "devnet")]
lazy_static! {
    static ref VAULT_WITH_NON_PDA_BASED_LP_MINT: HashMap<Pubkey, Pubkey> = HashMap::from_iter([
        (
            pubkey!("2u9ycJ7KEiWeR9vUhaHnohi5RdP2uLwuS1o8LynxhNBa"),
            pubkey!("DDrvEcscZagpLE361HqpaiTiwyTtyNnWPhE8xKuqgXKY")
        ),
        (
            pubkey!("sr5nfQgnAmn2bTkxmpPSQS1iEDGN4Bnk48xxcEAqUsi"),
            pubkey!("3UhvDzg4dYtgE69QzjPaH94CoTJbLkczmYJWhq1P3MqC")
        ),
        (
            pubkey!("G5qooe1TGxzsNCefw1xycto4SNy7H4Ad2AiPTCUJnM8W"),
            pubkey!("C1XV8Wd4zdDAy3VTGd6GBJn3KYkSE8MwNyFrPQUEW9py")
        ),
        (
            pubkey!("2FiYEM3EVtUNj6soptXZJdxjBjNWHtUUUKh79QaywYRg"),
            pubkey!("Dq6j7SuMPhHh4eajA8WS1Nby9sbNynJfxyM3p7vxes9f")
        ),
        (
            pubkey!("ATeQUJkKFRiWUfV76k5P5TfAyXwjWgBdck54z2sGvuNK"),
            pubkey!("BgPb3pzLMmSwECCPjTHoKLYQR3iirXBw3bVgF8ZaR7sc")
        ),
        (
            pubkey!("FERjPVNEa7Udq8CEv68h6tPL46Tq7ieE49HrE2wea3XT"),
            pubkey!("BvoAjwEDhpLzs3jtu4H72j96ShKT5rvZE9RP1vgpfSM")
        ),
        (
            pubkey!("8p1VKP45hhqq5iZG5fNGoi7ucme8nFLeChoDWNy7rWFm"),
            pubkey!("8YE7s4oCbsEUzH71hVwe9DBCyemprwAjyDzksZ8d9bPz")
        ),
        (
            pubkey!("4cX1amsBFy9by77uPuTbhN9Qw3oEaMu4J3pAyPa2gmku"),
            pubkey!("2iGUnZPUPgjpjG6rT5Fi4VEeMoFw9DAwMJ8UFjXDpVs1")
        ),
        (
            pubkey!("9Fze2yguDHYvX1KVfj1rgA9Q5moboWQFkw67wLGc61Z8"),
            pubkey!("CNJoMWip1hX5mq2zHQ88LeC5gGMrVbGdQ9ZP6jB3qvkn")
        ),
        (
            pubkey!("BPNKnFRAi9jfbD4xNAUavZmCbkn9DxGc1FCy4cYWHTXf"),
            pubkey!("tewho86AFqTGmMvtKEvnNegHZfce4tTzDYENa58TLCq")
        ),
        (
            pubkey!("DZwqzesnbNhoP5iPaxQkPG37JfDuqpZBfmsBw2wCpwQ1"),
            pubkey!("GDK7uxgtQYYnwHwSXE83T6pxiJbKAV2jDMAa3bmc3Qzm")
        ),
        (
            pubkey!("CyAd2PPVUCytnCiMztYFqu7v56Df3KiXdrx94rCyWeJz"),
            pubkey!("HQU6SZNTTReKLXGyyPp9tt9tcBRo75yV9PgPMZavzXRG")
        ),
    ]);
}
