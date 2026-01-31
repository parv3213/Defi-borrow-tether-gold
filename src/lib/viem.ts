import { createPublicClient, http } from "viem";
import { arbitrum } from "viem/chains";

const rpcUrl = process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || arbitrum.rpcUrls.default.http[0];

export const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http(rpcUrl),
});

export { arbitrum };
