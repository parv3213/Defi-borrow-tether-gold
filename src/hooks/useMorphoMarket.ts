'use client';

import { MARKET_ID } from '@/config/morpho';
import { fetchMarketFromAPI } from '@/services/graphql';
import { getMarket } from '@/services/morpho';
import { MorphoMarket } from '@/types';
import { useQuery } from '@tanstack/react-query';

export function useMorphoMarket() {
  return useQuery<MorphoMarket>({
    queryKey: ['morphoMarket', MARKET_ID],
    queryFn: async () => {
      // Try on-chain data first
      try {
        return await getMarket();
      } catch (error) {
        console.warn('On-chain market fetch failed, trying API:', error);

        // Fallback to GraphQL API
        const apiMarket = await fetchMarketFromAPI(MARKET_ID);

        if (!apiMarket) {
          throw new Error('Failed to fetch market data');
        }

        // Convert API response to our type
        return {
          id: apiMarket.id,
          params: {
            loanToken: apiMarket.loanAsset.address as `0x${string}`,
            collateralToken: apiMarket.collateralAsset.address as `0x${string}`,
            oracle: apiMarket.oracle.address as `0x${string}`,
            irm: '0x' as `0x${string}`,
            lltv: BigInt(apiMarket.lltv),
          },
          totalSupplyAssets: BigInt(apiMarket.totalSupplyAssets),
          totalSupplyShares: BigInt(0),
          totalBorrowAssets: BigInt(apiMarket.totalBorrowAssets),
          totalBorrowShares: BigInt(0),
          lastUpdate: BigInt(0),
          fee: BigInt(0),
          lltv: Number(apiMarket.lltv) / 1e18,
          supplyApr: apiMarket.supplyApy,
          borrowApr: apiMarket.borrowApy,
          availableLiquidity:
            BigInt(apiMarket.totalSupplyAssets) - BigInt(apiMarket.totalBorrowAssets),
          oraclePrice: BigInt(apiMarket.oracle.price),
        };
      }
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });
}
