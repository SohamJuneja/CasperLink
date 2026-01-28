#![no_std]

use odra::prelude::*;
use odra::casper_types::U512;

#[odra::module]
pub struct CasperLinkOracle {
    prices: Mapping<String, U512>,
    last_update: Var<u64>,
    owner: Var<Address>,
}

#[odra::module]
impl CasperLinkOracle {
    #[odra::init]
    pub fn init(&mut self) {
        let caller = self.env().caller();
        self.owner.set(caller);
        self.last_update.set(0);
    }

    pub fn submit_price(&mut self, price_feed: String, price_value: U512, timestamp: u64) {
        let caller = self.env().caller();
        let owner = self.owner.get_or_revert_with(OracleError::NotInitialized);
        
        if caller != owner {
            self.env().revert(OracleError::Unauthorized);
        }

        if price_feed != "BTC_USD" && price_feed != "ETH_USD" && price_feed != "CSPR_USD" {
            self.env().revert(OracleError::InvalidPriceFeed);
        }

        self.prices.set(&price_feed, price_value);
        self.last_update.set(timestamp);
    }

    pub fn get_price(&self, price_feed: String) -> U512 {
        self.prices.get(&price_feed).unwrap_or_default()
    }

    pub fn get_last_update(&self) -> u64 {
        self.last_update.get_or_default()
    }

    pub fn get_owner(&self) -> Address {
        self.owner.get_or_revert_with(OracleError::NotInitialized)
    }
}

#[odra::odra_error]
pub enum OracleError {
    NotInitialized = 1,
    Unauthorized = 2,
    InvalidPriceFeed = 3,
}

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::{Deployer, NoArgs};

    #[test]
    fn test_oracle_initialization() {
        let env = odra_test::env();
        let mut oracle = CasperLinkOracleHostRef::deploy(&env, NoArgs);
        
        assert_eq!(oracle.get_last_update(), 0);
    }

    #[test]
    fn test_submit_and_get_price() {
        let env = odra_test::env();
        let mut oracle = CasperLinkOracleHostRef::deploy(&env, NoArgs);
        
        oracle.submit_price(
            String::from("BTC_USD"),
            U512::from(5000000000000u64),
            1234567890,
        );
        
        let price = oracle.get_price(String::from("BTC_USD"));
        assert_eq!(price, U512::from(5000000000000u64));
        assert_eq!(oracle.get_last_update(), 1234567890);
    }
}