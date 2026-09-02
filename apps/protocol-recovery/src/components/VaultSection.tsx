'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS, vaultFactoryAbi, assetVaultAbi } from '@/lib/contracts';
import { publicClient } from '@/lib/publicClient';
import { shortenAddress } from '@/lib/utils';

interface VaultInfo {
  tokenId: bigint;
  address: string;
  version: 'V2' | 'V3';
  withdrawEnabled: boolean;
}

export function VaultSection() {
  const { address } = useAccount();
  const [vaults, setVaults] = useState<VaultInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVaults = async () => {
      if (!address) {
        setVaults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      // Balances are read through publicClient rather than the wallet's
      // connected chain. Looking up vaults is a read-only mainnet query and
      // must not depend on which network the wallet happens to be on.
      const fetchVaultIds = async (
        factoryAddress: `0x${string}`,
        version: 'V2' | 'V3'
      ) => {
        const balance = await publicClient.readContract({
          address: factoryAddress,
          abi: vaultFactoryAbi,
          functionName: 'balanceOf',
          args: [address],
        });
        if (!balance || balance === 0n) return [];
        const vaultInfos: VaultInfo[] = [];

        for (let i = 0n; i < balance; i++) {
          const tokenId = await publicClient.readContract({
            address: factoryAddress,
            abi: vaultFactoryAbi,
            functionName: 'tokenOfOwnerByIndex',
            args: [address, i],
          });

          const vaultAddress = await publicClient.readContract({
            address: factoryAddress,
            abi: vaultFactoryAbi,
            functionName: 'instanceAt',
            args: [tokenId],
          });

          let withdrawEnabled = false;
          try {
            withdrawEnabled = await publicClient.readContract({
              address: vaultAddress,
              abi: assetVaultAbi,
              functionName: 'withdrawEnabled',
            });
          } catch (e) {
            // A vault that cannot answer withdrawEnabled is still worth showing.
            console.error('Error reading withdrawEnabled:', e);
          }

          vaultInfos.push({ tokenId, address: vaultAddress, version, withdrawEnabled });
        }
        return vaultInfos;
      };

      try {
        const [v3Vaults, v2Vaults] = await Promise.all([
          fetchVaultIds(CONTRACTS.vaultFactoryV3, 'V3'),
          fetchVaultIds(CONTRACTS.vaultFactoryV2, 'V2'),
        ]);
        setVaults([...v3Vaults, ...v2Vaults]);
      } catch (e) {
        // Surface the failure. Reporting "no vaults found" when the lookup
        // itself broke is how the previous bug stayed hidden.
        console.error('Error fetching vaults:', e);
        setError(e instanceof Error ? e.message : String(e));
        setVaults([]);
      }

      setLoading(false);
    };

    fetchVaults();
  }, [address]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-gray-700 border-t-arcade-mint mx-auto mb-4"></div>
        <p className="text-gray-400">Loading your vaults...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-arcade-pink">Could not load your vaults.</p>
        <p className="text-gray-500 text-sm mt-2 break-all">{error}</p>
        <p className="text-gray-500 text-sm mt-2">
          This is a lookup failure, not a confirmation that you have no vaults. Try again, or use
          the Manual tab if you know your vault address.
        </p>
      </div>
    );
  }

  if (vaults.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No vaults found for your wallet.</p>
        <p className="text-gray-500 text-sm mt-2">
          Use the Manual tab to interact with a vault by address if you know it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-pixel uppercase tracking-wide text-white mb-4">
        Your Vaults ({vaults.length})
      </h2>

      {vaults.map((vault) => (
        <VaultCard key={vault.address} vault={vault} />
      ))}
    </div>
  );
}

function VaultCard({ vault }: { vault: VaultInfo }) {
  const { address } = useAccount();
  const [withdrawToken, setWithdrawToken] = useState('');
  const [withdrawTokenId, setWithdrawTokenId] = useState('');

  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleEnableWithdraw = () => {
    writeContract({
      address: vault.address as `0x${string}`,
      abi: assetVaultAbi,
      functionName: 'enableWithdraw',
    });
  };

  const handleWithdrawERC721 = () => {
    if (!withdrawToken || !withdrawTokenId || !address) return;
    writeContract({
      address: vault.address as `0x${string}`,
      abi: assetVaultAbi,
      functionName: 'withdrawERC721',
      args: [withdrawToken as `0x${string}`, BigInt(withdrawTokenId), address],
    });
  };

  const handleWithdrawERC20 = () => {
    if (!withdrawToken || !address) return;
    writeContract({
      address: vault.address as `0x${string}`,
      abi: assetVaultAbi,
      functionName: 'withdrawERC20',
      args: [withdrawToken as `0x${string}`, address],
    });
  };

  const handleWithdrawETH = () => {
    if (!address) return;
    writeContract({
      address: vault.address as `0x${string}`,
      abi: assetVaultAbi,
      functionName: 'withdrawETH',
      args: [address],
    });
  };

  return (
    <div className="arcade-card-elevated p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-pixel uppercase">Vault #{vault.tokenId.toString()}</span>
            <span className="badge-gray px-2 py-0.5 text-xs">{vault.version}</span>
            {vault.withdrawEnabled ? (
              <span className="badge-mint px-2 py-0.5 text-xs">Withdrawals Enabled</span>
            ) : (
              <span className="badge-pink px-2 py-0.5 text-xs">Withdrawals Disabled</span>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Address: <code className="text-arcade-mint">{shortenAddress(vault.address)}</code>
          </p>
        </div>

        {!vault.withdrawEnabled && (
          <button
            onClick={handleEnableWithdraw}
            disabled={isPending || isConfirming}
            className="arcade-btn arcade-btn-primary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending || isConfirming ? 'Processing...' : 'Enable Withdrawals'}
          </button>
        )}
      </div>

      {vault.withdrawEnabled && (
        <div className="space-y-4 border-t border-gray-700 pt-4">
          <h4 className="text-sm font-pixel uppercase tracking-wide text-white">Withdraw Assets</h4>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Token contract address"
              value={withdrawToken}
              onChange={(e) => setWithdrawToken(e.target.value)}
              className="flex-1 px-3 py-2 bg-elv-5 border border-gray-700 text-white text-sm focus:border-arcade-blue focus:outline-none"
            />
            <input
              type="text"
              placeholder="Token ID (for NFTs)"
              value={withdrawTokenId}
              onChange={(e) => setWithdrawTokenId(e.target.value)}
              className="w-32 px-3 py-2 bg-elv-5 border border-gray-700 text-white text-sm focus:border-arcade-blue focus:outline-none"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleWithdrawERC721}
              disabled={isPending || isConfirming || !withdrawToken || !withdrawTokenId}
              className="arcade-btn arcade-btn-secondary px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Withdraw NFT
            </button>
            <button
              onClick={handleWithdrawERC20}
              disabled={isPending || isConfirming || !withdrawToken}
              className="arcade-btn arcade-btn-secondary px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Withdraw ERC20
            </button>
            <button
              onClick={handleWithdrawETH}
              disabled={isPending || isConfirming}
              className="arcade-btn arcade-btn-secondary px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Withdraw ETH
            </button>
          </div>
        </div>
      )}

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
