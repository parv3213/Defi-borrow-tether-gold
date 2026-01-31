'use client';

import { usePrivy } from '@privy-io/react-auth';

export function LoginCard() {
  const { login, ready, authenticated } = usePrivy();

  if (!ready) {
    return (
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md shadow-xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-3/4 mx-auto"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2 mx-auto"></div>
          <div className="h-12 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (authenticated) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md shadow-xl border border-gray-700">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">DeFi Borrowing</h1>
        <p className="text-gray-400">
          Deposit USDT, swap to XAUT, and borrow against your gold holdings
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-white">How it works</h2>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold">1.</span>
              Sign up with your email
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold">2.</span>
              Deposit USDT0 to your smart wallet
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold">3.</span>
              Swap USDT0 to XAUT0 (tokenized gold)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold">4.</span>
              Use XAUT0 as collateral to borrow USDT0
            </li>
          </ul>
        </div>

        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
          <p className="text-sm text-indigo-300">
            <span className="font-semibold">✨ Gasless transactions</span>
            <br />
            All transactions are sponsored - no ETH needed for gas!
          </p>
        </div>

        <button
          onClick={login}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
        >
          Sign in with Email
        </button>
      </div>
    </div>
  );
}
