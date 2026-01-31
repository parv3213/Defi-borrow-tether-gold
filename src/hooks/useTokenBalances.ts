'use client';

import { getTokenBalances } from '@/services/tokens';
import { TokenBalance } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { Address } from 'viem';
import { useSmartAccount } from './useSmartAccount';

export function useTokenBalances() {
  const { smartAccountAddress } = useSmartAccount();

  const query = useQuery<TokenBalance[]>({
    queryKey: ['tokenBalances', smartAccountAddress],
    queryFn: () => getTokenBalances(smartAccountAddress as Address),
    enabled: !!smartAccountAddress,
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const usdt0Balance = query.data?.find(b => b.token.symbol === 'USDT0');
  const xaut0Balance = query.data?.find(b => b.token.symbol === 'XAUT0');

  return {
    ...query,
    usdt0Balance,
    xaut0Balance,
  };
}
