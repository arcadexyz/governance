'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import {
  CONTRACTS,
  repaymentControllerV3Abi,
  repaymentControllerV2Abi,
  assetVaultAbi,
  erc20Abi,
} from '@/lib/contracts';

type Operation = 'repay' | 'claim' | 'vault-enable' | 'vault-withdraw' | 'approve';

export function ManualSection() {
  const { address } = useAccount();
  const [operation, setOperation] = useState<Operation>('repay');

  const [loanId, setLoanId] = useState('');
  const [loanVersion, setLoanVersion] = useState<'V2' | 'V3'>('V3');
  const [vaultAddress, setVaultAddress] = useState('');
  const [tokenAddress, setTokenAddress] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [approveSpender, setApproveSpender] = useState('');
  const [approveAmount, setApproveAmount] = useState('');

  const { writeContract, data: hash, error, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleRepay = () => {
    if (!loanId) return;
    const repaymentController = loanVersion === 'V3' ? CONTRACTS.repaymentControllerV3 : CONTRACTS.repaymentControllerV2;
    const abi = loanVersion === 'V3' ? repaymentControllerV3Abi : repaymentControllerV2Abi;
    writeContract({ address: repaymentController, abi, functionName: 'repay', args: [BigInt(loanId)] });
  };

  const handleClaim = () => {
    if (!loanId) return;
    const repaymentController = loanVersion === 'V3' ? CONTRACTS.repaymentControllerV3 : CONTRACTS.repaymentControllerV2;
    const abi = loanVersion === 'V3' ? repaymentControllerV3Abi : repaymentControllerV2Abi;
    writeContract({ address: repaymentController, abi, functionName: 'claim', args: [BigInt(loanId)] });
  };

  const handleEnableWithdraw = () => {
    if (!vaultAddress) return;
    writeContract({
      address: vaultAddress as `0x${string}`,
      abi: assetVaultAbi,
      functionName: 'enableWithdraw',
    });
  };

  const handleVaultWithdrawERC721 = () => {
    if (!vaultAddress || !tokenAddress || !tokenId || !address) return;
    writeContract({
      address: vaultAddress as `0x${string}`,
      abi: assetVaultAbi,
      functionName: 'withdrawERC721',
      args: [tokenAddress as `0x${string}`, BigInt(tokenId), address],
    });
  };

  const handleVaultWithdrawERC1155 = () => {
    if (!vaultAddress || !tokenAddress || !tokenId || !address) return;
    writeContract({
      address: vaultAddress as `0x${string}`,
      abi: assetVaultAbi,
      functionName: 'withdrawERC1155',
      args: [tokenAddress as `0x${string}`, BigInt(tokenId), address],
    });
  };

  const handleVaultWithdrawERC20 = () => {
    if (!vaultAddress || !tokenAddress || !address) return;
    writeContract({
      address: vaultAddress as `0x${string}`,
      abi: assetVaultAbi,
      functionName: 'withdrawERC20',
      args: [tokenAddress as `0x${string}`, address],
    });
  };

  const handleVaultWithdrawETH = () => {
    if (!vaultAddress || !address) return;
    writeContract({
      address: vaultAddress as `0x${string}`,
      abi: assetVaultAbi,
      functionName: 'withdrawETH',
      args: [address],
    });
  };

  const handleApprove = () => {
    if (!tokenAddress || !approveSpender || !approveAmount) return;
    writeContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'approve',
      args: [approveSpender as `0x${string}`, BigInt(approveAmount)],
    });
  };

  const handleSetMaxApproval = () => {
    setApproveAmount('115792089237316195423570985008687907853269984665640564039457584007913129639935');
  };

  const operations: { key: Operation; label: string }[] = [
    { key: 'repay', label: 'Repay Loan' },
    { key: 'claim', label: 'Claim Collateral' },
    { key: 'vault-enable', label: 'Enable Withdraw' },
    { key: 'vault-withdraw', label: 'Vault Withdraw' },
    { key: 'approve', label: 'Token Approval' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-pixel uppercase tracking-wide text-white mb-2">Manual Operations</h2>
        <p className="text-sm text-gray-400">
          Direct contract interactions for advanced users.
        </p>
      </div>

      {/* Operation Selector */}
      <div className="flex flex-wrap gap-1 bg-elv-5 border border-gray-700 p-1">
        {operations.map((op) => (
          <button
            key={op.key}
            onClick={() => { setOperation(op.key); reset(); }}
            className={`px-3 py-2 text-xs font-pixel uppercase tracking-wide transition-colors ${
              operation === op.key
                ? 'bg-arcade-blue text-white'
                : 'text-gray-400 hover:text-white hover:bg-elv-3'
            }`}
          >
            {op.label}
          </button>
        ))}
      </div>

      {/* Repay Loan */}
      {operation === 'repay' && (
        <div className="arcade-card-elevated p-4 space-y-4">
          <h3 className="text-white font-pixel uppercase">Repay Loan</h3>
          <p className="text-sm text-gray-400">
            Repay an active loan. You must be the borrower and have approved the payment token.
          </p>
          <div className="flex gap-2">
            <select
              value={loanVersion}
              onChange={(e) => setLoanVersion(e.target.value as 'V2' | 'V3')}
              className="px-3 py-2 bg-elv-5 border border-gray-700 text-white text-sm focus:border-arcade-blue focus:outline-none"
            >
              <option value="V3">V3</option>
              <option value="V2">V2</option>
            </select>
            <input
              type="text"
              placeholder="Loan ID"
              value={loanId}
              onChange={(e) => setLoanId(e.target.value)}
              className="flex-1 px-3 py-2 bg-elv-5 border border-gray-700 text-white text-sm focus:border-arcade-blue focus:outline-none"
            />
            <button
              onClick={handleRepay}
              disabled={isPending || isConfirming || !loanId}
              className="arcade-btn arcade-btn-mint px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending || isConfirming ? 'Processing...' : 'Repay'}
            </button>
          </div>
        </div>
      )}

      {/* Claim Collateral */}
      {operation === 'claim' && (
        <div className="arcade-card-elevated p-4 space-y-4">
          <h3 className="text-white font-pixel uppercase">Claim Collateral</h3>
          <p className="text-sm text-gray-400">
            Claim collateral from a defaulted loan. You must be the lender.
          </p>
          <div className="flex gap-2">
            <select
              value={loanVersion}
              onChange={(e) => setLoanVersion(e.target.value as 'V2' | 'V3')}
              className="px-3 py-2 bg-elv-5 border border-gray-700 text-white text-sm focus:border-arcade-blue focus:outline-none"
            >
              <option value="V3">V3</option>
              <option value="V2">V2</option>
            </select>
            <input
              type="text"
              placeholder="Loan ID"
              value={loanId}
              onChange={(e) => setLoanId(e.target.value)}
              className="flex-1 px-3 py-2 bg-elv-5 border border-gray-700 text-white text-sm focus:border-arcade-blue focus:outline-none"
            />
            <button
              onClick={handleClaim}
              disabled={isPending || isConfirming || !loanId}
              className="arcade-btn arcade-btn-pink px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending || isConfirming ? 'Processing...' : 'Claim'}
            </button>
          </div>
        </div>
      )}

      {/* Enable Vault Withdraw */}
      {operation === 'vault-enable' && (
        <div className="arcade-card-elevated p-4 space-y-4">
          <h3 className="text-white font-pixel uppercase">Enable Vault Withdrawals</h3>
          <p className="text-sm text-gray-400">
            Enable withdrawals on a vault you own.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Vault Address (0x...)"
              value={vaultAddress}
              onChange={(e) => setVaultAddress(e.target.value)}
              className="flex-1 px-3 py-2 bg-elv-5 border border-gray-700 text-white text-sm focus:border-arcade-blue focus:outline-none"
            />
            <button
              onClick={handleEnableWithdraw}
              disabled={isPending || isConfirming || !vaultAddress}
              className="arcade-btn arcade-btn-primary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending || isConfirming ? 'Processing...' : 'Enable'}
            </button>
          </div>
        </div>
      )}

      {/* Vault Withdraw */}
      {operation === 'vault-withdraw' && (
        <div className="arcade-card-elevated p-4 space-y-4">
          <h3 className="text-white font-pixel uppercase">Withdraw from Vault</h3>
          <p className="text-sm text-gray-400">
            Withdraw assets from a vault. Withdrawals must be enabled first.
          </p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Vault Address (0x...)"
              value={vaultAddress}
              onChange={(e) => setVaultAddress(e.target.value)}
              className="w-full px-3 py-2 bg-elv-5 border border-gray-700 text-white text-sm focus:border-arcade-blue focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Token Address (0x...)"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                className="flex-1 px-3 py-2 bg-elv-5 border border-gray-700 text-white text-sm focus:border-arcade-blue focus:outline-none"
              />
              <input
                type="text"
                placeholder="Token ID (NFT)"
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
                className="w-32 px-3 py-2 bg-elv-5 border border-gray-700 text-white text-sm focus:border-arcade-blue focus:outline-none"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleVaultWithdrawERC721}
                disabled={isPending || isConfirming || !vaultAddress || !tokenAddress || !tokenId}
                className="arcade-btn arcade-btn-secondary px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Withdraw NFT (ERC721)
              </button>
              <button
                onClick={handleVaultWithdrawERC1155}
                disabled={isPending || isConfirming || !vaultAddress || !tokenAddress || !tokenId}
                className="arcade-btn arcade-btn-secondary px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Withdraw NFT (ERC1155)
              </button>
              <button
                onClick={handleVaultWithdrawERC20}
                disabled={isPending || isConfirming || !vaultAddress || !tokenAddress}
                className="arcade-btn arcade-btn-secondary px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Withdraw ERC20
              </button>
              <button
                onClick={handleVaultWithdrawETH}
                disabled={isPending || isConfirming || !vaultAddress}
                className="arcade-btn arcade-btn-secondary px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Withdraw ETH
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Token Approval */}
      {operation === 'approve' && (
        <div className="arcade-card-elevated p-4 space-y-4">
          <h3 className="text-white font-pixel uppercase">Token Approval</h3>
          <p className="text-sm text-gray-400">
            Approve a spender (like RepaymentController) to spend your tokens.
          </p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Token Address (0x...)"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              className="w-full px-3 py-2 bg-elv-5 border border-gray-700 text-white text-sm focus:border-arcade-blue focus:outline-none"
            />
            <input
              type="text"
              placeholder="Spender Address (0x...)"
              value={approveSpender}
              onChange={(e) => setApproveSpender(e.target.value)}
              className="w-full px-3 py-2 bg-elv-5 border border-gray-700 text-white text-sm focus:border-arcade-blue focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Amount (in wei)"
                value={approveAmount}
                onChange={(e) => setApproveAmount(e.target.value)}
                className="flex-1 px-3 py-2 bg-elv-5 border border-gray-700 text-white text-sm focus:border-arcade-blue focus:outline-none"
              />
              <button
                onClick={handleSetMaxApproval}
                className="arcade-btn arcade-btn-secondary px-3 py-2 text-sm"
              >
                Max
              </button>
            </div>
            <button
              onClick={handleApprove}
              disabled={isPending || isConfirming || !tokenAddress || !approveSpender || !approveAmount}
              className="w-full arcade-btn arcade-btn-primary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending || isConfirming ? 'Processing...' : 'Approve'}
            </button>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <p>Common spenders:</p>
            <p>V3 RepaymentController: <code className="text-arcade-mint">{CONTRACTS.repaymentControllerV3}</code></p>
            <p>V2 RepaymentController: <code className="text-arcade-mint">{CONTRACTS.repaymentControllerV2}</code></p>
          </div>
        </div>
      )}

      {/* Transaction Status */}
      {error && (
        <div className="p-3 bg-arcade-pink/10 border border-arcade-pink/30 text-arcade-pink text-sm">
          <strong>Error:</strong> {error.message}
        </div>
      )}

      {isSuccess && (
        <div className="p-3 bg-arcade-mint/10 border border-arcade-mint/30 text-arcade-mint text-sm">
          <strong>Success!</strong>{' '}
          <a
            href={`https://etherscan.io/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white"
          >
            View on Etherscan
          </a>
        </div>
      )}

      {/* Contract Reference */}
      <div className="arcade-card p-4 text-sm">
        <h4 className="text-white font-pixel uppercase mb-3">Contract Addresses</h4>
        <div className="space-y-1 font-mono text-xs text-gray-400">
          <p>V3 LoanCore: <span className="text-arcade-mint">{CONTRACTS.loanCoreV3}</span></p>
          <p>V3 RepaymentController: <span className="text-arcade-mint">{CONTRACTS.repaymentControllerV3}</span></p>
          <p>V3 VaultFactory: <span className="text-arcade-mint">{CONTRACTS.vaultFactoryV3}</span></p>
          <p className="mt-2">V2 LoanCore: <span className="text-arcade-mint">{CONTRACTS.loanCoreV2}</span></p>
          <p>V2 RepaymentController: <span className="text-arcade-mint">{CONTRACTS.repaymentControllerV2}</span></p>
          <p>V2 VaultFactory: <span className="text-arcade-mint">{CONTRACTS.vaultFactoryV2}</span></p>
        </div>
      </div>
    </div>
  );
}
