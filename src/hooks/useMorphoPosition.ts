'use client';

import { getPosition } from '@/services/morpho';
import { MorphoPosition } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { Address } from 'viem';
import { useSmartAccount } from './useSmartAccount';

export function useMorphoPosition() {
  const { smartAccountAddress } = useSmartAccount();

  return useQuery<MorphoPosition>({
    queryKey: ['morphoPosition', smartAccountAddress],
    queryFn: async () => {
      if (!smartAccountAddress) {
        throw new Error('No smart account address');
      }
      return await getPosition(smartAccountAddress as Address);
    },
    enabled: !!smartAccountAddress,
    refetchInterval: 15000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
