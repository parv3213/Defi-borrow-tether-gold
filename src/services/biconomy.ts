import {
  createMeeClient,
  getMEEVersion,
  MEEVersion,
  toMultichainNexusAccount,
  type MeeClient,
  type MultichainSmartAccount,
} from '@biconomy/abstractjs';
import { http, type Address, type EIP1193Provider } from 'viem';
import { arbitrum } from 'viem/chains';

let meeClientCache: MeeClient | null = null;
let orchestratorCache: MultichainSmartAccount | null = null;
let cachedSignerAddress: Address | null = null;
let createSmartAccountInFlight: { address: Address; promise: Promise<SmartAccountResult> } | null =
  null;

const rpcUrl = process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || arbitrum.rpcUrls.default.http[0];

// Check if gasless/sponsored mode is available
export function isGaslessEnabled(): boolean {
  const apiKey = process.env.NEXT_PUBLIC_BICONOMY_MEE_API_KEY;
  const enabled = !!apiKey;
  return enabled;
}

// Check if staging (testnet) mode
export function isStaging(): boolean {
  const staging = process.env.NEXT_PUBLIC_BICONOMY_STAGING === 'true';
  return staging;
}

export interface SmartAccountResult {
  meeClient: MeeClient;
  orchestrator: MultichainSmartAccount;
}

export async function createSmartAccount(
  provider: EIP1193Provider,
  accountAddress: Address
): Promise<SmartAccountResult> {
  if (meeClientCache && orchestratorCache && cachedSignerAddress === accountAddress) {
    return { meeClient: meeClientCache, orchestrator: orchestratorCache };
  }

  console.log('createSmartAccountInFlight:', createSmartAccountInFlight);
  if (createSmartAccountInFlight && createSmartAccountInFlight.address === accountAddress) {
    return createSmartAccountInFlight.promise;
  }

  // Return cached client if signer hasn't changed

  const apiKey = process.env.NEXT_PUBLIC_BICONOMY_MEE_API_KEY;
  const createPromise = (async () => {
    // Create the multichain Nexus account (orchestrator)
    // accountAddress must be passed so the orchestrator uses the Privy EOA address (EIP-7702)
    const orchestrator = await toMultichainNexusAccount({
      signer: provider,
      chainConfigurations: [
        {
          chain: arbitrum,
          transport: http(rpcUrl),
          version: getMEEVersion(MEEVersion.V2_1_0),
          accountAddress,
        },
      ],
    });

    orchestrator.addressOn(arbitrum.id, true);

    // Create MEE client with optional API key for sponsorship
    const meeClient = await createMeeClient({
      account: orchestrator,
      ...(apiKey ? { apiKey } : {}),
    });

    // Cache the clients
    meeClientCache = meeClient;
    orchestratorCache = orchestrator;
    cachedSignerAddress = accountAddress;

    return { meeClient, orchestrator };
  })();

  createSmartAccountInFlight = { address: accountAddress, promise: createPromise };

  try {
    return await createPromise;
  } finally {
    createSmartAccountInFlight = null;
  }
}

export function getSmartAccountAddress(orchestrator: MultichainSmartAccount): Address {
  const addr = orchestrator.addressOn(arbitrum.id, true);
  return addr;
}

export function clearSmartAccountCache(): void {
  meeClientCache = null;
  orchestratorCache = null;
  cachedSignerAddress = null;
}
