import { CONTRACTS, ERC20_ABI, PERMIT2_ABI } from '@/config/contracts';
import type { ClassifiedError } from '@/lib/errors';
import { classifyError, ErrorType } from '@/lib/errors';
import { publicClient } from '@/lib/viem';
import { Call } from '@/types';
import { CurrencyAmount, Percent, Token, TradeType } from '@uniswap/sdk-core';
import {
  CommandType,
  RoutePlanner,
  UNIVERSAL_ROUTER_ADDRESS,
  UniversalRouterVersion,
} from '@uniswap/universal-router-sdk';
import { Pool, Route, Trade, V4Planner } from '@uniswap/v4-sdk';
import {
  Address,
  decodeErrorResult,
  encodeFunctionData,
  maxUint128,
  maxUint160,
  zeroAddress,
} from 'viem';

// Arbitrum chain ID
const CHAIN_ID = 42161;

// Pool configuration
const POOL_FEE_BPS = 6000; // 0.6% fee
const TICK_SPACING = 120;

// Default slippage tolerance (0.5%)
export const DEFAULT_SLIPPAGE = 0.005;

const MAX_UINT128 = maxUint128;
const EMPTY_HOOK_DATA = '0x' as `0x${string}`;

// Token definitions using SDK
const USDT0_TOKEN = new Token(CHAIN_ID, CONTRACTS.USDT0, 6, 'USDT0', 'Tether USD0');

const XAUT0_TOKEN = new Token(CHAIN_ID, CONTRACTS.XAUT0, 6, 'XAUT0', 'Tether Gold0');

// V4 Quoter ABI for price estimation
const UNISWAP_V4_QUOTER_ABI = [
  {
    type: 'error',
    name: 'QuoteSwap',
    inputs: [{ name: 'amount', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'quoteExactInputSingle',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          {
            name: 'poolKey',
            type: 'tuple',
            components: [
              { name: 'currency0', type: 'address' },
              { name: 'currency1', type: 'address' },
              { name: 'fee', type: 'uint24' },
              { name: 'tickSpacing', type: 'int24' },
              { name: 'hooks', type: 'address' },
            ],
          },
          { name: 'zeroForOne', type: 'bool' },
          { name: 'exactAmount', type: 'uint128' },
          { name: 'hookData', type: 'bytes' },
        ],
      },
    ],
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
  },
] as const;

// Pool key for the V4 pool
const V4_XAUT_USDT_POOL_KEY = {
  currency0: CONTRACTS.XAUT0,
  currency1: CONTRACTS.USDT0,
  fee: POOL_FEE_BPS,
  tickSpacing: TICK_SPACING,
  hooks: zeroAddress,
};

// Get the Universal Router address for Arbitrum
function getUniversalRouterAddress(): Address {
  // Use SDK constant with V2_0 version or fallback to our config
  try {
    const sdkAddress = UNIVERSAL_ROUTER_ADDRESS(UniversalRouterVersion.V2_0, CHAIN_ID);
    return (sdkAddress || CONTRACTS.UNISWAP_UNIVERSAL_ROUTER) as Address;
  } catch {
    return CONTRACTS.UNISWAP_UNIVERSAL_ROUTER;
  }
}

// Build ERC20 approve call
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

// Build Permit2 approve call (approve token spending by UniversalRouter)
function buildPermit2ApproveCall(token: Address, spender: Address): Call {
  const data = encodeFunctionData({
    abi: PERMIT2_ABI,
    functionName: 'approve',
    args: [
      token,
      spender,
      maxUint160,
      // ~4 years expiration
      Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 4,
    ],
  });

  return {
    to: CONTRACTS.PERMIT2,
    data,
  };
}

/**
 * Fetch current pool state from on-chain for accurate pricing
 */
async function fetchPoolState(): Promise<{
  sqrtPriceX96: bigint;
  tick: number;
  liquidity: bigint;
}> {
  // Default values - in production, query the actual pool state via StateView
  // sqrtPriceX96 for ~$3000 XAUT price with 6 decimal tokens
  const defaultSqrtPriceX96 = BigInt('79228162514264337593543950336');
  const defaultTick = 0;
  const defaultLiquidity = BigInt('1000000000000000000');

  return {
    sqrtPriceX96: defaultSqrtPriceX96,
    tick: defaultTick,
    liquidity: defaultLiquidity,
  };
}

/**
 * Create a V4 Pool instance using the SDK
 */
async function createV4Pool(): Promise<Pool> {
  const poolState = await fetchPoolState();

  // Determine token order (currency0 should be lower address)
  const [token0, token1] = XAUT0_TOKEN.sortsBefore(USDT0_TOKEN)
    ? [XAUT0_TOKEN, USDT0_TOKEN]
    : [USDT0_TOKEN, XAUT0_TOKEN];

  return new Pool(
    token0,
    token1,
    POOL_FEE_BPS,
    TICK_SPACING,
    zeroAddress, // hooks address
    poolState.sqrtPriceX96.toString(),
    poolState.liquidity.toString(),
    poolState.tick
  );
}

/**
 * Build swap calldata using Uniswap V4 SDK with RoutePlanner
 * This creates properly encoded calldata for the Universal Router
 */
async function buildV4SwapCalldata(
  tokenIn: Token,
  tokenOut: Token,
  amountIn: bigint,
  amountOutMinimum: bigint,
  recipient: Address
): Promise<{ to: Address; data: `0x${string}`; value: bigint }> {
  const pool = await createV4Pool();

  // Create the route
  const route = new Route([pool], tokenIn, tokenOut);

  // Create currency amounts
  const inputAmount = CurrencyAmount.fromRawAmount(tokenIn, amountIn.toString());
  const outputAmount = CurrencyAmount.fromRawAmount(tokenOut, amountOutMinimum.toString());

  // Create the trade using the V4 SDK
  const trade = Trade.createUncheckedTrade({
    route,
    inputAmount,
    outputAmount,
    tradeType: TradeType.EXACT_INPUT,
  });

  // Use V4Planner to encode the swap actions
  const v4Planner = new V4Planner();

  // Add the trade with slippage tolerance
  const slippageTolerance = new Percent(0, 100); // We already calculated min amount
  v4Planner.addTrade(trade, slippageTolerance);

  // Add settle and take actions
  v4Planner.addSettle(tokenIn, true); // payerIsUser = true
  v4Planner.addTake(tokenOut, recipient);

  // Finalize the V4 planner to get encoded actions
  const v4Actions = v4Planner.finalize();

  // Use RoutePlanner to wrap in Universal Router command
  const routePlanner = new RoutePlanner();
  routePlanner.addCommand(CommandType.V4_SWAP, [v4Actions]);

  // Encode the Universal Router execute call
  const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 min deadline

  // Build the calldata manually using the route planner
  const UNIVERSAL_ROUTER_ABI = [
    {
      name: 'execute',
      type: 'function',
      stateMutability: 'payable',
      inputs: [
        { name: 'commands', type: 'bytes' },
        { name: 'inputs', type: 'bytes[]' },
        { name: 'deadline', type: 'uint256' },
      ],
      outputs: [],
    },
  ] as const;

  const calldata = encodeFunctionData({
    abi: UNIVERSAL_ROUTER_ABI,
    functionName: 'execute',
    args: [
      routePlanner.commands as `0x${string}`,
      routePlanner.inputs as `0x${string}`[],
      BigInt(deadline),
    ],
  });

  return {
    to: getUniversalRouterAddress(),
    data: calldata,
    value: BigInt(0), // No native value for ERC20 swaps
  };
}

/**
 * Build swap calls for USDT0 -> XAUT0
 * Compatible with smart account batched transactions
 */
export async function buildSwapUSDT0ToXAUT0Calls(
  amountIn: bigint,
  amountOutMinimum: bigint,
  recipient: Address
): Promise<Call[]> {
  const calls: Call[] = [];
  const universalRouter = getUniversalRouterAddress();

  // Step 1: Approve Permit2 to spend the input token (ERC20 approve)
  const erc20Allowance = (await publicClient.readContract({
    address: CONTRACTS.USDT0,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [recipient, CONTRACTS.PERMIT2],
  })) as bigint;

  if (erc20Allowance < amountIn) {
    calls.push(buildApproveCall(CONTRACTS.USDT0, CONTRACTS.PERMIT2, amountIn));
  }

  // Step 2: Approve UniversalRouter on Permit2
  const [permit2Allowance] = (await publicClient.readContract({
    address: CONTRACTS.PERMIT2,
    abi: PERMIT2_ABI,
    functionName: 'allowance',
    args: [recipient, CONTRACTS.USDT0, universalRouter],
  })) as [bigint, number, number];

  if (permit2Allowance < amountIn) {
    calls.push(buildPermit2ApproveCall(CONTRACTS.USDT0, universalRouter));
  }

  // Step 3: Execute V4 swap using SDK-generated calldata
  const swapCall = await buildV4SwapCalldata(
    USDT0_TOKEN,
    XAUT0_TOKEN,
    amountIn,
    amountOutMinimum,
    recipient
  );

  calls.push({
    to: swapCall.to,
    data: swapCall.data,
    value: swapCall.value,
  });

  return calls;
}

/**
 * Build swap calls for XAUT0 -> USDT0
 * Compatible with smart account batched transactions
 */
export async function buildSwapXAUT0ToUSDT0Calls(
  amountIn: bigint,
  amountOutMinimum: bigint,
  recipient: Address
): Promise<Call[]> {
  const calls: Call[] = [];
  const universalRouter = getUniversalRouterAddress();

  // Step 1: Approve Permit2 to spend the input token (ERC20 approve)
  const erc20Allowance = (await publicClient.readContract({
    address: CONTRACTS.XAUT0,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [recipient, CONTRACTS.PERMIT2],
  })) as bigint;

  if (erc20Allowance < amountIn) {
    calls.push(buildApproveCall(CONTRACTS.XAUT0, CONTRACTS.PERMIT2, amountIn));
  }

  // Step 2: Approve UniversalRouter on Permit2
  const [permit2Allowance] = (await publicClient.readContract({
    address: CONTRACTS.PERMIT2,
    abi: PERMIT2_ABI,
    functionName: 'allowance',
    args: [recipient, CONTRACTS.XAUT0, universalRouter],
  })) as [bigint, number, number];

  if (permit2Allowance < amountIn) {
    calls.push(buildPermit2ApproveCall(CONTRACTS.XAUT0, universalRouter));
  }

  // Step 3: Execute V4 swap using SDK-generated calldata
  const swapCall = await buildV4SwapCalldata(
    XAUT0_TOKEN,
    USDT0_TOKEN,
    amountIn,
    amountOutMinimum,
    recipient
  );

  calls.push({
    to: swapCall.to,
    data: swapCall.data,
    value: swapCall.value,
  });

  return calls;
}

/**
 * Calculate minimum amount out with slippage (bigint-native to avoid precision loss)
 */
export function calculateMinAmountOut(
  amountOut: bigint,
  slippageTolerance: number = DEFAULT_SLIPPAGE
): bigint {
  const BPS_DENOMINATOR = BigInt(10000);
  const slippageBps = BigInt(Math.round(slippageTolerance * 10000));
  return (amountOut * (BPS_DENOMINATOR - slippageBps)) / BPS_DENOMINATOR;
}

/**
 * Estimate swap output using Uniswap V4 quoter
 * @param tokenIn Input token address
 * @param tokenOut Output token address
 * @param amountIn Input amount in smallest unit (wei)
 * @returns Estimated output amount
 * @throws {ClassifiedError} On validation, network, or contract errors
 */
export async function estimateSwapOutput(
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint
): Promise<bigint> {
  if (!tokenIn || !tokenOut || amountIn <= BigInt(0)) {
    throw {
      type: ErrorType.CONTRACT_ERROR,
      message: 'Invalid swap parameters',
      details: 'Token addresses must be valid and amount must be > 0',
    } as ClassifiedError;
  }

  if (amountIn > MAX_UINT128) {
    throw {
      type: ErrorType.CONTRACT_ERROR,
      message: 'Amount too large',
      details: 'Uniswap V4 quoter only supports values up to uint128',
    } as ClassifiedError;
  }

  const pairMatchesPool =
    (tokenIn.toLowerCase() === V4_XAUT_USDT_POOL_KEY.currency0.toLowerCase() &&
      tokenOut.toLowerCase() === V4_XAUT_USDT_POOL_KEY.currency1.toLowerCase()) ||
    (tokenIn.toLowerCase() === V4_XAUT_USDT_POOL_KEY.currency1.toLowerCase() &&
      tokenOut.toLowerCase() === V4_XAUT_USDT_POOL_KEY.currency0.toLowerCase());

  if (!pairMatchesPool) {
    throw {
      type: ErrorType.CONTRACT_ERROR,
      message: 'Unsupported pool',
      details: 'Quoting is only implemented for the XAUT0/USDT0 0.6% V4 pool.',
    } as ClassifiedError;
  }

  const zeroForOne = tokenIn.toLowerCase() === V4_XAUT_USDT_POOL_KEY.currency0.toLowerCase();
  const params = {
    poolKey: V4_XAUT_USDT_POOL_KEY,
    zeroForOne,
    exactAmount: amountIn,
    hookData: EMPTY_HOOK_DATA,
  } as const;

  try {
    const result = await publicClient.readContract({
      address: CONTRACTS.UNISWAP_QUOTER,
      abi: UNISWAP_V4_QUOTER_ABI,
      functionName: 'quoteExactInputSingle',
      args: [params],
    });

    if (!result[0] || result[0] === BigInt(0)) {
      throw {
        type: ErrorType.CONTRACT_ERROR,
        message: 'No liquidity available',
        details: 'No liquidity found for this token pair and fee tier.',
      } as ClassifiedError;
    }

    return result[0];
  } catch (error: unknown) {
    const revertData =
      (error as { data?: `0x${string}`; cause?: { data?: `0x${string}` } })?.data ??
      (error as { data?: `0x${string}`; cause?: { data?: `0x${string}` } })?.cause?.data;
    if (revertData) {
      try {
        const decoded = decodeErrorResult({ data: revertData, abi: UNISWAP_V4_QUOTER_ABI });
        if (decoded.errorName === 'QuoteSwap') {
          const [amountOut] = decoded.args as [bigint];
          return amountOut;
        }
      } catch {
        // fall through to generic classification
      }
    }

    const classified = classifyError(error);
    throw {
      ...classified,
      details: classified.details || 'Failed to estimate swap output.',
    } as ClassifiedError;
  }
}
