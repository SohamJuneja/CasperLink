@echo off
REM Deploy Updated IntentParser Contract to Casper Testnet

echo ========================================
echo Deploying IntentParser Contract
echo ========================================
echo.

REM Set your secret key path here
set SECRET_KEY=E:\blockchain\CasperLink\secret_key.pem

REM Oracle contract address (already deployed)
set ORACLE_HASH=hash-c558b459ba4e9d8a379bcef9629660d8cf9c34fa6e9c1165324959e433bc22ac

REM TokenFactory contract address from CSPRBridge (Multi-chain version from David)
set TOKEN_FACTORY_HASH=hash-bf16ba78a7ecfb0e64756aa8468251110f29639f38ccaf9bdb01b6f38a15c2f2

REM Check if secret key is set
if "%SECRET_KEY%"=="path\to\your\secret_key.pem" (
    echo ERROR: Please update SECRET_KEY in deploy.bat with your actual secret key path
    echo.
    echo Edit deploy.bat and set:
    echo set SECRET_KEY=C:\path\to\your\secret_key.pem
    echo.
    pause
    exit /b 1
)

echo Secret Key: %SECRET_KEY%
echo Oracle: %ORACLE_HASH%
echo TokenFactory: %TOKEN_FACTORY_HASH%
echo WASM File: wasm\IntentParser.wasm
echo.
echo Deploying to Casper Testnet...
echo.

casper-client put-deploy ^
  --node-address https://rpc.testnet.casperlabs.io ^
  --chain-name casper-test ^
  --secret-key %SECRET_KEY% ^
  --payment-amount 200000000000 ^
  --session-path wasm\IntentParser.wasm ^
  --session-arg "odra_cfg_package_hash_key_name:string='intent_parser_package_hash'" ^
  --session-arg "odra_cfg_allow_key_override:bool='true'" ^
  --session-arg "odra_cfg_is_upgradable:bool='true'" ^
  --session-arg "oracle_contract:key='%ORACLE_HASH%'" ^
  --session-arg "token_factory:key='%TOKEN_FACTORY_HASH%'"

echo.
echo ========================================
echo Deployment command sent!
echo ========================================
echo.
echo Copy the deploy hash from above and check status with:
echo casper-client get-deploy --node-address https://rpc.testnet.casperlabs.io DEPLOY_HASH
echo.
echo Or view on explorer:
echo https://testnet.cspr.live/deploy/DEPLOY_HASH
echo.
pause