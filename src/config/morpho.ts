import { publicClient } from '@/lib/viem';
import { MarketParams } from '@/types';
import { Address } from 'viem';
import { CONTRACTS, MORPHO_ABI, MORPHO_MARKET_ID } from './contracts';

// Cached market params
let cachedMarketParams: MarketParams | null = null;

export const MARKET_ID = MORPHO_MARKET_ID;

// Target LTV for safe borrowing (67%)
export const SAFE_LTV = 0.67;

// Warning LTV threshold (72%)
export const WARNING_LTV = 0.72;

// Fetch market params from chain
export async function fetchMarketParams(): Promise<MarketParams> {
  if (cachedMarketParams) {
    return cachedMarketParams;
  }

  const result = await publicClient.readContract({
    address: CONTRACTS.MORPHO_BLUE,
    abi: MORPHO_ABI,
    functionName: 'idToMarketParams',
    args: [MARKET_ID],
  });

  cachedMarketParams = {
    loanToken: result.loanToken as Address,
    collateralToken: result.collateralToken as Address,
    oracle: result.oracle as Address,
    irm: result.irm as Address,
    lltv: result.lltv,
  };

  return cachedMarketParams;
}

// Get cached market params (throws if not fetched)
export function getMarketParams(): MarketParams {
  if (!cachedMarketParams) {
    throw new Error('Market params not fetched. Call fetchMarketParams first.');
  }
  return cachedMarketParams;
}

// Clear cache (for testing or refresh)
export function clearMarketParamsCache(): void {
  cachedMarketParams = null;
}

// Calculate max borrow based on collateral and LLTV
export function calculateMaxBorrow(collateralValue: bigint, lltv: bigint): bigint {
  return (collateralValue * lltv) / BigInt(1e18);
}

// Calculate safe borrow (67% of max)
export function calculateSafeBorrow(collateralValue: bigint, lltv: bigint): bigint {
  const maxBorrow = calculateMaxBorrow(collateralValue, lltv);
  return (maxBorrow * BigInt(67)) / BigInt(100);
}

// Calculate health factor
export function calculateHealthFactor(
  collateralValue: bigint,
  borrowedValue: bigint,
  lltv: bigint
): number {
  if (borrowedValue === BigInt(0)) return Infinity;
  const maxBorrow = calculateMaxBorrow(collateralValue, lltv);
  return Number(maxBorrow) / Number(borrowedValue);
}

// Calculate LTV percentage
export function calculateLTV(borrowedValue: bigint, collateralValue: bigint): number {
  if (collateralValue === BigInt(0)) return 0;
  return Number(borrowedValue) / Number(collateralValue);
}
