use intent_parser::IntentParserInitArgs;
use odra::host::{Deployer, HostRef};

fn main() {
    let env = odra_casper_livenet_env::env();
    
    // Your Oracle hash
    let oracle_hash = "hash-c558b459ba4e9d8a379bcef9629660d8cf9c34fa6e9c1165324959e433bc22ac";
    
    // TokenFactory from organizers
    let token_factory_hash = "hash-03d00e4f26b4717f35b13f154c2da117c4d146607ad85a93104c7441392ccf4b";
    
    println!("🚀 Deploying IntentParser with TokenFactory integration...");
    
    let init_args = IntentParserInitArgs {
        oracle_contract: env.get_account(oracle_hash),
        token_factory: env.get_account(token_factory_hash),
    };
    
    let mut contract = IntentParserHostRef::deploy(&env, init_args);
    
    println!("\n✅ IntentParser deployed!");
    println!("Contract: {:?}", contract.address());
}