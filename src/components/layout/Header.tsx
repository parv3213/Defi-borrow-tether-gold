'use client';

import { useSmartAccount } from '@/hooks/useSmartAccount';
import { truncateAddress } from '@/lib/format';
import { useLogout, usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';

export function Header() {
  const { user, authenticated } = usePrivy();
  const { logout } = useLogout();
  const { smartAccountAddress } = useSmartAccount();

  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🏦</span>
          <span className="text-xl font-bold text-white">DeFi Borrowing</span>
        </Link>

        {authenticated && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              {smartAccountAddress && (
                <p className="text-sm text-gray-400">
                  Smart Wallet:{' '}
                  <span className="text-white font-mono">
                    {truncateAddress(smartAccountAddress)}
                  </span>
                </p>
              )}
              {user?.email?.address && (
                <p className="text-xs text-gray-500">{user.email.address}</p>
              )}
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white border border-gray-600 hover:border-gray-500 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
