'use client';

import { formatTokenAmount } from '@/lib/format';
import { TokenInfo } from '@/types';
import clsx from 'clsx';

interface TokenAmountProps {
  amount: bigint;
  token: TokenInfo;
  className?: string;
  showSymbol?: boolean;
  maxDecimals?: number;
}

export function TokenAmount({
  amount,
  token,
  className,
  showSymbol = true,
  maxDecimals = 4,
}: TokenAmountProps) {
  const formatted = formatTokenAmount(amount, token.decimals, maxDecimals);

  return (
    <span className={clsx('font-mono', className)}>
      {formatted}
      {showSymbol && <span className="ml-1 text-gray-400">{token.symbol}</span>}
    </span>
  );
}

interface TokenInputProps {
  value: string;
  onChange: (value: string) => void;
  token: TokenInfo;
  balance?: bigint;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  onMax?: () => void;
}

export function TokenInput({
  value,
  onChange,
  token,
  balance,
  disabled,
  placeholder = '0.00',
  label,
  onMax,
}: TokenInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty, numbers, and single decimal point
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      onChange(val);
    }
  };

  return (
    <div className="space-y-2 min-w-0">
      {label && <label className="block text-sm font-medium text-gray-400">{label}</label>}
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 focus-within:border-indigo-500 transition-colors min-w-0">
        <div className="flex items-center gap-4">
          <input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={handleChange}
            disabled={disabled}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-2xl text-white placeholder-gray-600 outline-none disabled:text-gray-500 min-w-0"
          />
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 rounded-lg">
            <span className="font-semibold text-white">{token.symbol}</span>
          </div>
        </div>
        {balance !== undefined && (
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-gray-500">
              Balance:{' '}
              <TokenAmount
                amount={balance}
                token={token}
                className="text-gray-400"
                maxDecimals={5}
              />
            </span>
            {onMax && (
              <button onClick={onMax} className="text-indigo-400 hover:text-indigo-300 font-medium">
                MAX
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
