# CrossBorder

**Global money movement. Stellar speed. Total transparency.**

CrossBorder is an early-stage cross-border payment experience built around the Stellar network. It combines a polished transfer interface, indicative conversion previews, recipient details, and a real Freighter wallet authorization flow.

> **Prototype only:** Do not use for real funds. The exchange rates, fees, balances, and activity shown in the interface are illustrative demo data. The app can request Freighter access, read a public address and Testnet balance, and submit native XLM payments to Stellar Testnet after explicit wallet signing. Transaction confirmation polling, production FX, and fiat payouts are not yet implemented. Fiat payouts and production FX require appropriate providers, compliance controls, and security review.

## Current features

- Responsive dashboard with dark/light themes
- Transfer amount and destination currency controls
- Indicative conversion and fee preview using clearly labelled demo rates
- Real Freighter extension detection and authorization using `@stellar/freighter-api`
- Live Stellar Testnet native XLM balance lookup after wallet connection
- Testnet XLM payment builder with public-address validation and amount validation
- Explicit Freighter transaction-signing approval before submission
- Horizon Testnet submission and transaction explorer link
- Wallet public address shown after connection
- Sample activity feed with sent/received filters
- Stellar Testnet environment labeling and safety messaging

## Roadmap

1. [x] Establish the frontend shell and design system.
2. [x] Build the transfer quote and recipient flow.
3. [x] Connect to Freighter and request access to the user's public address.
4. [ ] Add Stellar Testnet account lookup and balance display.
5. [ ] Build a native Stellar payment transaction, request explicit wallet signing, and submit to Testnet.
6. [ ] Verify transaction status from the network and populate real transaction history.
7. [ ] Evaluate compliant providers for real-world fiat conversion and payouts.

## Local development

Requirements: Node.js 20+ and npm.

```bash
git clone https://github.com/EzikeChikelu/Cross-border-payment.git
cd Cross-border-payment
npm install
npm run dev
```

Open the local URL printed by Vite. To test wallet connection, install the Freighter browser extension and use its Stellar Testnet network. You can still explore the interface without a wallet.

Production build:

```bash
npm run build
npm run preview
```

## Safety and accuracy

- Never store secret keys or seed phrases in the browser, repository, or logs.
- A public wallet address is not a secret, but it is still user data; request it only when needed.
- Require the user to review and sign every transaction in their wallet.
- Never claim a payment is confirmed until the network confirms it.
- Clearly label mocked rates, balances, fees, and demo activity.
- Do not represent testnet assets as real money.
- Production fiat conversion and payouts require a legitimate provider, applicable compliance, and security review.

## Stack

- React + TypeScript
- Vite
- Stellar SDK
- Freighter API
- Lucide icons
