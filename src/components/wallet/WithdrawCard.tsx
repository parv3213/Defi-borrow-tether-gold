'use client';

import { TokenInput } from '@/components/shared/TokenAmount';
import { TransactionButton } from '@/components/shared/TransactionButton';
import { TOKENS } from '@/config/tokens';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { useWithdraw } from '@/hooks/useWithdraw';
import { parseTokenInput } from '@/lib/format';
import { useEffect, useState } from 'react';
import { Address, formatUnits, isAddress } from 'viem';

type WithdrawToken = 'USDT0' | 'ETH';

export function WithdrawCard() {
  const { usdt0Balance, ethBalance } = useTokenBalances();
  const { withdraw, txState, resetState, isLoading } = useWithdraw();

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedToken, setSelectedToken] = useState<WithdrawToken>('USDT0');
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');

  const token = selectedToken === 'ETH' ? TOKENS.WETH : TOKENS.USDT0;
  const parsedAmount = parseTokenInput(amount, token.decimals);
  const balance = selectedToken === 'ETH' ? ethBalance : usdt0Balance?.balance;
  const isValidAddress = isAddress(recipientAddress);

  // Reset on success
  useEffect(() => {
    if (txState.status === 'success') {
      setAmount('');
      setRecipientAddress('');
      const timeout = setTimeout(() => {
        resetState();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [txState.status, resetState]);

  const handleWithdraw = async () => {
    if (!parsedAmount || parsedAmount <= BigInt(0) || !isValidAddress) return;

    await withdraw({
      token: selectedToken,
      amount: parsedAmount,
      to: recipientAddress as Address,
    });
  };

  const handleMax = () => {
    if (balance && balance > BigInt(0)) {
      setAmount(formatUnits(balance, token.decimals));
    }
  };

  const insufficientBalance = parsedAmount && balance && parsedAmount > balance;

  const canWithdraw =
    !isLoading &&
    parsedAmount &&
    parsedAmount > BigInt(0) &&
    !insufficientBalance &&
    isValidAddress &&
    balance &&
    balance > BigInt(0);

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
      >
        <h2 className="text-lg font-semibold text-white">Withdraw to External Wallet</h2>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="px-6 pb-6 flex flex-col gap-4 border-t border-gray-700 pt-4">
          <p className="text-sm text-gray-400">
            Transfer USDT0 or ETH from your smart wallet to any external address.
          </p>

          {/* Token selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedToken('USDT0')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedToken === 'USDT0'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              USDT0
            </button>
            <button
              onClick={() => setSelectedToken('ETH')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedToken === 'ETH'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              ETH
            </button>
          </div>

          {/* Amount input */}
          <TokenInput
            value={amount}
            onChange={setAmount}
            token={token}
            balance={balance}
            onMax={handleMax}
            label={`Amount to withdraw`}
          />

          {/* Recipient address input */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Recipient Address</label>
            <input
              type="text"
              value={recipientAddress}
              onChange={e => setRecipientAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {recipientAddress && !isValidAddress && (
              <p className="text-sm text-red-400 mt-1">Invalid address</p>
            )}
          </div>

          {/* Error messages */}
          {insufficientBalance && (
            <p className="text-sm text-red-400">Insufficient {selectedToken} balance</p>
          )}

          {/* Action button */}
          <TransactionButton onClick={handleWithdraw} disabled={!canWithdraw} state={txState}>
            Withdraw {selectedToken}
          </TransactionButton>
        </div>
      )}
    </div>
  );
}
