"use client";

import { classifyError } from "@/lib/errors";
import {
    buildSwapUSDT0ToXAUT0Calls,
    buildSwapXAUT0ToUSDT0Calls,
    calculateMinAmountOut,
    DEFAULT_SLIPPAGE,
} from "@/services/swap";
import { TransactionState } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Address } from "viem";
import { useSmartAccount } from "./useSmartAccount";

interface SwapParams {
    amountIn: bigint;
    estimatedAmountOut: bigint;
    slippage?: number;
    direction: "USDT0_TO_XAUT0" | "XAUT0_TO_USDT0";
}

export function useSwap() {
  const { smartAccountAddress, sendTransaction } = useSmartAccount();
  const queryClient = useQueryClient();
  const [txState, setTxState] = useState<TransactionState>({ status: "idle" });

  const mutation = useMutation({
    mutationFn: async (params: SwapParams) => {
      if (!smartAccountAddress) {
        throw new Error("Smart account not initialized");
      }

      const slippage = params.slippage ?? DEFAULT_SLIPPAGE;
      const amountOutMinimum = calculateMinAmountOut(
        params.estimatedAmountOut,
        slippage
      );

      let calls;
      if (params.direction === "USDT0_TO_XAUT0") {
        calls = buildSwapUSDT0ToXAUT0Calls(params.amountIn, amountOutMinimum, smartAccountAddress as Address);
      } else {
        calls = buildSwapXAUT0ToUSDT0Calls(params.amountIn, amountOutMinimum, smartAccountAddress as Address);
      }

      const result = await sendTransaction(calls);
      return result;
    },
    onMutate: () => {
      setTxState({ status: "pending" });
    },
    onSuccess: (data) => {
      setTxState({ status: "success", hash: data.hash });
      // Invalidate balance queries
      queryClient.invalidateQueries({ queryKey: ["tokenBalances"] });
    },
    onError: (error) => {
      const classified = classifyError(error);
      setTxState({ status: "error", error: classified.message });
    },
  });

  const swap = useCallback(
    async (params: SwapParams) => {
      return mutation.mutateAsync(params);
    },
    [mutation]
  );

  const resetState = useCallback(() => {
    setTxState({ status: "idle" });
    mutation.reset();
  }, [mutation]);

  return {
    swap,
    txState,
    resetState,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
