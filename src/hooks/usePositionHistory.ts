'use client';

import { MARKET_ID } from '@/config/morpho';
import { fetchPositionTransactions } from '@/services/graphql';
import { PositionTransaction, PositionTransactionType } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { useSmartAccount } from './useSmartAccount';

export function usePositionHistory() {
  const { smartAccountAddress, counterfactualAddress } = useSmartAccount();

  // Use counterfactual address if available (for historical transactions before EIP-7702),
  // otherwise fall back to smartAccountAddress
  const queryAddress = counterfactualAddress || smartAccountAddress;

  return useQuery<PositionTransaction[]>({
    queryKey: ['positionHistory', queryAddress],
    queryFn: async () => {
      if (!queryAddress) {
        throw new Error('No account address');
      }

      const transactions = await fetchPositionTransactions(MARKET_ID, queryAddress);

      return transactions.map(tx => {
        // Extract assets based on transaction type
        let assets = BigInt(0);
        let shares = BigInt(0);

        if (tx.data) {
          if ('assets' in tx.data && tx.data.assets) {
            assets = BigInt(tx.data.assets);
          }
          if ('shares' in tx.data && tx.data.shares) {
            shares = BigInt(tx.data.shares);
          }
          if ('seizedAssets' in tx.data && tx.data.seizedAssets) {
            assets = BigInt(tx.data.seizedAssets);
          }
        }

        return {
          id: tx.id,
          hash: tx.hash,
          timestamp: tx.timestamp,
          type: tx.type as PositionTransactionType,
          assets,
          shares,
          user: queryAddress as string,
        };
      });
    },
    enabled: !!queryAddress,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
