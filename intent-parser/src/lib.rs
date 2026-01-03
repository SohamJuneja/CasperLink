#![no_std]

use odra::prelude::*;
use odra::casper_types::U512;

/// Represents a cross-chain intent with pricing info
#[odra::odra_type]
pub struct Intent {
    pub intent_id: u64,
    pub user: Address,
    pub source_chain: String,
    pub dest_chain: String,
    pub token_in: String,
    pub token_out: String,
    pub amount_in: U512,
    pub min_amount_out: U512,
    pub price_in: U512,
    pub price_out: U512,
    pub timestamp: u64,
    pub status: u8,
}

#[odra::module]
pub struct IntentParser {
    next_intent_id: Var<u64>,
    intents: Mapping<u64, Intent>,
    owner: Var<Address>,
    oracle_address: Var<Address>,
    slippage_bps: Var<u64>,
}

#[odra::module]
impl IntentParser {
    pub fn init(&mut self, oracle_contract: Address) {
        let caller = self.env().caller();
        self.owner.set(caller);
        self.oracle_address.set(oracle_contract);
        self.next_intent_id.set(1);
        self.slippage_bps.set(100);
    }
    
    pub fn create_intent(
        &mut self,
        source_chain: String,
        dest_chain: String,
        token_in: String,
        token_out: String,
        amount_in: U512,
    ) -> u64 {
        let intent_id = self.next_intent_id.get_or_default();
        self.next_intent_id.set(intent_id + 1);
        
        let intent = Intent {
            intent_id,
            user: self.env().caller(),
            source_chain,
            dest_chain,
            token_in,
            token_out,
            amount_in,
            min_amount_out: U512::zero(),
            price_in: U512::zero(),
            price_out: U512::zero(),
            timestamp: self.env().get_block_time(),
            status: 0,
        };
        
        self.intents.set(&intent_id, intent);
        intent_id
    }
    
    pub fn set_intent_prices(
        &mut self,
        intent_id: u64,
        price_in: U512,
        price_out: U512,
    ) {
        let mut intent = match self.intents.get(&intent_id) {
            Some(i) => i,
            None => self.env().revert(IntentError::NotFound),
        };
        
        // Calculate expected output
        let value_usd = intent.amount_in * price_in / U512::from(100_000_000u64);
        let expected_out = value_usd * U512::from(100_000_000u64) / price_out;
        
        // Apply slippage
        let slippage = self.slippage_bps.get_or_default();
        let min_out = expected_out * U512::from(10000 - slippage) / U512::from(10000);
        
        // Update intent
        intent.price_in = price_in;
        intent.price_out = price_out;
        intent.min_amount_out = min_out;
        intent.status = 1;
        
        self.intents.set(&intent_id, intent);
    }
    
    pub fn get_intent(&self, intent_id: u64) -> Option<Intent> {
        self.intents.get(&intent_id)
    }
    
    pub fn get_total_intents(&self) -> u64 {
        self.next_intent_id.get_or_default() - 1
    }
    
    pub fn get_owner(&self) -> Option<Address> {
        self.owner.get()
    }
    
    pub fn get_oracle_address(&self) -> Option<Address> {
        self.oracle_address.get()
    }
    
    pub fn set_slippage(&mut self, slippage_bps: u64) {
        let caller = self.env().caller();
        let owner = match self.owner.get() {
            Some(o) => o,
            None => self.env().revert(IntentError::Unauthorized),
        };
        
        if caller != owner {
            self.env().revert(IntentError::Unauthorized);
        }
        
        self.slippage_bps.set(slippage_bps);
    }
}

#[odra::odra_error]
pub enum IntentError {
    NotFound = 1,
    Unauthorized = 2,
}
