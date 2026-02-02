'use client';

import { ERC20_ABI } from '@/config/contracts';
import { TOKENS } from '@/config/tokens';
import { TransactionState } from '@/types';
import { useCallback, useState } from 'react';
import { Address, encodeFunctionData } from 'viem';
import { useSmartAccount } from './useSmartAccount';

interface WithdrawParams {
  token?: 'USDT0' | 'ETH';
  amount: bigint;
  to: Address;
}

export function useWithdraw() {
  const { sendTransaction } = useSmartAccount();
  const [txState, setTxState] = useState<TransactionState>({
    status: 'idle',
  });

  const withdraw = useCallback(
    async ({ token, amount, to }: WithdrawParams) => {
      setTxState({ status: 'pending' });

      try {
        const calls = [];

        if (token === 'ETH') {
          // Send ETH
          calls.push({
            to,
            data: '0x' as `0x${string}`,
            value: amount,
          });
        } else if (token === 'USDT0') {
          // Transfer USDT0
          const data = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [to, amount],
          });

          calls.push({
            to: TOKENS.USDT0.address,
            data,
            value: BigInt(0),
          });
        }

        const result = await sendTransaction(calls);

        setTxState({
          status: 'success',
          hash: result.hash,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
        setTxState({
          status: 'error',
          error: errorMessage,
        });
      }
    },
    [sendTransaction]
  );

  const resetState = useCallback(() => {
    setTxState({ status: 'idle' });
  }, []);

  return {
    withdraw,
    txState,
    resetState,
    isLoading: txState.status === 'pending' || txState.status === 'confirming',
  };
}
