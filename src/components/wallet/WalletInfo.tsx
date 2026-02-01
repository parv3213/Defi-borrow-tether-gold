'use client';

import { TokenAmount } from '@/components/shared/TokenAmount';
import { TOKENS } from '@/config/tokens';
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { getArbiscanAddressUrl, truncateAddress } from '@/lib/format';

export function WalletInfo() {
  const { smartAccountAddress, isLoading: accountLoading } = useSmartAccount();
  const {
    usdt0Balance,
    xaut0Balance,
    ethBalance,
    isLoading: balancesLoading,
    isLoadingEth,
  } = useTokenBalances();

  if (accountLoading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="h-8 bg-gray-700 rounded w-2/3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!smartAccountAddress) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h2 className="text-lg font-semibold text-white mb-4">Your Wallet</h2>

      <div className="space-y-4">
        {/* Smart Account Address */}
        <div>
          <p className="text-sm text-gray-400 mb-1">Smart Account</p>
          <a
            href={getArbiscanAddressUrl(smartAccountAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {truncateAddress(smartAccountAddress, 6)}
          </a>
        </div>

        {/* Balances */}
        <div className="pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400 mb-3">Token Balances</p>
          <div className="space-y-3">
            {balancesLoading || isLoadingEth ? (
              <div className="animate-pulse space-y-2">
                <div className="h-6 bg-gray-700 rounded w-1/2"></div>
                <div className="h-6 bg-gray-700 rounded w-1/2"></div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">ETH</span>
                  <span className="text-white font-mono">
                    {ethBalance ? (
                      <TokenAmount amount={ethBalance} token={TOKENS.WETH} showSymbol={false} />
                    ) : (
                      '0.00'
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">USDT0</span>
                  <span className="text-white font-mono">
                    {usdt0Balance ? (
                      <TokenAmount
                        amount={usdt0Balance.balance}
                        token={TOKENS.USDT0}
                        showSymbol={false}
                      />
                    ) : (
                      '0.00'
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">XAUT0</span>
                  <span className="text-white font-mono">
                    {xaut0Balance ? (
                      <TokenAmount
                        amount={xaut0Balance.balance}
                        token={TOKENS.XAUT0}
                        showSymbol={false}
                        maxDecimals={6}
                      />
                    ) : (
                      '0.000000'
                    )}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Network */}
        <div className="pt-4 border-t border-gray-700">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-sm text-gray-400">Arbitrum One</span>
          </div>
        </div>
      </div>
    </div>
  );
}
