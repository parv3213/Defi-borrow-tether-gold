'use client';

import { MARKET_ID } from '@/config/morpho';
import { fetchUserPositionFromAPI } from '@/services/graphql';
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

      // Try on-chain data first (more accurate)
      try {
        return await getPosition(smartAccountAddress as Address);
      } catch (error) {
        console.warn('On-chain position fetch failed, trying API:', error);

        // Fallback to GraphQL API
        const apiPosition = await fetchUserPositionFromAPI(MARKET_ID, smartAccountAddress);

        if (!apiPosition) {
          // Return empty position
          return {
            supplyShares: BigInt(0),
            borrowShares: BigInt(0),
            collateral: BigInt(0),
            collateralValue: BigInt(0),
            borrowedAssets: BigInt(0),
            borrowedValue: BigInt(0),
            healthFactor: Infinity,
            ltv: 0,
          };
        }

        return {
          supplyShares: BigInt(apiPosition.supplyShares),
          borrowShares: BigInt(apiPosition.borrowShares),
          collateral: BigInt(apiPosition.collateral),
          collateralValue: BigInt(0), // Would need oracle price
          borrowedAssets: BigInt(apiPosition.borrowAssets),
          borrowedValue: BigInt(apiPosition.borrowAssets),
          healthFactor: apiPosition.healthFactor,
          ltv: 0,
        };
      }
    },
    enabled: !!smartAccountAddress,
    refetchInterval: 15000,
  });
}
