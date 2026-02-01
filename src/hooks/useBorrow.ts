'use client';

import { classifyError } from '@/lib/errors';
import { buildSupplyAndBorrowCalls } from '@/services/morpho';
import { TransactionState } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Address } from 'viem';
import { useSmartAccount } from './useSmartAccount';

interface BorrowParams {
  collateralAmount: bigint;
  borrowAmount: bigint;
}

export function useBorrow() {
  const { smartAccountAddress, sendTransaction } = useSmartAccount();
  const queryClient = useQueryClient();
  const [txState, setTxState] = useState<TransactionState>({ status: 'idle' });

  const mutation = useMutation({
    mutationFn: async (params: BorrowParams) => {
      if (!smartAccountAddress) {
        throw new Error('Smart account not initialized');
      }

      const calls = await buildSupplyAndBorrowCalls(
        params.collateralAmount,
        params.borrowAmount,
        smartAccountAddress as Address
      );

      // Update state to confirming once transaction is sent
      setTxState({ status: 'confirming' });

      const result = await sendTransaction(calls);
      return result;
    },
    onMutate: () => {
      setTxState({ status: 'pending' });
    },
    onSuccess: data => {
      setTxState({ status: 'success', hash: data.hash });
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['tokenBalances'] });
      queryClient.invalidateQueries({ queryKey: ['morphoPosition'] });
    },
    onError: error => {
      const classified = classifyError(error);
      setTxState({ status: 'error', error: classified.message });
    },
  });

  const borrow = useCallback(
    async (params: BorrowParams) => {
      return mutation.mutateAsync(params);
    },
    [mutation]
  );

  const resetState = useCallback(() => {
    setTxState({ status: 'idle' });
    mutation.reset();
  }, [mutation]);

  return {
    borrow,
    txState,
    resetState,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
