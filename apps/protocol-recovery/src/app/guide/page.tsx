'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';

const sections = [
  { id: '1-introduction--prerequisites', title: '1. Introduction & Prerequisites' },
  { id: '2-contract-reference', title: '2. Contract Reference' },
  { id: '3-finding-your-assets-on-chain', title: '3. Finding Your Assets' },
  { id: '4-loan-operations-borrowers', title: '4. Loan Ops (Borrowers)' },
  { id: '5-loan-operations-lenders', title: '5. Loan Ops (Lenders)' },
  { id: '6-vault-withdrawals', title: '6. Vault Withdrawals' },
  { id: '7-ape-staking-operations', title: '7. APE Staking' },
  { id: '8-canceling-offers', title: '8. Canceling Offers' },
  { id: '9-troubleshooting', title: '9. Troubleshooting' },
];

const guideContent = `
# Arcade Protocol Migration Guide

This guide helps users interact directly with Arcade protocol smart contracts on Ethereum mainnet after the UI is sunset. It covers all critical operations for reclaiming assets, repaying loans, claiming collateral, and withdrawing NFTs from vaults.

---

## 1. Introduction & Prerequisites

### What You'll Need

- **A Web3 Wallet**: MetaMask, Rabby, or similar browser wallet
- **ETH for Gas**: Ensure you have ETH in your wallet to pay transaction fees
- **Etherscan Access**: All interactions will be done via [Etherscan](https://etherscan.io)

### How to Use Etherscan's Write Contract Feature

1. Navigate to the contract address on Etherscan
2. Click the **"Contract"** tab
3. Click **"Write Contract"** (or "Write as Proxy" if available)
4. Click **"Connect to Web3"** and connect your wallet
5. Find the function you want to call
6. Enter the required parameters
7. Click **"Write"** and confirm the transaction in your wallet

### How to Use Etherscan's Read Contract Feature

1. Navigate to the contract address on Etherscan
2. Click the **"Contract"** tab
3. Click **"Read Contract"** (or "Read as Proxy" if available)
4. Find the function you want to query
5. Enter any required parameters
6. Click **"Query"** to see the result

---

## 2. Contract Reference

### Core Protocol Contracts

| Contract | Address | Etherscan |
|----------|---------|-----------|
| LoanCore V3 | \`0x89bc08BA00f135d608bc335f6B33D7a9ABCC98aF\` | [View](https://etherscan.io/address/0x89bc08BA00f135d608bc335f6B33D7a9ABCC98aF) |
| LoanCore V2 | \`0x81b2F8Fc75Bab64A6b144aa6d2fAa127B4Fa7fD9\` | [View](https://etherscan.io/address/0x81b2F8Fc75Bab64A6b144aa6d2fAa127B4Fa7fD9) |
| RepaymentController V3 | \`0x74241e1A9c021643289476426B9B70229Ab40D53\` | [View](https://etherscan.io/address/0x74241e1A9c021643289476426B9B70229Ab40D53) |
| RepaymentController V2 | \`0xb39dAB85FA05C381767FF992cCDE4c94619993d4\` | [View](https://etherscan.io/address/0xb39dAB85FA05C381767FF992cCDE4c94619993d4) |

### Vault Factory Contracts

| Contract | Address | Etherscan |
|----------|---------|-----------|
| VaultFactory V3 | \`0x269363665Dbb1582b143099a3cb467E98a476D55\` | [View](https://etherscan.io/address/0x269363665Dbb1582b143099a3cb467E98a476D55) |
| VaultFactory V2 | \`0x6e9B4c2f6Bd57b7b924d29b5dcfCa1273Ecc94A2\` | [View](https://etherscan.io/address/0x6e9B4c2f6Bd57b7b924d29b5dcfCa1273Ecc94A2) |
| VaultFactory ApeStaking | \`0x666faa632E5f7bA20a7FCe36596A6736f87133Be\` | [View](https://etherscan.io/address/0x666faa632E5f7bA20a7FCe36596A6736f87133Be) |

### Promissory Note Contracts

| Contract | Address | Etherscan |
|----------|---------|-----------|
| LenderNote V3 | \`0x92ED78b41537C902Ad287608d8535bb6780A7618\` | [View](https://etherscan.io/address/0x92ED78b41537C902Ad287608d8535bb6780A7618) |
| LenderNote V2 | \`0x349A026A43FFA8e2Ab4c4e59FCAa93F87Bd8DdeE\` | [View](https://etherscan.io/address/0x349A026A43FFA8e2Ab4c4e59FCAa93F87Bd8DdeE) |
| BorrowerNote V2 | \`0x337104A4f06260Ff327d6734C555A0f5d8F863aa\` | [View](https://etherscan.io/address/0x337104A4f06260Ff327d6734C555A0f5d8F863aa) |

### Supported Loan Tokens

| Token | Address | Decimals |
|-------|---------|----------|
| USDC | \`0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48\` | 6 |
| WETH | \`0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2\` | 18 |
| DAI | \`0x6b175474e89094c44da98b954eedeac495271d0f\` | 18 |
| USDT | \`0xdac17f958d2ee523a2206206994597c13d831ec7\` | 6 |

---

## 3. Finding Your Assets On-Chain

### Finding Your Vault Address

Your vaults are NFTs owned by your wallet. To find them:

#### Method 1: Check VaultFactory Events

1. Go to the VaultFactory contract on Etherscan (V2 or V3)
2. Click **"Events"** tab
3. Filter for \`VaultCreated\` events
4. Look for events where the \`to\` address matches your wallet

#### Method 2: Query VaultFactory Directly

1. Go to VaultFactory on Etherscan > **Read Contract**
2. Use \`tokenOfOwnerByIndex\`:
   - \`owner\`: Your wallet address
   - \`index\`: Start with \`0\`, increment to find all vaults
3. Use \`instanceAt\` with the token ID to get the vault address

### Finding Your Loan IDs

#### For Borrowers (V2 Loans)

1. Go to BorrowerNote V2 on Etherscan
2. **Read Contract** > \`tokenOfOwnerByIndex\`:
   - \`owner\`: Your wallet address
   - \`index\`: \`0\` (or higher if you have multiple)
3. The returned value is your loan ID

#### For Lenders (V2 and V3 Loans)

1. Go to the appropriate LenderNote contract
2. **Read Contract** > \`tokenOfOwnerByIndex\`:
   - \`owner\`: Your wallet address
   - \`index\`: \`0\` (or higher)
3. The returned value is your loan ID

### Checking Loan Status

1. Go to the appropriate LoanCore contract (V2 or V3)
2. **Read Contract** > \`getLoan\`:
   - \`loanId\`: Your loan ID
3. Check the \`state\` field in the response:
   - \`0\` = DUMMY (placeholder)
   - \`1\` = Active
   - \`2\` = Repaid
   - \`3\` = Defaulted

---

## 4. Loan Operations (Borrowers)

### Check Amount Owed (V2 Loans)

1. Go to RepaymentController V2
2. **Read Contract** > \`amountToCloseLoan\`:
   - \`loanId\`: Your loan ID
3. Returns the total amount (principal + interest) required to repay

### Repay a Loan

Repaying a loan requires two steps: approving the token spend, then calling repay.

#### Step 1: Approve Token Spend

1. Go to the loan token contract (e.g., USDC, WETH) on Etherscan
2. **Write Contract** > \`approve\`:
   - \`spender\`: RepaymentController address
     - V3: \`0x74241e1A9c021643289476426B9B70229Ab40D53\`
     - V2: \`0xb39dAB85FA05C381767FF992cCDE4c94619993d4\`
   - \`amount\`: Total amount owed (in smallest units)

**Important**: For amounts, multiply by 10^decimals. Examples:
- 100 USDC = \`100000000\` (100 × 10^6)
- 1 WETH = \`1000000000000000000\` (1 × 10^18)

#### Step 2: Repay the Loan

**For V3 Loans:**

1. Go to RepaymentController V3
2. **Write Contract** > \`repay\`:
   - \`loanId\`: Your loan ID
3. Click **Write** and confirm

**For V2 Loans:**

1. Go to RepaymentController V2
2. **Write Contract** > \`repay\` or \`closeLoan\`:
   - \`loanId\`: Your loan ID
3. Click **Write** and confirm

After repayment, your collateral vault will be returned to you.

---

## 5. Loan Operations (Lenders)

### Check if a Loan Has Defaulted

1. Go to LoanCore V3 or V2 on Etherscan
2. **Read Contract** > \`getLoan\`:
   - \`loanId\`: Your loan ID
3. Check:
   - \`state\`: Should be \`1\` (Active)
   - \`startDate\` + \`terms.durationSecs\`: Calculate the due date
   - Current time must be past due date + 10-minute grace period

**Grace Period**: V3 loans have a 10-minute grace period after the due date before default can be claimed.

### Claim Collateral on Default

Only the lender can claim collateral after a loan defaults.

**For V3 Loans:**

1. Go to RepaymentController V3
2. **Write Contract** > \`claim\`:
   - \`loanId\`: Your loan ID
3. Click **Write** and confirm

The collateral vault NFT will be transferred to your wallet.

**For V2 Loans:**

1. Go to RepaymentController V2
2. **Write Contract** > \`claim\`:
   - \`loanId\`: Your loan ID
   - \`currentInstallmentPeriod\`: \`0\` (for non-installment loans)
3. Click **Write** and confirm

---

## 6. Vault Withdrawals

After you own a vault (either as the original creator or after claiming defaulted collateral), you can withdraw the assets inside.

### Step 1: Enable Withdrawals (Required)

**Important**: You must enable withdrawals before you can withdraw any assets. This is a one-time operation per vault.

1. Find your vault address
2. Go to your vault address on Etherscan
3. **Write Contract** > \`enableWithdraw\`
4. Click **Write** and confirm

After enabling, the vault cannot be used as collateral again.

### Step 2: Withdraw Assets

#### Withdraw ERC721 NFTs

1. Go to your vault address on Etherscan
2. **Write Contract** > \`withdrawERC721\`:
   - \`token\`: NFT contract address
   - \`tokenId\`: Token ID of the NFT
   - \`to\`: Your wallet address
3. Click **Write** and confirm

#### Withdraw ERC20 Tokens

1. Go to your vault address on Etherscan
2. **Write Contract** > \`withdrawERC20\`:
   - \`token\`: ERC20 token contract address
   - \`to\`: Your wallet address
3. Click **Write** and confirm

#### Withdraw ETH

1. Go to your vault address on Etherscan
2. **Write Contract** > \`withdrawETH\`:
   - \`to\`: Your wallet address
3. Click **Write** and confirm

### Special Asset Withdrawals

#### CryptoPunks

Punks use a non-standard interface:

1. Go to your vault address on Etherscan
2. **Write Contract** > \`withdrawPunk\`:
   - \`punks\`: \`0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb\`
   - \`punkIndex\`: Your punk's index number
   - \`to\`: Your wallet address
3. Click **Write** and confirm

---

## 7. APE Staking Operations

If your vault contains BAYC, MAYC, or BAKC NFTs with staked APE, you can claim rewards and withdraw staked APE through the vault's \`call\` function.

Contact support for assistance with APE staking withdrawals as they require encoded function calls.

---

## 8. Canceling Offers

If you have outstanding loan offers you want to cancel:

1. Find your offer's nonce (from your transaction history or stored offer data)
2. Go to the appropriate LoanCore contract
3. **Write Contract** > \`cancelNonce\`:
   - \`nonce\`: The nonce of the offer to cancel (uint160)
4. Click **Write** and confirm

This invalidates the offer signature, preventing it from being used.

---

## 9. Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| \`RC_InvalidState\` | Loan is not in the expected state | Check loan state with \`getLoan\` |
| \`RC_OnlyLender\` | Caller is not the lender | Use the wallet that owns the LenderNote |
| \`LC_NotExpired\` | Trying to claim before loan expires | Wait until after due date + grace period |
| \`AV_WithdrawsDisabled\` | Withdrawals not enabled | Call \`enableWithdraw\` first |
| \`AV_MissingAuthorization\` | Not the vault owner | Verify you own the vault NFT |
| \`Insufficient allowance\` | Token not approved | Approve token spend first |

### Verification Checklist

Before executing any transaction:

- [ ] Verify you're on Ethereum Mainnet (Chain ID: 1)
- [ ] Double-check all contract addresses match this guide
- [ ] Verify the function parameters are correct
- [ ] For token amounts, ensure you've used the correct decimals
- [ ] Test with read functions before write operations
- [ ] Have sufficient ETH for gas fees

---

*Last updated: January 2025*
`;

export default function GuidePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-700 bg-guide-sidebar sticky top-0 z-50">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/assets/arcade-logo-dark-mode.svg"
                alt="Arcade"
                width={120}
                height={32}
                priority
              />
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              <Link
                href="/"
                className="px-4 py-2 text-xl font-pixel uppercase tracking-wide text-gray-400 hover:text-white transition-colors"
              >
                Recovery
              </Link>
              <Link
                href="/guide"
                className="px-4 py-2 text-xl font-pixel uppercase tracking-wide text-white hover:text-arcade-mint transition-colors"
              >
                Guide
              </Link>
            </nav>
          </div>
          <Link
            href="/"
            className="arcade-btn arcade-btn-primary px-4 py-2 text-sm"
          >
            Open App
          </Link>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className={`
          fixed lg:sticky top-[65px] left-0 h-[calc(100vh-65px)] w-72
          bg-guide-sidebar border-r border-gray-700
          transform transition-transform duration-200 ease-in-out z-40
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          overflow-y-auto
        `}>
          <nav className="p-4">
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-4 font-semibold">
              On this page
            </p>
            <ul className="space-y-1">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    onClick={() => setSidebarOpen(false)}
                    className="block px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 rounded transition-colors"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Backdrop for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 bg-guide-content min-h-[calc(100vh-65px)]">
          <div className="max-w-4xl mx-auto px-6 md:px-12 py-12">
            {/* Markdown Content */}
            <article className="guide-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
                {guideContent}
              </ReactMarkdown>
            </article>

            {/* Footer */}
            <footer className="mt-16 pt-8 border-t border-gray-700 text-center">
              <Link
                href="/"
                className="arcade-btn arcade-btn-primary px-6 py-3 inline-block"
              >
                Back to Recovery App
              </Link>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
