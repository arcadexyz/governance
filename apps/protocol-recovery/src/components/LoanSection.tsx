'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import {
  CONTRACTS,
  promissoryNoteAbi,
  repaymentControllerV3Abi,
  repaymentControllerV2Abi,
  loanCoreV3Abi,
  loanCoreV2Abi,
} from '@/lib/contracts';
import { publicClient } from '@/lib/publicClient';
import { formatAmount, formatDate, getLoanStateLabel, LoanState } from '@/lib/utils';

interface LoanInfo {
  id: bigint;
  version: 'V2' | 'V3';
  role: 'borrower' | 'lender';
  state: number;
  principal: bigint;
  payableCurrency: string;
  collateralAddress: string;
  collateralId: bigint;
  startDate: number;
  durationSecs: number;
  interestRate: bigint;
}

export function LoanSection() {
  const { address } = useAccount();
  const [loans, setLoans] = useState<LoanInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Get note balances for all note contracts
  const { data: borrowerNoteV3Balance } = useReadContract({
    address: CONTRACTS.borrowerNoteV3,
    abi: promissoryNoteAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: lenderNoteV3Balance } = useReadContract({
    address: CONTRACTS.lenderNoteV3,
    abi: promissoryNoteAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: borrowerNoteV2Balance } = useReadContract({
    address: CONTRACTS.borrowerNoteV2,
    abi: promissoryNoteAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: lenderNoteV2Balance } = useReadContract({
    address: CONTRACTS.lenderNoteV2,
    abi: promissoryNoteAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Build list of loan IDs to fetch
  useEffect(() => {
    const fetchLoans = async () => {
      if (!address) return;
      setLoading(true);

      const allLoans: LoanInfo[] = [];

      // Helper to fetch loan IDs from a note contract
      const fetchLoanIds = async (
        noteAddress: `0x${string}`,
        balance: bigint | undefined,
        version: 'V2' | 'V3',
        role: 'borrower' | 'lender'
      ) => {
        if (!balance || balance === 0n) return [];
        const ids: { id: bigint; version: 'V2' | 'V3'; role: 'borrower' | 'lender' }[] = [];
        for (let i = 0n; i < balance; i++) {
          try {
            const id = await publicClient.readContract({
              address: noteAddress,
              abi: promissoryNoteAbi,
              functionName: 'tokenOfOwnerByIndex',
              args: [address, i],
            });
            ids.push({ id, version, role });
          } catch (e) {
            console.error('Error fetching loan ID:', e);
          }
        }
        return ids;
      };

      // Fetch all loan IDs
      const [borrowerV3Ids, lenderV3Ids, borrowerV2Ids, lenderV2Ids] = await Promise.all([
        fetchLoanIds(CONTRACTS.borrowerNoteV3, borrowerNoteV3Balance, 'V3', 'borrower'),
        fetchLoanIds(CONTRACTS.lenderNoteV3, lenderNoteV3Balance, 'V3', 'lender'),
        fetchLoanIds(CONTRACTS.borrowerNoteV2, borrowerNoteV2Balance, 'V2', 'borrower'),
        fetchLoanIds(CONTRACTS.lenderNoteV2, lenderNoteV2Balance, 'V2', 'lender'),
      ]);

      const allIds = [...borrowerV3Ids, ...lenderV3Ids, ...borrowerV2Ids, ...lenderV2Ids];

      // Fetch loan details for each. Decoding goes through the contract ABIs so
      // struct layouts are never assumed from hardcoded byte offsets.
      for (const { id, version, role } of allIds) {
        try {
          if (version === 'V3') {
            const loan = await publicClient.readContract({
              address: CONTRACTS.loanCoreV3,
              abi: loanCoreV3Abi,
              functionName: 'getLoan',
              args: [id],
            });

            allLoans.push({
              id,
              version,
              role,
              state: Number(loan.state),
              startDate: Number(loan.startDate),
              principal: loan.terms.principal,
              payableCurrency: loan.terms.payableCurrency,
              collateralAddress: loan.terms.collateralAddress,
              collateralId: loan.terms.collateralId,
              durationSecs: Number(loan.terms.durationSecs),
              interestRate: loan.terms.proratedInterestRate,
            });
          } else {
            const loan = await publicClient.readContract({
              address: CONTRACTS.loanCoreV2,
              abi: loanCoreV2Abi,
              functionName: 'getLoan',
              args: [id],
            });

            allLoans.push({
              id,
              version,
              role,
              state: Number(loan.state),
              startDate: Number(loan.startDate),
              principal: loan.terms.principal,
              payableCurrency: loan.terms.payableCurrency,
              collateralAddress: loan.terms.collateralAddress,
              collateralId: loan.terms.collateralId,
              durationSecs: Number(loan.terms.durationSecs),
              interestRate: loan.terms.interestRate,
            });
          }
        } catch (e) {
          console.error('Error fetching loan details:', e);
        }
      }

      setLoans(allLoans);
      setLoading(false);
    };

    fetchLoans();
  }, [address, borrowerNoteV3Balance, lenderNoteV3Balance, borrowerNoteV2Balance, lenderNoteV2Balance]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-gray-700 border-t-arcade-mint mx-auto mb-4"></div>
        <p className="text-gray-400">Loading your loans...</p>
      </div>
    );
  }

  if (loans.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No loans found for your wallet.</p>
        <p className="text-gray-500 text-sm mt-2">
          Use the Manual tab to look up a loan by ID if you know it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-pixel uppercase tracking-wide text-white mb-4">
        Your Loans ({loans.length})
      </h2>

      {loans.map((loan) => (
        <LoanCard key={`${loan.version}-${loan.id.toString()}`} loan={loan} />
      ))}
    </div>
  );
}

function LoanCard({ loan }: { loan: LoanInfo }) {
  const { address } = useAccount();
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const dueDate = loan.startDate + loan.durationSecs;
  const isOverdue = Date.now() / 1000 > dueDate;
  const canClaim = loan.state === LoanState.Active && isOverdue && loan.role === 'lender';
  const canRepay = loan.state === LoanState.Active && loan.role === 'borrower';

  const handleRepay = async () => {
    if (!address) return;
    const repaymentController = loan.version === 'V3' ? CONTRACTS.repaymentControllerV3 : CONTRACTS.repaymentControllerV2;
    const abi = loan.version === 'V3' ? repaymentControllerV3Abi : repaymentControllerV2Abi;
    writeContract({ address: repaymentController, abi, functionName: 'repay', args: [loan.id] });
  };

  const handleClaim = async () => {
    if (!address) return;
    const repaymentController = loan.version === 'V3' ? CONTRACTS.repaymentControllerV3 : CONTRACTS.repaymentControllerV2;
    const abi = loan.version === 'V3' ? repaymentControllerV3Abi : repaymentControllerV2Abi;
    writeContract({ address: repaymentController, abi, functionName: 'claim', args: [loan.id] });
  };

  const getStateBadge = () => {
    switch (loan.state) {
      case LoanState.Active:
        return <span className="badge-mint px-2 py-0.5 text-xs">Active</span>;
      case LoanState.Repaid:
        return <span className="badge-blue px-2 py-0.5 text-xs">Repaid</span>;
      case LoanState.Defaulted:
        return <span className="badge-pink px-2 py-0.5 text-xs">Defaulted</span>;
      default:
        return <span className="badge-gray px-2 py-0.5 text-xs">Unknown</span>;
    }
  };

  return (
    <div className="arcade-card-elevated p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-pixel uppercase">Loan #{loan.id.toString()}</span>
            <span className="badge-gray px-2 py-0.5 text-xs">{loan.version}</span>
            <span className="badge-blue px-2 py-0.5 text-xs capitalize">{loan.role}</span>
            {getStateBadge()}
          </div>
          <div className="mt-3 space-y-1 text-sm text-gray-400">
            <p>
              Principal: <span className="text-white">{formatAmount(loan.principal, 6)} tokens</span>
            </p>
            <p>
              Due:{' '}
              <span className={isOverdue ? 'text-arcade-pink' : 'text-white'}>
                {formatDate(dueDate)}
              </span>
              {isOverdue && <span className="text-arcade-pink ml-2">(Overdue)</span>}
            </p>
            <p>
              Collateral:{' '}
              <span className="text-gray-300">
                {loan.collateralAddress.slice(0, 10)}...#{loan.collateralId.toString()}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {canRepay && (
            <button
              onClick={handleRepay}
              disabled={isPending || isConfirming}
              className="arcade-btn arcade-btn-mint px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending || isConfirming ? 'Processing...' : 'Repay Loan'}
            </button>
          )}
          {canClaim && (
            <button
              onClick={handleClaim}
              disabled={isPending || isConfirming}
              className="arcade-btn arcade-btn-pink px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending || isConfirming ? 'Processing...' : 'Claim Collateral'}
            </button>
          )}
          {loan.state === LoanState.Repaid && (
            <span className="text-arcade-blue text-sm font-pixel">Loan Repaid</span>
          )}
          {loan.state === LoanState.Defaulted && (
            <span className="text-gray-500 text-sm font-pixel">Loan Closed</span>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-arcade-pink/10 border border-arcade-pink/30 text-arcade-pink text-sm">
          Error: {error.message}
        </div>
      )}

      {isSuccess && (
        <div className="mt-3 p-3 bg-arcade-mint/10 border border-arcade-mint/30 text-arcade-mint text-sm">
          Transaction successful!{' '}
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
    </div>
  );
}
