import { CONTRACTS, ERC20_ABI, UNISWAP_ROUTER_ABI } from '@/config/contracts';
import type { ClassifiedError } from '@/lib/errors';
import { classifyError, ErrorType } from '@/lib/errors';
import { publicClient } from '@/lib/viem';
import { Call } from '@/types';
import { Address, decodeErrorResult, encodeFunctionData, maxUint128 } from 'viem';

const POOL_FEE_BPS = 6000; // 0.6% exact pool fee

// Default slippage tolerance (0.5%)
export const DEFAULT_SLIPPAGE = 0.005;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;
const MAX_UINT128 = maxUint128;
const EMPTY_HOOK_DATA = '0x' as `0x${string}`;

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

const V4_XAUT_USDT_POOL_KEY = {
  currency0: CONTRACTS.XAUT0,
  currency1: CONTRACTS.USDT0,
  fee: POOL_FEE_BPS,
  tickSpacing: 120,
  hooks: ZERO_ADDRESS,
};

interface SwapParams {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  amountOutMinimum: bigint;
  recipient: Address;
}

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

// Build exactInputSingle swap call
function buildExactInputSingleCall(params: SwapParams): Call {
  const data = encodeFunctionData({
    abi: UNISWAP_ROUTER_ABI,
    functionName: 'exactInputSingle',
    args: [
      {
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        fee: POOL_FEE_BPS,
        recipient: params.recipient,
        amountIn: params.amountIn,
        amountOutMinimum: params.amountOutMinimum,
        sqrtPriceLimitX96: BigInt(0),
      },
    ],
  });

  return {
    to: CONTRACTS.UNISWAP_SWAP_ROUTER,
    data,
  };
}

// Build swap calls for USDT0 -> XAUT0
// Using single-hop as requested for simplicity
export async function buildSwapUSDT0ToXAUT0Calls(
  amountIn: bigint,
  amountOutMinimum: bigint,
  recipient: Address
): Promise<Call[]> {
  const calls: Call[] = [];

  const allowance = (await publicClient.readContract({
    address: CONTRACTS.USDT0,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [recipient, CONTRACTS.UNISWAP_SWAP_ROUTER],
  })) as bigint;

  if (allowance < amountIn) {
    // Approve USDT0 to router only when needed
    calls.push(buildApproveCall(CONTRACTS.USDT0, CONTRACTS.UNISWAP_SWAP_ROUTER, amountIn));
  }

  // Single-hop swap: USDT0 -> XAUT0
  calls.push(
    buildExactInputSingleCall({
      tokenIn: CONTRACTS.USDT0,
      tokenOut: CONTRACTS.XAUT0,
      amountIn,
      amountOutMinimum,
      recipient,
    })
  );

  return calls;
}

// Build swap calls for XAUT0 -> USDT0
export async function buildSwapXAUT0ToUSDT0Calls(
  amountIn: bigint,
  amountOutMinimum: bigint,
  recipient: Address
): Promise<Call[]> {
  const calls: Call[] = [];

  const allowance = (await publicClient.readContract({
    address: CONTRACTS.XAUT0,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [recipient, CONTRACTS.UNISWAP_SWAP_ROUTER],
  })) as bigint;

  if (allowance < amountIn) {
    // Approve XAUT0 to router only when needed
    calls.push(buildApproveCall(CONTRACTS.XAUT0, CONTRACTS.UNISWAP_SWAP_ROUTER, amountIn));
  }

  // Single-hop swap: XAUT0 -> USDT0
  calls.push(
    buildExactInputSingleCall({
      tokenIn: CONTRACTS.XAUT0,
      tokenOut: CONTRACTS.USDT0,
      amountIn,
      amountOutMinimum,
      recipient,
    })
  );

  return calls;
}

// Calculate minimum amount out with slippage
export function calculateMinAmountOut(
  amountOut: bigint,
  slippageTolerance: number = DEFAULT_SLIPPAGE
): bigint {
  const slippageMultiplier = 1 - slippageTolerance;
  return BigInt(Math.floor(Number(amountOut) * slippageMultiplier));
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
  } catch (error: any) {
    const revertData = (error as any)?.data ?? (error as any)?.cause?.data;
    if (revertData) {
      try {
        const decoded = decodeErrorResult({ data: revertData, abi: UNISWAP_V4_QUOTER_ABI });
        if (decoded.errorName === 'QuoteSwap') {
          const [amountOut] = decoded.args as [bigint];
          return amountOut;
        }
      } catch (_) {
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
