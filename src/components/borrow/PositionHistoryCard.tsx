'use client';

import { TOKENS } from '@/config/tokens';
import { usePositionHistory } from '@/hooks/usePositionHistory';
import { formatTokenAmount } from '@/lib/format';
import { PositionTransaction, PositionTransactionType } from '@/types';
import { useState } from 'react';

// Transaction type display config
const TX_CONFIG: Record<
  PositionTransactionType,
  { label: string; icon: string; color: string; token: 'XAUT0' | 'USDT0' }
> = {
  MarketSupplyCollateral: {
    label: 'Supply Collateral',
    icon: '↓',
    color: 'text-green-400',
    token: 'XAUT0',
  },
  MarketWithdrawCollateral: {
    label: 'Withdraw Collateral',
    icon: '↑',
    color: 'text-orange-400',
    token: 'XAUT0',
  },
  MarketBorrow: {
    label: 'Borrow',
    icon: '💵',
    color: 'text-blue-400',
    token: 'USDT0',
  },
  MarketRepay: {
    label: 'Repay',
    icon: '✓',
    color: 'text-purple-400',
    token: 'USDT0',
  },
  MarketLiquidation: {
    label: 'Liquidation',
    icon: '⚠',
    color: 'text-red-400',
    token: 'XAUT0',
  },
  MarketSupply: {
    label: 'Supply',
    icon: '➕',
    color: 'text-emerald-400',
    token: 'USDT0',
  },
  MarketWithdraw: {
    label: 'Withdraw',
    icon: '➖',
    color: 'text-rose-400',
    token: 'USDT0',
  },
};

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function TransactionRow({ tx }: { tx: PositionTransaction }) {
  const config = TX_CONFIG[tx.type];
  const token = config.token === 'XAUT0' ? TOKENS.XAUT0 : TOKENS.USDT0;
  const explorerUrl = `https://arbiscan.io/tx/${tx.hash}`;

  return (
    <a
      href={explorerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between py-3 px-4 hover:bg-gray-700/50 rounded-lg transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${config.color} bg-gray-700`}
        >
          {config.icon}
        </div>
        <div>
          <p className={`font-medium ${config.color}`}>{config.label}</p>
          <p className="text-xs text-gray-500">{formatDate(tx.timestamp)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className="text-white font-medium">
            {formatTokenAmount(tx.assets, token.decimals, config.token === 'XAUT0' ? 6 : 4)}
          </p>
          <p className="text-xs text-gray-500">{config.token}</p>
        </div>
        <svg
          className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </div>
    </a>
  );
}

export function PositionHistoryCard() {
  const { data: transactions, isLoading, error } = usePositionHistory();
  const [isExpanded, setIsExpanded] = useState(false);

  const hasTransactions = transactions && transactions.length > 0;

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-indigo-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="text-left">
            <h2 className="text-lg font-semibold text-white">Position History</h2>
            <p className="text-sm text-gray-400">
              {isLoading
                ? 'Loading...'
                : hasTransactions
                  ? `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`
                  : 'No transactions yet'}
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable content */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-gray-700">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-700 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-700 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-gray-700 rounded w-1/4" />
                  </div>
                  <div className="h-4 bg-gray-700 rounded w-16" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <p className="text-red-400 text-sm">Failed to load transaction history</p>
            </div>
          ) : !hasTransactions ? (
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-6 h-6 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-gray-400">No transactions yet</p>
              <p className="text-sm text-gray-500 mt-1">Your borrowing activity will appear here</p>
            </div>
          ) : (
            <div className="max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              <div className="p-2 space-y-1">
                {transactions.map(tx => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
