# CrossBorder

**Global money movement. Stellar speed. Total transparency.**

CrossBorder is a modern cross-border payment experience built around the Stellar network. The goal is to make international transfers understandable and approachable through transparent quotes, recipient details, wallet connectivity, and clear transaction status.

> **Development status:** Early-stage project. Do not use for real funds. Fiat payouts, regulated money movement, and production exchange rates require appropriate providers, compliance controls, and testing.

## Planned features

- International transfer quote and amount breakdown
- Stellar wallet connection and explicit transaction signing
- Stellar testnet transaction flow
- Recipient and transfer details
- Transaction history and status views
- Responsive dashboard with dark/light themes
- Clear distinction between estimated quotes, submitted transactions, and confirmed on-chain transactions

## Suggested implementation

- TypeScript and React
- Vite for a lightweight frontend
- Stellar SDK / Stellar Wallets Kit, using current compatible versions
- Stellar Testnet for development and demonstrations
- A backend for secure configuration, quote-provider integration, audit events, and future payment-provider integration

## Safety and accuracy

- Never store secret keys or seed phrases in the browser, repository, or logs.
- Require the user to review and sign each transaction in their wallet.
- Never claim a payment is confirmed until the network confirms it.
- Clearly label mocked data and demo-only flows.
- Do not represent testnet assets as real money.
- Production fiat conversion and payouts require a legitimate provider, applicable compliance, and security review.

## Roadmap

1. Establish the frontend shell and design system.
2. Build the transfer quote and recipient flow.
3. Integrate a Stellar-compatible wallet.
4. Implement and test a Stellar Testnet payment.
5. Add transaction history and status verification.
6. Evaluate compliant providers for real-world fiat on/off ramps.

## Local development

Setup instructions will be added with the initial application scaffold.
