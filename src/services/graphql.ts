import { GraphQLClient, gql } from 'graphql-request';

const MORPHO_API_URL = 'https://blue-api.morpho.org/graphql';

const client = new GraphQLClient(MORPHO_API_URL);

// Types for GraphQL responses
interface MarketState {
  id: string;
  lltv: string;
  borrowApy: number;
  supplyApy: number;
  totalBorrowAssets: string;
  totalSupplyAssets: string;
  collateralAsset: {
    address: string;
    symbol: string;
    decimals: number;
    priceUsd: number;
  };
  loanAsset: {
    address: string;
    symbol: string;
    decimals: number;
    priceUsd: number;
  };
  oracle: {
    address: string;
    price: string;
  };
}

interface UserPosition {
  id: string;
  user: string;
  market: {
    id: string;
  };
  borrowShares: string;
  borrowAssets: string;
  supplyShares: string;
  supplyAssets: string;
  collateral: string;
  healthFactor: number;
}

interface HistoricalState {
  timestamp: number;
  totalBorrowAssets: string;
  totalSupplyAssets: string;
  borrowApy: number;
  supplyApy: number;
}

// Fetch market data from Morpho API
export async function fetchMarketFromAPI(
  marketId: string,
  chainId: number = 42161
): Promise<MarketState | null> {
  const query = gql`
    query GetMarket($marketId: String!, $chainId: Int!) {
      marketByUniqueKey(uniqueKey: $marketId, chainId: $chainId) {
        id
        lltv
        state {
          borrowApy
          supplyApy
          borrowAssets
          supplyAssets
          price
        }
        collateralAsset {
          address
          symbol
          decimals
          priceUsd
        }
        loanAsset {
          address
          symbol
          decimals
          priceUsd
        }
        oracle {
          address
        }
      }
    }
  `;

  try {
    const data = await client.request<{ marketByUniqueKey: any }>(query, {
      marketId,
      chainId,
    });

    if (!data.marketByUniqueKey) return null;

    const market = data.marketByUniqueKey;

    return {
      id: market.id,
      lltv: market.lltv,
      borrowApy: market.state.borrowApy,
      supplyApy: market.state.supplyApy,
      totalBorrowAssets: market.state.borrowAssets,
      totalSupplyAssets: market.state.supplyAssets,
      collateralAsset: market.collateralAsset,
      loanAsset: market.loanAsset,
      oracle: {
        address: market.oracle.address,
        price: market.state.price,
      },
    };
  } catch (error) {
    console.error('Failed to fetch market from Morpho API:', error);
    return null;
  }
}

// Fetch user position from Morpho API
export async function fetchUserPositionFromAPI(
  marketId: string,
  userAddress: string,
  chainId: number = 42161
): Promise<UserPosition | null> {
  const query = gql`
    query GetPosition($marketId: String!, $userAddress: String!, $chainId: Int!) {
      position(marketUniqueKey: $marketId, userAddress: $userAddress, chainId: $chainId) {
        id
        user
        market {
          id
        }
        borrowShares
        borrowAssets
        supplyShares
        supplyAssets
        collateral
        healthFactor
      }
    }
  `;

  try {
    const data = await client.request<{ position: UserPosition }>(query, {
      marketId,
      userAddress: userAddress.toLowerCase(),
      chainId,
    });
    return data.position;
  } catch (error) {
    console.error('Failed to fetch position from Morpho API:', error);
    return null;
  }
}

// Fetch historical market state
export async function fetchMarketHistory(
  marketId: string,
  chainId: number = 42161,
  options?: { startTimestamp?: number; endTimestamp?: number }
): Promise<HistoricalState[]> {
  const query = gql`
    query GetMarketHistory(
      $marketId: String!
      $chainId: Int!
      $startTimestamp: Int
      $endTimestamp: Int
    ) {
      marketByUniqueKey(uniqueKey: $marketId, chainId: $chainId) {
        historicalState(options: { startTimestamp: $startTimestamp, endTimestamp: $endTimestamp }) {
          timestamp
          totalBorrowAssets
          totalSupplyAssets
          borrowApy
          supplyApy
        }
      }
    }
  `;

  try {
    const data = await client.request<{
      marketByUniqueKey: { historicalState: HistoricalState[] };
    }>(query, {
      marketId,
      chainId,
      ...options,
    });
    return data.marketByUniqueKey?.historicalState || [];
  } catch (error) {
    console.error('Failed to fetch market history:', error);
    return [];
  }
}

// Fetch all markets on a chain
export async function fetchAllMarkets(chainId: number = 42161): Promise<MarketState[]> {
  const query = gql`
    query GetMarkets($chainId: Int!) {
      markets(where: { chainId_in: [$chainId] }) {
        items {
          id
          lltv
          state {
            borrowApy
            supplyApy
            borrowAssets
            supplyAssets
            price
          }
          collateralAsset {
            address
            symbol
            decimals
            priceUsd
          }
          loanAsset {
            address
            symbol
            decimals
            priceUsd
          }
          oracle {
            address
          }
        }
      }
    }
  `;

  try {
    const data = await client.request<{
      markets: { items: any[] };
    }>(query, { chainId });
    return (data.markets?.items || []).map(market => ({
      id: market.id,
      lltv: market.lltv,
      borrowApy: market.state.borrowApy,
      supplyApy: market.state.supplyApy,
      totalBorrowAssets: market.state.borrowAssets,
      totalSupplyAssets: market.state.supplyAssets,
      collateralAsset: market.collateralAsset,
      loanAsset: market.loanAsset,
      oracle: {
        address: market.oracle.address,
        price: market.state.price,
      },
    }));
  } catch (error) {
    console.error('Failed to fetch markets:', error);
    return [];
  }
}
