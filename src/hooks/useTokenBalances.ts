'use client';

import { getETHBalance, getTokenBalances } from '@/services/tokens';
import { TokenBalance } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { Address } from 'viem';
import { useSmartAccount } from './useSmartAccount';

export function useTokenBalances() {
  const { smartAccountAddress } = useSmartAccount();

  const tokenQuery = useQuery<TokenBalance[]>({
    queryKey: ['tokenBalances', smartAccountAddress],
    queryFn: () => getTokenBalances(smartAccountAddress as Address),
    enabled: !!smartAccountAddress,
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const ethQuery = useQuery<bigint>({
    queryKey: ['ethBalance', smartAccountAddress],
    queryFn: () => getETHBalance(smartAccountAddress as Address),
    enabled: !!smartAccountAddress,
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const usdt0Balance = tokenQuery.data?.find(b => b.token.symbol === 'USDT0');
  const xaut0Balance = tokenQuery.data?.find(b => b.token.symbol === 'XAUT0');

  return {
    ...tokenQuery,
    usdt0Balance,
    xaut0Balance,
    ethBalance: ethQuery.data,
    isLoadingEth: ethQuery.isLoading,
  };
}
