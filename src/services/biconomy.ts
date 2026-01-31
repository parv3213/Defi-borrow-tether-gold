import { createBicoPaymasterClient, createNexusClient, NexusClient } from '@biconomy/sdk';
import { http, type Account, type Address, type WalletClient } from 'viem';
import { arbitrum } from 'viem/chains';

let nexusClientCache: NexusClient | null = null;
let cachedSignerAddress: Address | null = null;

const rpcUrl = process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || arbitrum.rpcUrls.default.http[0];

// Check if gasless mode is available
export function isGaslessEnabled(): boolean {
  const bundlerUrl = process.env.NEXT_PUBLIC_BICONOMY_BUNDLER_URL;
  const paymasterUrl = process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_URL;
  return !!(bundlerUrl && paymasterUrl);
}

export async function createSmartAccount(walletClient: WalletClient): Promise<NexusClient> {
  const account = walletClient.account;

  if (!account) {
    throw new Error('Wallet client has no account');
  }

  const signerAddress = account.address;

  // Return cached client if signer hasn't changed
  if (nexusClientCache && cachedSignerAddress === signerAddress) {
    return nexusClientCache;
  }

  const bundlerUrl = process.env.NEXT_PUBLIC_BICONOMY_BUNDLER_URL;
  const paymasterUrl = process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_URL;

  // Create a signer object that Biconomy expects
  const signer = {
    ...walletClient,
    account: account as Account,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let nexusClient: NexusClient;

  if (bundlerUrl && paymasterUrl) {
    // Full gasless mode with paymaster
    const paymasterClient = createBicoPaymasterClient({
      paymasterUrl,
    });

    nexusClient = await createNexusClient({
      signer: signer as any,
      chain: arbitrum,
      transport: http(rpcUrl),
      bundlerTransport: http(bundlerUrl),
      paymaster: paymasterClient,
    });
  } else if (bundlerUrl) {
    // Bundler only - user pays gas
    nexusClient = await createNexusClient({
      signer: signer as any,
      chain: arbitrum,
      transport: http(rpcUrl),
      bundlerTransport: http(bundlerUrl),
    });
  } else {
    // No bundler - use default bundler (may have limitations)
    // For development/testing without Biconomy infrastructure
    nexusClient = await createNexusClient({
      signer: signer as any,
      chain: arbitrum,
      transport: http(rpcUrl),
      // Use a public bundler endpoint for testing
      bundlerTransport: http(rpcUrl),
    });
  }

  nexusClientCache = nexusClient;
  cachedSignerAddress = signerAddress;

  return nexusClient;
}

export function getSmartAccountAddress(nexusClient: NexusClient): Address {
  return nexusClient.account.address;
}

export function clearSmartAccountCache(): void {
  nexusClientCache = null;
  cachedSignerAddress = null;
}
