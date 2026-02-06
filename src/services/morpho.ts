import { CONTRACTS, ERC20_ABI, MORPHO_ABI, ORACLE_ABI } from '@/config/contracts';
import { MARKET_ID, fetchMarketParams } from '@/config/morpho';
import { publicClient } from '@/lib/viem';
import { Call, MarketParams, MorphoMarket, MorphoPosition } from '@/types';
import { Address, encodeFunctionData } from 'viem';

// Build approve call
function buildApproveCall(tokenAddress: Address, spender: Address, amount: bigint): Call {
  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spender, amount],
  });

  return {
    to: tokenAddress,
    data,
  };
}

// Build supply collateral call
function buildSupplyCollateralCall(
  marketParams: MarketParams,
  assets: bigint,
  onBehalf: Address
): Call {
  const data = encodeFunctionData({
    abi: MORPHO_ABI,
    functionName: 'supplyCollateral',
    args: [marketParams, assets, onBehalf, '0x'],
  });

  return {
    to: CONTRACTS.MORPHO_BLUE,
    data,
  };
}

// Build borrow call
function buildBorrowCall(
  marketParams: MarketParams,
  assets: bigint,
  onBehalf: Address,
  receiver: Address
): Call {
  const data = encodeFunctionData({
    abi: MORPHO_ABI,
    functionName: 'borrow',
    args: [marketParams, assets, BigInt(0), onBehalf, receiver],
  });

  return {
    to: CONTRACTS.MORPHO_BLUE,
    data,
  };
}

// Build repay call
function buildRepayCall(
  marketParams: MarketParams,
  assets: bigint,
  shares: bigint,
  onBehalf: Address
): Call {
  const data = encodeFunctionData({
    abi: MORPHO_ABI,
    functionName: 'repay',
    args: [marketParams, assets, shares, onBehalf, '0x'],
  });

  return {
    to: CONTRACTS.MORPHO_BLUE,
    data,
  };
}

// Build withdraw collateral call
function buildWithdrawCollateralCall(
  marketParams: MarketParams,
  assets: bigint,
  onBehalf: Address,
  receiver: Address
): Call {
  const data = encodeFunctionData({
    abi: MORPHO_ABI,
    functionName: 'withdrawCollateral',
    args: [marketParams, assets, onBehalf, receiver],
  });

  return {
    to: CONTRACTS.MORPHO_BLUE,
    data,
  };
}

// Build calls to supply collateral and borrow
export async function buildSupplyAndBorrowCalls(
  collateralAmount: bigint,
  borrowAmount: bigint,
  account: Address
): Promise<Call[]> {
  const marketParams = await fetchMarketParams();
  const calls: Call[] = [];

  // 1. Approve XAUT0 (collateral) to Morpho
  calls.push(buildApproveCall(CONTRACTS.XAUT0, CONTRACTS.MORPHO_BLUE, collateralAmount));

  // 2. Supply collateral
  calls.push(buildSupplyCollateralCall(marketParams, collateralAmount, account));

  // 3. Borrow USDT0
  if (borrowAmount > BigInt(0)) {
    calls.push(buildBorrowCall(marketParams, borrowAmount, account, account));
  }

  return calls;
}

// Max uint256 for approvals
const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

// Build calls to repay debt
export async function buildRepayAssetsCalls(
  repayAmount: bigint,
  account: Address
): Promise<Call[]> {
  const marketParams = await fetchMarketParams();
  const position = await getPosition(account);
  const calls: Call[] = [];

  // If repaying full debt or more, use shares-based repayment to avoid dust
  if (position.borrowShares > BigInt(0) && repayAmount >= position.borrowedAssets) {
    // Approve max to cover any interest accrual between read and execution
    calls.push(buildApproveCall(CONTRACTS.USDT0, CONTRACTS.MORPHO_BLUE, MAX_UINT256));

    // Repay using shares to clear all debt completely
    calls.push(buildRepayCall(marketParams, BigInt(0), position.borrowShares, account));
  } else {
    // Partial repay using assets
    calls.push(buildApproveCall(CONTRACTS.USDT0, CONTRACTS.MORPHO_BLUE, repayAmount));
    calls.push(buildRepayCall(marketParams, repayAmount, BigInt(0), account));
  }

  return calls;
}

// Build calls to repay full debt using shares
export async function buildRepayFullCalls(account: Address): Promise<Call[]> {
  const marketParams = await fetchMarketParams();
  const position = await getPosition(account);

  if (position.borrowShares === BigInt(0)) {
    return [];
  }

  const calls: Call[] = [];

  // Approve max uint256 to guarantee sufficient allowance regardless of
  // interest accrual between the read and on-chain execution.
  calls.push(buildApproveCall(CONTRACTS.USDT0, CONTRACTS.MORPHO_BLUE, MAX_UINT256));

  // Repay using shares (to clear all debt exactly)
  calls.push(buildRepayCall(marketParams, BigInt(0), position.borrowShares, account));

  return calls;
}

// Build call to withdraw collateral
export async function buildWithdrawCollateralCalls(
  withdrawAmount: bigint,
  account: Address
): Promise<Call[]> {
  const marketParams = await fetchMarketParams();

  return [buildWithdrawCollateralCall(marketParams, withdrawAmount, account, account)];
}

// Get user position from chain
export async function getPosition(account: Address): Promise<MorphoPosition> {
  const [positionResult, marketParams] = await Promise.all([
    publicClient.readContract({
      address: CONTRACTS.MORPHO_BLUE,
      abi: MORPHO_ABI,
      functionName: 'position',
      args: [MARKET_ID, account],
    }),
    fetchMarketParams(),
  ]);

  const [supplyShares, borrowShares, collateralRaw] = positionResult;

  const collateral = collateralRaw;

  // Get market state for share conversion
  const marketResult = await publicClient.readContract({
    address: CONTRACTS.MORPHO_BLUE,
    abi: MORPHO_ABI,
    functionName: 'market',
    args: [MARKET_ID],
  });

  const [totalSupplyAssets, totalSupplyShares, totalBorrowAssets, totalBorrowShares] = marketResult;

  // Convert borrow shares to assets
  // Use round-up division to match contract logic (assets = shares * totalAssets / totalShares)
  // This ensures we don't underestimate debt
  const borrowedAssets =
    totalBorrowShares > BigInt(0)
      ? (BigInt(borrowShares) * totalBorrowAssets + totalBorrowShares - BigInt(1)) /
        totalBorrowShares
      : BigInt(0);

  // Get oracle price for collateral valuation
  const oraclePrice = await getOraclePrice(marketParams.oracle);

  // Calculate collateral value in loan token terms
  // Oracle returns price with 36 + loanDecimals - collateralDecimals = 36 decimals
  const collateralValue = (BigInt(collateral) * oraclePrice) / BigInt(10 ** 36);

  // Calculate health factor and LTV
  const ltv = collateralValue > BigInt(0) ? Number(borrowedAssets) / Number(collateralValue) : 0;

  const maxBorrow = (collateralValue * marketParams.lltv) / BigInt(10 ** 18);
  const healthFactor =
    borrowedAssets > BigInt(0) ? Number(maxBorrow) / Number(borrowedAssets) : Infinity;

  return {
    supplyShares,
    borrowShares: BigInt(borrowShares),
    collateral: BigInt(collateral),
    collateralValue,
    borrowedAssets,
    borrowedValue: borrowedAssets, // For USDT, value = assets
    healthFactor,
    ltv,
  };
}

// Get oracle price
export async function getOraclePrice(oracleAddress: Address): Promise<bigint> {
  try {
    return await publicClient.readContract({
      address: oracleAddress,
      abi: ORACLE_ABI,
      functionName: 'price',
    });
  } catch {
    // Fallback: assume 1:1 if oracle fails
    console.warn('Failed to get oracle price, using fallback');
    return BigInt(10 ** 36);
  }
}

// Get market data
export async function getMarket(): Promise<MorphoMarket> {
  const [marketParams, marketResult] = await Promise.all([
    fetchMarketParams(),
    publicClient.readContract({
      address: CONTRACTS.MORPHO_BLUE,
      abi: MORPHO_ABI,
      functionName: 'market',
      args: [MARKET_ID],
    }),
  ]);

  const [
    totalSupplyAssets,
    totalSupplyShares,
    totalBorrowAssets,
    totalBorrowShares,
    lastUpdate,
    fee,
  ] = marketResult;

  // Get oracle price
  const oraclePrice = await getOraclePrice(marketParams.oracle);

  // Calculate available liquidity
  const availableLiquidity = totalSupplyAssets - totalBorrowAssets;

  // Calculate utilization
  const utilization =
    totalSupplyAssets > BigInt(0) ? Number(totalBorrowAssets) / Number(totalSupplyAssets) : 0;

  // Estimate APR (simplified - real implementation would use IRM)
  const borrowApr = utilization * 0.1; // 10% at 100% utilization
  const supplyApr = borrowApr * utilization * (1 - Number(fee) / 1e18);

  return {
    id: MARKET_ID,
    params: marketParams,
    totalSupplyAssets,
    totalSupplyShares,
    totalBorrowAssets,
    totalBorrowShares,
    lastUpdate,
    fee,
    lltv: Number(marketParams.lltv) / 1e18,
    supplyApr,
    borrowApr,
    availableLiquidity,
    oraclePrice,
  };
}
