#![no_std]

use odra::prelude::*;
use odra::casper_types::{U512, U256};
use odra::ContractRef;

/// External contract interface for TokenFactory
/// Updated to match the actual TokenFactory signature from David
/// burn(cep18_address: Key, amount: U256, eth_recipient: ByteArray[20], target_chain_id: U64)
#[odra::external_contract]
trait TokenFactoryInterface {
    #[odra(payable)]
    fn burn(
        &mut self,
        cep18_address: Address,       // CEP-18 token contract hash (Key type in Odra)
        amount: U256,                  // Amount to burn
        eth_recipient: [u8; 20],       // Ethereum recipient address (20 bytes)
        target_chain_id: u64,          // Target EVM chain ID (1 = Ethereum, 11155111 = Sepolia)
    );
}

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
    token_factory: Var<Address>,
    bridge_fee: Var<U512>,  // CSPR fee to attach for bridge transactions
    target_chain_id: Var<u64>,  // Default target chain ID (1 for Ethereum mainnet)
}

#[odra::module]
impl IntentParser {
    pub fn init(&mut self) {
        let caller = self.env().caller();
        self.owner.set(caller);
        self.next_intent_id.set(1);
        self.slippage_bps.set(100);
        // Default bridge fee: 2 CSPR (2,000,000,000 motes)
        self.bridge_fee.set(U512::from(2_000_000_000u64));
        // Default target chain: 1 = Ethereum mainnet (use 11155111 for Sepolia testnet)
        self.target_chain_id.set(1);
    }
    
    pub fn set_oracle(&mut self, oracle_contract: Address) {
        let caller = self.env().caller();
        let owner = match self.owner.get() {
            Some(o) => o,
            None => self.env().revert(IntentError::Unauthorized),
        };

        if caller != owner {
            self.env().revert(IntentError::Unauthorized);
        }

        self.oracle_address.set(oracle_contract);
    }

    pub fn set_token_factory(&mut self, token_factory: Address) {
        let caller = self.env().caller();
        let owner = match self.owner.get() {
            Some(o) => o,
            None => self.env().revert(IntentError::Unauthorized),
        };

        if caller != owner {
            self.env().revert(IntentError::Unauthorized);
        }

        self.token_factory.set(token_factory);
    }

    pub fn get_token_factory(&self) -> Option<Address> {
        self.token_factory.get()
    }

    /// Set bridge fee (only owner)
    pub fn set_bridge_fee(&mut self, fee: U512) {
        let caller = self.env().caller();
        let owner = match self.owner.get() {
            Some(o) => o,
            None => self.env().revert(IntentError::Unauthorized),
        };

        if caller != owner {
            self.env().revert(IntentError::Unauthorized);
        }

        self.bridge_fee.set(fee);
    }

    /// Get current bridge fee
    pub fn get_bridge_fee(&self) -> U512 {
        self.bridge_fee.get_or_default()
    }

    /// Set target chain ID (only owner)
    pub fn set_target_chain_id(&mut self, chain_id: u64) {
        let caller = self.env().caller();
        let owner = match self.owner.get() {
            Some(o) => o,
            None => self.env().revert(IntentError::Unauthorized),
        };

        if caller != owner {
            self.env().revert(IntentError::Unauthorized);
        }

        self.target_chain_id.set(chain_id);
    }

    /// Get current target chain ID
    pub fn get_target_chain_id(&self) -> u64 {
        self.target_chain_id.get_or_default()
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

    /// Execute an intent - marks it as executing (status = 2)
    /// This is called when the user wants to execute the bridge
    /// Emits an event that can be picked up by relayers
    pub fn execute_intent(&mut self, intent_id: String, eth_recipient: String) {
        // Parse intent_id from string to u64
        let id: u64 = match intent_id.parse() {
            Ok(n) => n,
            Err(_) => self.env().revert(IntentError::InvalidIntentId),
        };

        let mut intent = match self.intents.get(&id) {
            Some(i) => i,
            None => self.env().revert(IntentError::NotFound),
        };

        // Only the intent creator can execute it
        let caller = self.env().caller();
        if caller != intent.user {
            self.env().revert(IntentError::Unauthorized);
        }

        // Update status to Executing (2)
        intent.status = 2;

        self.intents.set(&id, intent);

        // Emit event with eth_recipient for bridge relayers
        self.env().emit_event(IntentExecuted {
            intent_id: id,
            user: caller,
            eth_recipient,
            timestamp: self.env().get_block_time(),
        });
    }

    /// Execute intent with direct TokenFactory.burn() call
    /// This performs REAL bridge execution by calling TokenFactory
    /// 
    /// Parameters:
    /// - intent_id: The intent ID to execute (as string)
    /// - cep18_token: The CEP-18 token address (hash format like "hash-62d62d5c...")
    /// - eth_recipient: Ethereum address to receive tokens (must start with 0x)
    pub fn execute_intent_with_burn(
        &mut self,
        intent_id: String,
        cep18_token: Address,
        eth_recipient: String,
    ) {
        // Parse intent_id from string to u64
        let id: u64 = match intent_id.parse() {
            Ok(n) => n,
            Err(_) => self.env().revert(IntentError::InvalidIntentId),
        };

        let mut intent = match self.intents.get(&id) {
            Some(i) => i,
            None => self.env().revert(IntentError::NotFound),
        };

        // Only the intent creator can execute it
        let caller = self.env().caller();
        if caller != intent.user {
            self.env().revert(IntentError::Unauthorized);
        }

        // Validate eth_recipient format (should start with 0x and be 42 chars)
        if !eth_recipient.starts_with("0x") || eth_recipient.len() != 42 {
            self.env().revert(IntentError::InvalidEthAddress);
        }

        // Parse eth_recipient hex string to 20 bytes for EVM address
        let eth_hex = &eth_recipient[2..]; // Remove "0x" prefix
        if eth_hex.len() != 40 {
            self.env().revert(IntentError::InvalidEthAddress);
        }

        // Convert hex string to 20 bytes (EVM address format)
        let mut eth_bytes = [0u8; 20];
        for i in 0..20 {
            let byte_str = &eth_hex[i*2..i*2+2];
            eth_bytes[i] = match u8::from_str_radix(byte_str, 16) {
                Ok(b) => b,
                Err(_) => self.env().revert(IntentError::InvalidEthAddress),
            };
        }

        // Get TokenFactory address
        let token_factory = match self.token_factory.get() {
            Some(addr) => addr,
            None => self.env().revert(IntentError::TokenFactoryNotSet),
        };

        // Get bridge fee and target chain ID
        let bridge_fee = self.bridge_fee.get_or_default();
        let target_chain_id = self.target_chain_id.get_or_default();

        // Store amount before moving intent
        let amount = intent.amount_in;

        // Convert U512 to U256 (TokenFactory expects U256)
        // For amounts larger than U256::MAX, this will truncate
        let amount_u256 = U256::from(amount.as_u128());

        // Update status to Executing (2)
        intent.status = 2;
        self.intents.set(&id, intent);

        // Call TokenFactory.burn() to execute the actual bridge
        // The TokenFactory will:
        // 1. Burn the CEP-18 tokens on Casper
        // 2. Emit a TokensBurned event
        // 3. Relayers will watch for this event and unlock tokens on target chain
        let token_factory_ref = TokenFactoryInterfaceContractRef::new(self.env(), token_factory);
        token_factory_ref
            .with_tokens(bridge_fee)  // Attach CSPR for bridge fee
            .burn(cep18_token, amount_u256, eth_bytes, target_chain_id);

        // Emit event for tracking
        self.env().emit_event(IntentExecuted {
            intent_id: id,
            user: caller,
            eth_recipient,
            timestamp: self.env().get_block_time(),
        });
    }

    /// Complete an intent - marks it as completed (status = 3)
    pub fn complete_intent(&mut self, intent_id: u64) {
        let mut intent = match self.intents.get(&intent_id) {
            Some(i) => i,
            None => self.env().revert(IntentError::NotFound),
        };

        // Only the intent creator can complete it
        let caller = self.env().caller();
        if caller != intent.user {
            self.env().revert(IntentError::Unauthorized);
        }

        // Update status to Completed (3)
        intent.status = 3;

        self.intents.set(&intent_id, intent);
    }
}

/// Event emitted when an intent is executed
#[odra::event]
pub struct IntentExecuted {
    pub intent_id: u64,
    pub user: Address,
    pub eth_recipient: String,
    pub timestamp: u64,
}

#[odra::odra_error]
pub enum IntentError {
    NotFound = 1,
    Unauthorized = 2,
    InvalidIntentId = 3,
    TokenFactoryNotSet = 4,
    InvalidEthAddress = 5,
}