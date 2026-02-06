'use client';

import { TokenInput } from '@/components/shared/TokenAmount';
import { TransactionButton } from '@/components/shared/TransactionButton';
import { TOKENS } from '@/config/tokens';
import { useSwap } from '@/hooks/useSwap';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { formatTokenAmount, parseTokenInput } from '@/lib/format';
import { estimateSwapOutput } from '@/services/swap';
import { useEffect, useState } from 'react';
import { formatUnits } from 'viem';

export function SwapCard() {
  const { usdt0Balance, xaut0Balance } = useTokenBalances();
  const { swap, txState, resetState, isLoading } = useSwap();

  const [direction, setDirection] = useState<'USDT0_TO_XAUT0' | 'XAUT0_TO_USDT0'>('USDT0_TO_XAUT0');
  const [amountIn, setAmountIn] = useState('');
  const [estimatedOut, setEstimatedOut] = useState<bigint>(BigInt(0));
  const [slippage, setSlippage] = useState(0.5); // 0.5%

  const tokenIn = direction === 'USDT0_TO_XAUT0' ? TOKENS.USDT0 : TOKENS.XAUT0;
  const tokenOut = direction === 'USDT0_TO_XAUT0' ? TOKENS.XAUT0 : TOKENS.USDT0;
  const balanceIn = direction === 'USDT0_TO_XAUT0' ? usdt0Balance?.balance : xaut0Balance?.balance;

  // Estimate output when input changes
  useEffect(() => {
    const estimate = async () => {
      const parsed = parseTokenInput(amountIn, tokenIn.decimals);
      if (!parsed || parsed === BigInt(0)) {
        setEstimatedOut(BigInt(0));
        return;
      }

      try {
        const output = await estimateSwapOutput(tokenIn.address, tokenOut.address, parsed);
        setEstimatedOut(output);
      } catch (error) {
        console.error('Failed to estimate:', error);
        setEstimatedOut(BigInt(0));
      }
    };

    estimate();
  }, [amountIn, direction, tokenIn, tokenOut]);

  // Reset state when direction or success
  useEffect(() => {
    if (txState.status === 'success') {
      setAmountIn('');
      setEstimatedOut(BigInt(0));
      // Reset after showing success for a moment
      const timeout = setTimeout(() => {
        resetState();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [txState.status, resetState]);

  const handleAmountChange = (value: string) => {
    if (txState.status === 'success' || txState.status === 'error') {
      setEstimatedOut(BigInt(0));
      resetState();
    }
    setAmountIn(value);
  };

  const handleSwap = async () => {
    const parsed = parseTokenInput(amountIn, tokenIn.decimals);
    if (!parsed || parsed === BigInt(0)) return;

    await swap({
      amountIn: parsed,
      estimatedAmountOut: estimatedOut,
      slippage: slippage / 100,
      direction,
    });
  };

  const handleFlipDirection = () => {
    setDirection(prev => (prev === 'USDT0_TO_XAUT0' ? 'XAUT0_TO_USDT0' : 'USDT0_TO_XAUT0'));
    setAmountIn('');
    setEstimatedOut(BigInt(0));
    resetState();
  };

  const handleMax = () => {
    if (balanceIn) {
      setAmountIn(formatUnits(balanceIn, tokenIn.decimals));
    }
  };

  const parsedAmount = parseTokenInput(amountIn, tokenIn.decimals);
  // Treat missing balances or parsed amounts larger than the balance as insufficient
  const hasInsufficientBalance = Boolean(parsedAmount && (!balanceIn || parsedAmount > balanceIn));
  const canSwap = Boolean(
    parsedAmount && parsedAmount > BigInt(0) && !hasInsufficientBalance && !isLoading
  );

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Swap</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Slippage:</span>
            <select
              value={slippage}
              onChange={e => setSlippage(Number(e.target.value))}
              className="bg-gray-700 text-white text-sm rounded px-2 py-1 outline-none"
            >
              <option value={0.5}>0.5%</option>
              <option value={1}>1%</option>
              <option value={2}>2%</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4 min-w-0">
        {/* Input */}
        <TokenInput
          value={amountIn}
          onChange={handleAmountChange}
          token={tokenIn}
          balance={balanceIn}
          disabled={isLoading}
          label="You pay"
          onMax={handleMax}
        />

        {/* Swap direction button */}
        <div className="flex justify-center">
          <button
            onClick={handleFlipDirection}
            disabled={isLoading}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors disabled:opacity-50"
          >
            <svg
              className="w-5 h-5 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </button>
        </div>

        {/* Output */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
          <label className="block text-sm font-medium text-gray-400 mb-2">You receive</label>
          <div className="flex items-center gap-4">
            <span className="flex-1 text-2xl text-white">
              {estimatedOut > BigInt(0)
                ? formatTokenAmount(estimatedOut, tokenOut.decimals, 6)
                : '0.00'}
            </span>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 rounded-lg">
              <span className="font-semibold text-white">{tokenOut.symbol}</span>
            </div>
          </div>
        </div>

        {/* Error message */}
        {hasInsufficientBalance && (
          <p className="text-sm text-red-400">Insufficient {tokenIn.symbol} balance</p>
        )}

        {/* Route info */}
        {estimatedOut > BigInt(0) && (
          <div className="text-sm text-gray-400 flex items-center gap-1">
            <span>Route:</span>
            <span className="text-gray-300">
              {tokenIn.symbol} → {tokenOut.symbol}
            </span>
          </div>
        )}

        {/* Swap button */}
        <TransactionButton onClick={handleSwap} state={txState} disabled={!canSwap}>
          {hasInsufficientBalance
            ? `Insufficient ${tokenIn.symbol}`
            : `Swap ${tokenIn.symbol} to ${tokenOut.symbol}`}
        </TransactionButton>
      </div>
    </div>
  );
}
