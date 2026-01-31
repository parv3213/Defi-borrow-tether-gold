'use client';

import { SAFE_LTV, WARNING_LTV } from '@/config/morpho';
import { TOKENS } from '@/config/tokens';
import { useMorphoMarket } from '@/hooks/useMorphoMarket';
import { useMorphoPosition } from '@/hooks/useMorphoPosition';
import { formatHealthFactor, formatPercent, formatTokenAmount } from '@/lib/format';

export function PositionCard() {
  const { data: position, isLoading: positionLoading } = useMorphoPosition();
  const { data: market, isLoading: marketLoading } = useMorphoMarket();

  const isLoading = positionLoading || marketLoading;

  // Check if user has any position
  const hasPosition =
    position && (position.collateral > BigInt(0) || position.borrowedAssets > BigInt(0));

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!hasPosition) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Your Position</h2>
        <div className="text-center py-8">
          <p className="text-gray-400">No active borrowing position</p>
          <p className="text-sm text-gray-500 mt-2">
            Supply XAUT0 as collateral and borrow USDT0 to get started
          </p>
        </div>
      </div>
    );
  }

  const ltv = position.ltv;
  const healthFactor = position.healthFactor;
  const isHealthy = healthFactor > 1.1;
  const isWarning = healthFactor <= 1.3 && healthFactor > 1.1;
  const isDanger = healthFactor <= 1.1;

  const getHealthColor = () => {
    if (isDanger) return 'text-red-400';
    if (isWarning) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getLTVColor = () => {
    if (ltv > (market?.lltv || 0.77)) return 'text-red-400';
    if (ltv > WARNING_LTV) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h2 className="text-lg font-semibold text-white mb-4">Your Position</h2>

      <div className="space-y-6">
        {/* Health indicator */}
        <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
          <div>
            <p className="text-sm text-gray-400">Health Factor</p>
            <p className={`text-2xl font-bold ${getHealthColor()}`}>
              {formatHealthFactor(healthFactor)}
            </p>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              isDanger
                ? 'bg-red-500/20 text-red-400'
                : isWarning
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-green-500/20 text-green-400'
            }`}
          >
            {isDanger ? 'At Risk' : isWarning ? 'Warning' : 'Healthy'}
          </div>
        </div>

        {/* Position details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Collateral</p>
            <p className="text-lg font-semibold text-white">
              {formatTokenAmount(position.collateral, TOKENS.XAUT0.decimals, 6)}
            </p>
            <p className="text-xs text-gray-500">XAUT0</p>
          </div>

          <div className="bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Debt</p>
            <p className="text-lg font-semibold text-white">
              {formatTokenAmount(position.borrowedAssets, TOKENS.USDT0.decimals)}
            </p>
            <p className="text-xs text-gray-500">USDT0</p>
          </div>
        </div>

        {/* LTV */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Loan-to-Value</span>
            <span className={getLTVColor()}>{formatPercent(ltv)}</span>
          </div>
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden relative">
            {/* Safe zone marker */}
            <div
              className="absolute h-full w-px bg-yellow-500"
              style={{ left: `${SAFE_LTV * 100}%` }}
            />
            {/* Max LTV marker */}
            <div
              className="absolute h-full w-px bg-red-500"
              style={{ left: `${(market?.lltv || 0.77) * 100}%` }}
            />
            {/* Current LTV bar */}
            <div
              className={`h-full transition-all ${
                isDanger ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(ltv * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span className="text-yellow-500">67%</span>
            <span className="text-red-500">
              {market ? `${(market.lltv * 100).toFixed(0)}%` : '77%'}
            </span>
          </div>
        </div>

        {/* Market info */}
        <div className="pt-4 border-t border-gray-700 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Borrow APR</span>
            <span className="text-gray-300">{market ? formatPercent(market.borrowApr) : '-'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Available Liquidity</span>
            <span className="text-gray-300">
              {market ? `${formatTokenAmount(market.availableLiquidity, 6)} USDT0` : '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
