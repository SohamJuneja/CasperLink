import {
    Args,
    HttpHandler,
    KeyAlgorithm,
    PrivateKey,
    Key,
    RpcClient,
    SessionBuilder,
    Hash,
    CLTypeUInt8,
    CLValue,
    CLTypeKey
} from "casper-js-sdk";
import * as fs from 'fs/promises';
import {getSenderKey} from "./utils";
const {program} = require('commander');

program
    .option('--node_url [value]', 'node URL in format {http://localhost:11101/rpc}', 'http://localhost:11101/rpc')
    .option('--network_name [value]', 'network_name', 'casper-net-1')
    .requiredOption('--owner_keys_path [value]', 'path to contract owners keys')
    .option('--keys_algo [value]', 'Crypto algo ed25519 | secp256k1', 'ed25519')
    .option('--proxy_caller [value]', 'proxy caller wasm file', './proxy_caller.wasm')
    .requiredOption('--contract_package_hash [value]', 'staking contract address')
    .requiredOption('--amount [value]', 'CSPR amount to swap (in motes)')
    .requiredOption('--amount_out_min [value]', 'minimum tokena mount to receive (in motes)')
    .requiredOption('--path [value]', 'swap path')
    .requiredOption('--to [value]', 'recipient address')
    .option('--payment_amount [value]', 'motes to cover gas costs', '12000000000');
    
program.parse();

const options = program.opts();

const swap_exact_cspr_for_tokens = async () => {
    const owner = await getSenderKey(options.owner_keys_path, options.keys_algo);
    const contractWasm = await fs.readFile(options.proxy_caller);

    const wcspr = Key.newKey("hash-3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e");
    const wcspClKey = CLValue.newCLKey(wcspr);
    const scspr = Key.newKey("hash-baa50d1500aa5361c497c06b40f2822ebb0b5fce5b1c3a037ea628cb68d920f3");
    const scsprClKey = CLValue.newCLKey(scspr);
    const epochPlus10Min = Date.now() + 10 * 60 * 1000;
    const odraArgs = Args.fromMap({
        path: CLValue.newCLList(CLTypeKey, [wcspClKey, scsprClKey]),
        to: CLValue.newCLKey(Key.newKey(options.to)),
        deadline: CLValue.newCLUint64(epochPlus10Min),
        amount_out_min: CLValue.newCLUInt256(options.amount),
    })
    const serialized_args = CLValue.newCLList(CLTypeUInt8,
        Array.from(odraArgs.toBytes())
            .map(value => CLValue.newCLUint8(value))
    );
    const args = Args.fromMap({
        amount: CLValue.newCLUInt512(options.amount),
        attached_value: CLValue.newCLUInt512(options.amount),
        entry_point: CLValue.newCLString("swap_exact_cspr_for_tokens"),
        package_hash: CLValue.newCLByteArray(Hash.fromHex(options.contract_package_hash).toBytes()),
        args: serialized_args,
    });

    const sessionTransaction = new SessionBuilder()
        .from(owner.publicKey)
        .runtimeArgs(args)
        .wasm(new Uint8Array(contractWasm))
        .payment(Number.parseInt(options.payment_amount, 10)) // Amount in motes
        .chainName(options.network_name)
        .build();

    sessionTransaction.sign(owner);

    // //  console.log(JSON.stringify(sessionTransaction.toJSON()));
    //  return;
    const rpcHandler = new HttpHandler(options.node_url);
    const rpcClient = new RpcClient(rpcHandler);
    const result = await rpcClient.putTransaction(sessionTransaction);
    console.log("Transaction hash: ", result.transactionHash.toHex());
};

// eslint-disable-next-line @typescript-eslint/no-floating-promises
swap_exact_cspr_for_tokens();
