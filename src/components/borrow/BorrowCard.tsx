'use client';

import { TokenInput } from '@/components/shared/TokenAmount';
import { TransactionButton } from '@/components/shared/TransactionButton';
import { SAFE_LTV, WARNING_LTV } from '@/config/morpho';
import { TOKENS } from '@/config/tokens';
import { useBorrow } from '@/hooks/useBorrow';
import { useMorphoMarket } from '@/hooks/useMorphoMarket';
import { useMorphoPosition } from '@/hooks/useMorphoPosition';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { formatPercent, formatTokenAmount, formatUSD, parseTokenInput } from '@/lib/format';
import { useEffect, useMemo, useState } from 'react';
import { formatUnits } from 'viem';

export function BorrowCard() {
  const { xaut0Balance } = useTokenBalances();
  const { data: position } = useMorphoPosition();
  const { data: market } = useMorphoMarket();
  const { borrow, txState, resetState, isLoading } = useBorrow();

  const [collateralInput, setCollateralInput] = useState('');
  const [borrowInput, setBorrowInput] = useState('');

  // Parse inputs
  const collateralAmount = parseTokenInput(collateralInput, TOKENS.XAUT0.decimals);
  const borrowAmount = parseTokenInput(borrowInput, TOKENS.USDT0.decimals);

  // Calculate projected position
  const projectedLTV = useMemo(() => {
    if (!market || !collateralAmount || collateralAmount === BigInt(0)) return 0;

    const currentCollateral = position?.collateral || BigInt(0);
    const currentBorrowed = position?.borrowedAssets || BigInt(0);

    // Total collateral after adding
    const totalCollateral = currentCollateral + collateralAmount;
    const totalBorrowed = currentBorrowed + (borrowAmount || BigInt(0));

    // Collateral value (using oracle price)
    const collateralValue = (totalCollateral * market.oraclePrice) / BigInt(10 ** 36);

    if (collateralValue === BigInt(0)) return 0;
    return Number(totalBorrowed) / Number(collateralValue);
  }, [market, collateralAmount, borrowAmount, position]);

  // Calculate max borrow based on collateral
  const maxBorrowAmount = useMemo(() => {
    if (!market || !collateralAmount || collateralAmount === BigInt(0)) return BigInt(0);

    const currentCollateral = position?.collateral || BigInt(0);
    const totalCollateral = currentCollateral + collateralAmount;

    // Collateral value
    const collateralValue = (totalCollateral * market.oraclePrice) / BigInt(10 ** 36);

    // Max borrow at LLTV
    const maxAtLLTV = (collateralValue * BigInt(Math.floor(market.lltv * 1e18))) / BigInt(1e18);

    // Subtract existing debt
    const currentBorrowed = position?.borrowedAssets || BigInt(0);
    if (maxAtLLTV <= currentBorrowed) return BigInt(0);

    return maxAtLLTV - currentBorrowed;
  }, [market, collateralAmount, position]);

  // Safe borrow suggestion (67% LTV)
  const safeBorrowAmount = useMemo(() => {
    if (!market || !collateralAmount || collateralAmount === BigInt(0)) return BigInt(0);

    const currentCollateral = position?.collateral || BigInt(0);
    const totalCollateral = currentCollateral + collateralAmount;

    const collateralValue = (totalCollateral * market.oraclePrice) / BigInt(10 ** 36);
    const safeMax = (collateralValue * BigInt(Math.floor(SAFE_LTV * 1e18))) / BigInt(1e18);

    const currentBorrowed = position?.borrowedAssets || BigInt(0);
    if (safeMax <= currentBorrowed) return BigInt(0);

    return safeMax - currentBorrowed;
  }, [market, collateralAmount, position]);

  // Projected collateral USD value (using oracle price)
  const projectedCollateralValue = useMemo(() => {
    if (!market || !collateralAmount || collateralAmount === BigInt(0)) {
      return BigInt(0);
    }

    // collateralValue scaled by oracle: (tokens * oracle) / 10**36
    return (collateralAmount * market.oraclePrice) / BigInt(10 ** 36);
  }, [market, collateralAmount]);

  // Reset on success
  useEffect(() => {
    if (txState.status === 'success') {
      setCollateralInput('');
      setBorrowInput('');
      const timeout = setTimeout(() => {
        resetState();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [txState.status, resetState]);

  // Auto-fill borrow input when collateral input changes to suggested safe amount
  useEffect(() => {
    if (safeBorrowAmount > BigInt(0)) {
      setBorrowInput(formatUnits(safeBorrowAmount, TOKENS.USDT0.decimals));
    } else {
      setBorrowInput('');
    }
    // We intentionally watch collateral input and safeBorrowAmount so
    // the borrow value updates when the user changes collateral.
  }, [collateralInput, safeBorrowAmount]);

  const handleBorrow = async () => {
    if (!collateralAmount || collateralAmount === BigInt(0)) return;

    await borrow({
      collateralAmount,
      borrowAmount: borrowAmount || BigInt(0),
    });
  };

  const handleMaxCollateral = () => {
    if (xaut0Balance?.balance) {
      setCollateralInput(formatUnits(xaut0Balance.balance, TOKENS.XAUT0.decimals));
    }
  };

  const handleSafeBorrow = () => {
    if (safeBorrowAmount > BigInt(0)) {
      setBorrowInput(formatUnits(safeBorrowAmount, TOKENS.USDT0.decimals));
    }
  };

  // Validation
  const hasInsufficientCollateral = Boolean(
    collateralAmount && xaut0Balance?.balance && collateralAmount > xaut0Balance.balance
  );
  const exceedsMaxBorrow = Boolean(borrowAmount && borrowAmount > maxBorrowAmount);
  const isLTVWarning = Boolean(projectedLTV > WARNING_LTV);
  const isLTVDanger = Boolean(projectedLTV > (market?.lltv || 0.77));

  const canBorrow = Boolean(
    collateralAmount &&
    collateralAmount > BigInt(0) &&
    !hasInsufficientCollateral &&
    !exceedsMaxBorrow &&
    !isLoading
  );

  // LTV color
  const getLTVColor = () => {
    if (isLTVDanger) return 'text-red-400';
    if (isLTVWarning) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-white mb-4">Supply & Borrow</h2>

      <div className="space-y-4 flex-1 flex flex-col">
        {/* Collateral input */}
        <TokenInput
          value={collateralInput}
          onChange={setCollateralInput}
          token={TOKENS.XAUT0}
          balance={xaut0Balance?.balance}
          disabled={isLoading}
          label="Collateral (XAUT0)"
          onMax={handleMaxCollateral}
        />

        {/* Borrow input */}
        <div className="space-y-2">
          <TokenInput
            value={borrowInput}
            onChange={setBorrowInput}
            token={TOKENS.USDT0}
            disabled={isLoading || !collateralAmount || collateralAmount === BigInt(0)}
            label="Borrow (USDT0)"
          />
          {safeBorrowAmount > BigInt(0) && (
            <button
              onClick={handleSafeBorrow}
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              Suggested safe amount: {formatTokenAmount(safeBorrowAmount, TOKENS.USDT0.decimals)}{' '}
              USDT0
            </button>
          )}
        </div>

        {/* Position preview */}
        {collateralAmount && Boolean(collateralAmount > BigInt(0)) ? (
          <div className="bg-gray-900 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Projected LTV</span>
              <span className={getLTVColor()}>{formatPercent(projectedLTV)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Max LTV (Liquidation)</span>
              <span className="text-gray-300">{market ? formatPercent(market.lltv) : '-'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Collateral Value</span>
              <span className="text-gray-300">
                {market ? formatUSD(projectedCollateralValue) : '-'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Max Borrow</span>
              <span className="text-gray-300">
                {formatTokenAmount(maxBorrowAmount, TOKENS.USDT0.decimals)} USDT0
              </span>
            </div>
            {market && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Borrow APR</span>
                <span className="text-gray-300">{formatPercent(market.borrowApr)}</span>
              </div>
            )}

            {market && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Pool Liquidity</span>
                <span className="text-gray-300">
                  {formatTokenAmount(market.availableLiquidity, TOKENS.USDT0.decimals)} USDT0
                </span>
              </div>
            )}

            {/* LTV bar */}
            <div className="pt-2">
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isLTVDanger ? 'bg-red-500' : isLTVWarning ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{
                    width: `${Math.min(projectedLTV * 100, 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span className="text-yellow-500">67% Safe</span>
                <span className="text-red-500">77% Max</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Error messages */}
        {hasInsufficientCollateral && (
          <p className="text-sm text-red-400">Insufficient XAUT0 balance</p>
        )}
        {exceedsMaxBorrow && (
          <p className="text-sm text-red-400">Borrow amount exceeds maximum LTV</p>
        )}
        {isLTVWarning && !isLTVDanger && (
          <p className="text-sm text-yellow-400">
            ⚠️ High LTV - Risk of liquidation if XAUT price drops
          </p>
        )}
        {isLTVDanger && (
          <p className="text-sm text-red-400">❌ LTV exceeds liquidation threshold</p>
        )}

        {/* Submit button */}
        <div className="mt-auto">
          <TransactionButton onClick={handleBorrow} state={txState} disabled={!canBorrow}>
            {borrowAmount && borrowAmount > BigInt(0)
              ? 'Supply Collateral & Borrow'
              : 'Supply Collateral'}
          </TransactionButton>
        </div>
      </div>
    </div>
  );
}
