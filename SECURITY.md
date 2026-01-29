# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in CasperLink, please report it responsibly:

1. **Do NOT** open a public issue
2. Email the maintainers directly or use GitHub's private vulnerability reporting
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 1 week
- **Fix/Patch**: Depends on severity

## Security Best Practices for Users

- Never share your private keys
- Always verify transaction details before signing
- Use the official Casper Wallet extension
- Check you're on the correct URL (casper-link.vercel.app)

## Smart Contract Security

Our smart contracts have been developed following best practices:
- IntentParser Contract: Handles intent creation and execution
- Oracle Contract: Provides price feeds from verified sources

All contracts are deployed on Casper Testnet and will undergo additional audits before mainnet deployment.
