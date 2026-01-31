import { CONTRACTS, ERC20_ABI } from "@/config/contracts";
import { TOKENS } from "@/config/tokens";
import { publicClient } from "@/lib/viem";
import { TokenBalance } from "@/types";
import { Address } from "viem";

// Read ERC20 balance
export async function getTokenBalance(tokenAddress: Address, account: Address): Promise<bigint> {
    return publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [account],
    });
}

// Read multiple token balances
export async function getTokenBalances(account: Address): Promise<TokenBalance[]> {
    const tokens = [TOKENS.USDT0, TOKENS.XAUT0];

    const balances = await Promise.all(tokens.map((token) => getTokenBalance(token.address, account)));

    return tokens.map((token, i) => ({
        token,
        balance: balances[i],
        formatted: formatBalance(balances[i], token.decimals),
    }));
}

// Read allowance
export async function getAllowance(tokenAddress: Address, owner: Address, spender: Address): Promise<bigint> {
    return publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [owner, spender],
    });
}

// Check if approval is needed
export async function needsApproval(
    tokenAddress: Address,
    owner: Address,
    spender: Address,
    amount: bigint,
): Promise<boolean> {
    const allowance = await getAllowance(tokenAddress, owner, spender);
    return allowance < amount;
}

// Format balance with decimals
function formatBalance(balance: bigint, decimals: number): string {
    const divisor = BigInt(10 ** decimals);
    const integerPart = balance / divisor;
    const fractionalPart = balance % divisor;
    const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
    return `${integerPart}.${fractionalStr}`;
}

// Get USDT0 balance
export async function getUSDT0Balance(account: Address): Promise<bigint> {
    return getTokenBalance(CONTRACTS.USDT0, account);
}

// Get XAUT0 balance
export async function getXAUT0Balance(account: Address): Promise<bigint> {
    return getTokenBalance(CONTRACTS.XAUT0, account);
}
