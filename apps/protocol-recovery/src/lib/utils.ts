import { formatUnits } from 'viem';

export function formatAmount(amount: bigint, decimals: number = 18): string {
  const formatted = formatUnits(amount, decimals);
  const num = parseFloat(formatted);
  if (num === 0) return '0';
  if (num < 0.0001) return '<0.0001';
  return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export enum LoanState {
  DUMMY = 0,
  Active = 1,
  Repaid = 2,
  Defaulted = 3,
}

export function getLoanStateLabel(state: number): string {
  switch (state) {
    case LoanState.Active:
      return 'Active';
    case LoanState.Repaid:
      return 'Repaid';
    case LoanState.Defaulted:
      return 'Defaulted';
    default:
      return 'Unknown';
  }
}

export function getLoanStateColor(state: number): string {
  switch (state) {
    case LoanState.Active:
      return 'text-green-400';
    case LoanState.Repaid:
      return 'text-blue-400';
    case LoanState.Defaulted:
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
}
