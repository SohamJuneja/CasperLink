# Git Commit Commands for CasperLink

## Corrected Git Setup Commands

```bash
# Navigate to project root
cd /mnt/e/blockchain/CasperLink/casperlink

# Initialize git repository
git init
git branch -M main

# Commit 1: Smart Contracts
git add casper-oracle/src/ casper-oracle/Cargo.toml casper-oracle/Odra.toml casper-oracle/build.rs casper-oracle/bin/ casper-oracle/rust-toolchain casper-oracle/README.md casper-oracle/CHANGELOG.md casper-oracle/set_prices.js
git add intent-parser/src/lib.rs intent-parser/Cargo.toml intent-parser/Odra.toml intent-parser/build.rs intent-parser/bin/ intent-parser/rust-toolchain intent-parser/test_create_intent.sh intent-parser/test_oracle_integration.sh
git commit -m "feat: implement Oracle and Intent Parser V2 contracts

- Add Oracle contract for price feed management
- Add Intent Parser V2 with Oracle integration  
- Implement slippage protection (1-10%)
- Deploy to Casper testnet
- Oracle: hash-c558b459ba4e9d8a379bcef9629660d8cf9c34fa6e9c1165324959e433bc22ac
- Intent Parser: hash-632a3eb1eef79a708c54d6e1bb84352e1445760ade1a6edbd20d7d375dfe20bb"

# Commit 2: Frontend Configuration
git add frontend/package.json frontend/package-lock.json frontend/tsconfig.json frontend/next.config.mjs frontend/tailwind.config.ts frontend/postcss.config.mjs
git commit -m "feat: initialize Next.js 14 frontend with TypeScript

- Setup Next.js 14 with App Router
- Configure TypeScript and Tailwind CSS  
- Add CSPR.click SDK v1.12
- Configure Casper network integration"

# Commit 3: Frontend Application Code
git add frontend/app/ frontend/lib/ frontend/types/
git commit -m "feat: implement core UI and contract integration

- Add glassmorphism UI with Casper branding
- Create Intent creation interface
- Build Oracle price feeds page  
- Add Admin dashboard for price management
- Implement ContractService for blockchain interaction
- Add wallet connection with CSPR.click
- Add My Intents page
- Add Oracle Prices page"

# Commit 4: Documentation
git add README.md phase1.md
git commit -m "docs: add comprehensive documentation

- Create detailed README with architecture
- Add verified transaction links  
- Include deployment guide
- Add contribution guidelines
- Document technology stack
- Add Phase 1 completion documentation"

# Commit 5: Git Configuration
git add .gitignore frontend/.gitignore casper-oracle/.gitignore
git commit -m "chore: add gitignore files

- Add comprehensive root .gitignore
- Add frontend-specific ignores
- Add Rust contract ignores
- Exclude build artifacts, node_modules, and secrets"

# Add remote and push
git remote add origin https://github.com/SohamJuneja/CasperLink.git
git push -u origin main
```

## Files Coverage Check

### ✅ Included in Commits:
- ✅ All contract source files (casper-oracle/, intent-parser/)
- ✅ All frontend source code (app/, lib/, types/)
- ✅ Configuration files (package.json, tsconfig.json, etc.)
- ✅ Documentation (README.md, phase1.md)
- ✅ Git ignore files
- ✅ Test scripts

### ❌ Excluded (by .gitignore):
- ❌ node_modules/
- ❌ .next/
- ❌ target/ (Rust build artifacts)
- ❌ wasm/ (compiled contracts)
- ❌ .vercel/
- ❌ *.pem (secret keys)
- ❌ *.backup files
- ❌ Cargo.lock (in contracts)

## Notes:
- The contracts are in `casper-oracle/` and `intent-parser/` directories, not a `contracts/` folder
- No LICENSE file exists - removed from commit
- phase1.md is included as it contains important project documentation
- All .gitignore files are included to ensure proper exclusions

