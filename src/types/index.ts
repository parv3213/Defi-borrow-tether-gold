import { Address } from "viem";

export interface TokenInfo {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  icon?: string;
}

export interface TokenBalance {
  token: TokenInfo;
  balance: bigint;
  formatted: string;
}

export interface MarketParams {
  loanToken: Address;
  collateralToken: Address;
  oracle: Address;
  irm: Address;
  lltv: bigint;
}

export interface MorphoPosition {
  supplyShares: bigint;
  borrowShares: bigint;
  collateral: bigint;
  collateralValue: bigint;
  borrowedAssets: bigint;
  borrowedValue: bigint;
  healthFactor: number;
  ltv: number;
}

export interface MorphoMarket {
  id: string;
  params: MarketParams;
  totalSupplyAssets: bigint;
  totalSupplyShares: bigint;
  totalBorrowAssets: bigint;
  totalBorrowShares: bigint;
  lastUpdate: bigint;
  fee: bigint;
  lltv: number;
  supplyApr: number;
  borrowApr: number;
  availableLiquidity: bigint;
  oraclePrice: bigint;
}

export interface SwapQuote {
  amountIn: bigint;
  amountOut: bigint;
  minimumAmountOut: bigint;
  priceImpact: number;
  path: Address[];
}

export interface TransactionState {
  status: "idle" | "pending" | "confirming" | "success" | "error";
  hash?: string;
  error?: string;
}

export type Call = {
  to: Address;
  data: `0x${string}`;
  value?: bigint;
};
