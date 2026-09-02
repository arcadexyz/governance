export const CONTRACTS = {
  // V3 Contracts
  loanCoreV3: '0x89bc08BA00f135d608bc335f6B33D7a9ABCC98aF' as const,
  repaymentControllerV3: '0x74241e1A9c021643289476426B9B70229Ab40D53' as const,
  vaultFactoryV3: '0x269363665Dbb1582b143099a3cb467E98a476D55' as const,
  lenderNoteV3: '0x92ED78b41537C902Ad287608d8535bb6780A7618' as const,
  borrowerNoteV3: '0xe5B12BEfaf3a91065DA7FDD461dEd2d8F8ECb7BE' as const,

  // V2 Contracts
  loanCoreV2: '0x81b2F8Fc75Bab64A6b144aa6d2fAa127B4Fa7fD9' as const,
  repaymentControllerV2: '0xb39dAB85FA05C381767FF992cCDE4c94619993d4' as const,
  vaultFactoryV2: '0x6e9B4c2f6Bd57b7b924d29b5dcfCa1273Ecc94A2' as const,
  lenderNoteV2: '0x349A026A43FFA8e2Ab4c4e59FCAa93F87Bd8DdeE' as const,
  borrowerNoteV2: '0x337104A4f06260Ff327d6734C555A0f5d8F863aa' as const,
};

// Common token addresses
export const TOKENS = {
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const,
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as const,
  DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F' as const,
};

// Minimal ABIs - only the functions we need

export const loanCoreV3Abi = [
  {
    inputs: [{ internalType: 'uint256', name: 'loanId', type: 'uint256' }],
    name: 'getLoan',
    outputs: [
      {
        components: [
          { internalType: 'enum LoanLibrary.LoanState', name: 'state', type: 'uint8' },
          { internalType: 'uint160', name: 'startDate', type: 'uint160' },
          {
            components: [
              { internalType: 'uint256', name: 'proratedInterestRate', type: 'uint256' },
              { internalType: 'uint256', name: 'principal', type: 'uint256' },
              { internalType: 'address', name: 'collateralAddress', type: 'address' },
              { internalType: 'uint96', name: 'durationSecs', type: 'uint96' },
              { internalType: 'uint256', name: 'collateralId', type: 'uint256' },
              { internalType: 'address', name: 'payableCurrency', type: 'address' },
              { internalType: 'uint96', name: 'deadline', type: 'uint96' },
              { internalType: 'bytes32', name: 'affiliateCode', type: 'bytes32' },
            ],
            internalType: 'struct LoanLibrary.LoanTerms',
            name: 'terms',
            type: 'tuple',
          },
          {
            components: [
              { internalType: 'uint16', name: 'lenderDefaultFee', type: 'uint16' },
              { internalType: 'uint16', name: 'lenderInterestFee', type: 'uint16' },
              { internalType: 'uint16', name: 'lenderPrincipalFee', type: 'uint16' },
            ],
            internalType: 'struct LoanLibrary.FeeSnapshot',
            name: 'feeSnapshot',
            type: 'tuple',
          },
        ],
        internalType: 'struct LoanLibrary.LoanData',
        name: 'loanData',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'INTEREST_RATE_DENOMINATOR',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'GRACE_PERIOD',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const loanCoreV2Abi = [
  {
    inputs: [{ internalType: 'uint256', name: 'loanId', type: 'uint256' }],
    name: 'getLoan',
    outputs: [
      {
        components: [
          { internalType: 'enum LoanLibrary.LoanState', name: 'state', type: 'uint8' },
          { internalType: 'uint24', name: 'numInstallmentsPaid', type: 'uint24' },
          { internalType: 'uint160', name: 'startDate', type: 'uint160' },
          {
            components: [
              { internalType: 'uint32', name: 'durationSecs', type: 'uint32' },
              { internalType: 'uint32', name: 'deadline', type: 'uint32' },
              { internalType: 'uint24', name: 'numInstallments', type: 'uint24' },
              { internalType: 'uint160', name: 'interestRate', type: 'uint160' },
              { internalType: 'uint256', name: 'principal', type: 'uint256' },
              { internalType: 'address', name: 'collateralAddress', type: 'address' },
              { internalType: 'uint256', name: 'collateralId', type: 'uint256' },
              { internalType: 'address', name: 'payableCurrency', type: 'address' },
            ],
            internalType: 'struct LoanLibrary.LoanTerms',
            name: 'terms',
            type: 'tuple',
          },
          { internalType: 'uint256', name: 'balance', type: 'uint256' },
          { internalType: 'uint256', name: 'balancePaid', type: 'uint256' },
          { internalType: 'uint256', name: 'lateFeesAccrued', type: 'uint256' },
        ],
        internalType: 'struct LoanLibrary.LoanData',
        name: 'loanData',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'INTEREST_RATE_DENOMINATOR',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const repaymentControllerV3Abi = [
  {
    inputs: [{ internalType: 'uint256', name: 'loanId', type: 'uint256' }],
    name: 'repay',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'loanId', type: 'uint256' }],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'principal', type: 'uint256' },
      { internalType: 'uint256', name: 'proratedInterestRate', type: 'uint256' },
    ],
    name: 'getInterestAmount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'pure',
    type: 'function',
  },
] as const;

export const repaymentControllerV2Abi = [
  {
    inputs: [{ internalType: 'uint256', name: 'loanId', type: 'uint256' }],
    name: 'repay',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'loanId', type: 'uint256' }],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'loanId', type: 'uint256' }],
    name: 'closeLoan',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'loanId', type: 'uint256' }],
    name: 'amountToCloseLoan',
    outputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'principal', type: 'uint256' },
      { internalType: 'uint256', name: 'interestRate', type: 'uint256' },
    ],
    name: 'getFullInterestAmount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'pure',
    type: 'function',
  },
] as const;

export const promissoryNoteAbi = [
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'uint256', name: 'index', type: 'uint256' },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const vaultFactoryAbi = [
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'uint256', name: 'index', type: 'uint256' },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'instanceAt',
    outputs: [{ internalType: 'address', name: 'instance', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const assetVaultAbi = [
  {
    inputs: [],
    name: 'enableWithdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'withdrawEnabled',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'address', name: 'to', type: 'address' },
    ],
    name: 'withdrawERC721',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
    ],
    name: 'withdrawERC20',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'to', type: 'address' }],
    name: 'withdrawETH',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'address', name: 'to', type: 'address' },
    ],
    name: 'withdrawERC1155',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: 'ownerAddress', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const erc20Abi = [
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
