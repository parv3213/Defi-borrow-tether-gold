'use client';

import { BorrowCard } from '@/components/borrow/BorrowCard';
import { PositionCard } from '@/components/borrow/PositionCard';
import { PositionHistoryCard } from '@/components/borrow/PositionHistoryCard';
import { RepayCard } from '@/components/borrow/RepayCard';
import { Header } from '@/components/layout/Header';
import { SwapCard } from '@/components/swap/SwapCard';
import { DepositAddress } from '@/components/wallet/DepositAddress';
import { WalletInfo } from '@/components/wallet/WalletInfo';
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { isGaslessEnabled } from '@/services/biconomy';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const gaslessEnabled = isGaslessEnabled();

export default function DashboardPage() {
  const { authenticated, ready } = usePrivy();
  const router = useRouter();
  const { isLoading: accountLoading, error: accountError } = useSmartAccount();

  // Redirect if not authenticated
  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/');
    }
  }, [ready, authenticated, router]);

  // Show loading while checking auth
  if (!ready || !authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Gasless mode notice */}
        {!gaslessEnabled && (
          <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <p className="text-yellow-400">
              <span className="font-semibold">⛽ Gas fees required:</span> Paymaster not configured.
              You&apos;ll need to deposit some ETH to your smart wallet for transaction fees.
            </p>
          </div>
        )}

        {/* Smart account loading state */}
        {accountLoading && (
          <div className="mb-6 bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent" />
            <p className="text-indigo-300">Setting up your smart wallet...</p>
          </div>
        )}

        {/* Smart account error */}
        {accountError && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400">
              Failed to initialize smart wallet: {accountError.message}
            </p>
          </div>
        )}

        {/* Dashboard grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left column - Wallet */}
          <div className="space-y-6">
            <WalletInfo />
            <DepositAddress />
          </div>

          {/* Middle column - Swap & Borrow */}
          <div className="space-y-6">
            <SwapCard />
            <BorrowCard />
          </div>

          {/* Right column - Position */}
          <div className="space-y-6">
            <PositionCard />
            <RepayCard />
            <PositionHistoryCard />
          </div>
        </div>

        {/* Info section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col gap-2 h-full min-h-[180px]">
            <h3 className="font-semibold text-white mb-2">💡 How it works</h3>
            <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
              <li>Deposit USDT0 to your smart wallet</li>
              <li>Swap USDT0 to XAUT0 (tokenized gold)</li>
              <li>Use XAUT0 as collateral to borrow USDT0</li>
              <li>Repay anytime to withdraw your gold</li>
            </ol>
          </div>

          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col gap-2 h-full min-h-[180px]">
            <h3 className="font-semibold text-white mb-2">
              {gaslessEnabled ? '✨ Gasless' : '⛽ Gas Required'}
            </h3>
            <p className="text-sm text-gray-400">
              {gaslessEnabled
                ? "All transactions are sponsored - you don't need ETH for gas fees. Transactions are batched for efficiency."
                : "Paymaster not configured. You'll need ETH in your smart wallet for gas fees. Deposit some ETH along with USDT0."}
            </p>
          </div>

          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col gap-2 h-full min-h-[180px]">
            <h3 className="font-semibold text-white mb-2">⚠️ Risks</h3>
            <p className="text-sm text-gray-400">
              If XAUT price drops significantly, your position may be liquidated. Keep your LTV
              below 67% to stay safe.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
