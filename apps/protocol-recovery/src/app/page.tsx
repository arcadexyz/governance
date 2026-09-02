'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import Link from 'next/link';
import { LoanSection } from '@/components/LoanSection';
import { VaultSection } from '@/components/VaultSection';
import { ManualSection } from '@/components/ManualSection';

type Tab = 'loans' | 'vaults' | 'manual';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('loans');
  const { isConnected } = useAccount();

  return (
    <main className="min-h-screen">
      {/* Sunset Banner */}
      <div className="bg-arcade-pink/20 border-b border-arcade-pink/40 px-4 py-3">
        <p className="text-center text-sm text-gray-100">
          <span className="font-semibold text-arcade-pink">Arcade Protocol has sunset.</span>{' '}
          This is a legacy recovery tool for existing users.{' '}
          <a
            href="https://legacy.arcade.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-arcade-blue hover:text-arcade-mint underline font-medium"
          >
            Read the announcement
          </a>
        </p>
      </div>

      {/* Header */}
      <header className="border-b border-gray-800 bg-elv-5">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
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
                className="px-4 py-2 text-xl font-pixel uppercase tracking-wide text-white hover:text-arcade-mint transition-colors"
              >
                Recovery
              </Link>
              <Link
                href="/guide"
                className="px-4 py-2 text-xl font-pixel uppercase tracking-wide text-gray-400 hover:text-white transition-colors"
              >
                Guide
              </Link>
            </nav>
          </div>
          <ConnectButton />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-pixel uppercase tracking-wide text-white mb-2">
            Protocol Recovery
          </h1>
          <p className="text-gray-400 text-sm">
            Manage your loans and vaults after protocol sunset
          </p>
        </div>

        {/* Warning Banner */}
        <div className="arcade-card border-arcade-pink/30 bg-arcade-pink/5 p-4 mb-6">
          <p className="text-gray-200 text-sm">
            <span className="text-arcade-pink font-semibold">Important:</span> This is a recovery
            interface for the Arcade Protocol. Please verify all transactions carefully before
            confirming. Need help?{' '}
            <Link href="/guide" className="text-arcade-blue hover:text-arcade-mint underline">
              Read the guide
            </Link>
          </p>
        </div>

        {!isConnected ? (
          <div className="arcade-card p-8 text-center">
            <h2 className="text-xl font-pixel uppercase tracking-wide text-white mb-2">
              Connect Your Wallet
            </h2>
            <p className="text-gray-400 mb-6">
              Connect your wallet to view and manage your loans and vaults.
            </p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-0 mb-6 bg-elv-5 border border-gray-700">
              <button
                onClick={() => setActiveTab('loans')}
                className={`flex-1 py-3 px-4 text-sm font-pixel uppercase tracking-wide transition-colors ${
                  activeTab === 'loans'
                    ? 'bg-arcade-blue text-white'
                    : 'text-gray-400 hover:text-white hover:bg-elv-3'
                }`}
              >
                My Loans
              </button>
              <button
                onClick={() => setActiveTab('vaults')}
                className={`flex-1 py-3 px-4 text-sm font-pixel uppercase tracking-wide transition-colors border-l border-gray-700 ${
                  activeTab === 'vaults'
                    ? 'bg-arcade-blue text-white'
                    : 'text-gray-400 hover:text-white hover:bg-elv-3'
                }`}
              >
                My Vaults
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-3 px-4 text-sm font-pixel uppercase tracking-wide transition-colors border-l border-gray-700 ${
                  activeTab === 'manual'
                    ? 'bg-arcade-blue text-white'
                    : 'text-gray-400 hover:text-white hover:bg-elv-3'
                }`}
              >
                Manual
              </button>
            </div>

            {/* Tab Content */}
            <div className="arcade-card p-6">
              {activeTab === 'loans' && <LoanSection />}
              {activeTab === 'vaults' && <VaultSection />}
              {activeTab === 'manual' && <ManualSection />}
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
            <div>
              <p>
                V3 LoanCore:{' '}
                <code className="text-gray-400">0x89bc08BA00f135d608bc335f6B33D7a9ABCC98aF</code>
              </p>
              <p>
                V2 LoanCore:{' '}
                <code className="text-gray-400">0x81b2F8Fc75Bab64A6b144aa6d2fAa127B4Fa7fD9</code>
              </p>
            </div>
            <Link
              href="/guide"
              className="text-arcade-blue hover:text-arcade-mint transition-colors"
            >
              View Full Documentation
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
