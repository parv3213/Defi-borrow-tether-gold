'use client';

import { classifyError } from '@/lib/errors';
import {
  buildRepayAssetsCalls,
  buildRepayFullCalls,
  buildWithdrawCollateralCalls,
} from '@/services/morpho';
import { TransactionState } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Address } from 'viem';
import { useSmartAccount } from './useSmartAccount';

interface RepayParams {
  repayAmount: bigint;
  repayFull?: boolean;
}

interface WithdrawParams {
  withdrawAmount: bigint;
}

export function useRepay() {
  const { smartAccountAddress, sendTransaction } = useSmartAccount();
  const queryClient = useQueryClient();
  const [txState, setTxState] = useState<TransactionState>({ status: 'idle' });

  const repayMutation = useMutation({
    mutationFn: async (params: RepayParams) => {
      if (!smartAccountAddress) {
        throw new Error('Smart account not initialized');
      }

      let calls;
      if (params.repayFull) {
        calls = await buildRepayFullCalls(smartAccountAddress as Address);
      } else {
        calls = await buildRepayAssetsCalls(params.repayAmount, smartAccountAddress as Address);
      }

      if (calls.length === 0) {
        throw new Error('No debt to repay');
      }

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
      queryClient.invalidateQueries({ queryKey: ['tokenBalances'] });
      queryClient.invalidateQueries({ queryKey: ['morphoPosition'] });
    },
    onError: error => {
      const classified = classifyError(error);
      setTxState({ status: 'error', error: classified.message });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (params: WithdrawParams) => {
      if (!smartAccountAddress) {
        throw new Error('Smart account not initialized');
      }

      const calls = await buildWithdrawCollateralCalls(
        params.withdrawAmount,
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
      queryClient.invalidateQueries({ queryKey: ['tokenBalances'] });
      queryClient.invalidateQueries({ queryKey: ['morphoPosition'] });
    },
    onError: error => {
      const classified = classifyError(error);
      setTxState({ status: 'error', error: classified.message });
    },
  });

  const repay = useCallback(
    async (params: RepayParams) => {
      return repayMutation.mutateAsync(params);
    },
    [repayMutation]
  );

  const withdraw = useCallback(
    async (params: WithdrawParams) => {
      return withdrawMutation.mutateAsync(params);
    },
    [withdrawMutation]
  );

  const resetState = useCallback(() => {
    setTxState({ status: 'idle' });
    repayMutation.reset();
    withdrawMutation.reset();
  }, [repayMutation, withdrawMutation]);

  return {
    repay,
    withdraw,
    txState,
    resetState,
    isLoading: repayMutation.isPending || withdrawMutation.isPending,
    error: repayMutation.error || withdrawMutation.error,
  };
}
