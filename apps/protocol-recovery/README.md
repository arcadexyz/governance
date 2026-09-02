# Arcade Protocol Recovery UI

A minimal, standalone web app for interacting with Arcade Protocol smart contracts for asset recovery after the main UI is sunset.

## Features

- Connect wallet (MetaMask, WalletConnect, etc.)
- Find and display user's loans (as borrower or lender)
- Repay active loans
- Claim collateral from defaulted loans
- Find and manage asset vaults
- Enable vault withdrawals
- Withdraw NFTs, ERC20 tokens, and ETH from vaults
- Manual contract interaction for advanced users

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment file and add your WalletConnect project ID:
   ```bash
   cp .env.example .env.local
   ```
   Get a project ID at https://cloud.walletconnect.com/

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3001](http://localhost:3001) in your browser.

## Deployment

This app is configured for easy deployment to Vercel:

```bash
npm run build
```

Or deploy directly via Vercel CLI or GitHub integration.

## Contract Addresses (Mainnet)

### V3 Contracts
- LoanCore: `0x89bc08BA00f135d608bc335f6B33D7a9ABCC98aF`
- RepaymentController: `0x74241e1A9c021643289476426B9B70229Ab40D53`
- VaultFactory: `0x269363665Dbb1582b143099a3cb467E98a476D55`
- LenderNote: `0x0bf1bF15C8C09e8BdED44b5b15DBbbb6a16eB8bb`
- BorrowerNote: `0xF9b5C7ce978e0aD6e33da2a94f51Df82FfDd5fE1`

### V2 Contracts
- LoanCore: `0x81b2F8Fc75Bab64A6b144aa6d2fAa127B4Fa7fD9`
- RepaymentController: `0xb39dAB85FA05C381767FF992cCDE4c94619993d4`
- VaultFactory: `0x6e9B4c2f6Bd57b7b924d29b5dcfCa1273Ecc94A2`
- LenderNote: `0x349A026A43FFA8e2Ab4c4e59FCAa93F87Bd8DdeE`
- BorrowerNote: `0x337104A4f06260Ff327d6734C555A0f5d8F863aa`

## Tech Stack

- Next.js 14 (App Router)
- wagmi v2 + viem
- RainbowKit
- Tailwind CSS
- TypeScript
