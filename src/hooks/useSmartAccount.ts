'use client';

import { CONTRACTS } from '@/config/contracts';
import {
  clearSmartAccountCache,
  createSmartAccount,
  getSmartAccountAddress,
} from '@/services/biconomy';
import { getMeeScanLink, type MeeClient, type MultichainSmartAccount } from '@biconomy/abstractjs';
import { usePrivy, useSign7702Authorization, useWallets } from '@privy-io/react-auth';
import { useCallback, useEffect, useState } from 'react';
import { type Address, type EIP1193Provider, type SignedAuthorization } from 'viem';
import { arbitrum } from 'viem/chains';

interface SmartAccountState {
  meeClient: MeeClient | null;
  orchestrator: MultichainSmartAccount | null;
  smartAccountAddress: Address | null;
  authorization: SignedAuthorization | null;
  isLoading: boolean;
  error: Error | null;
}

// Module-level singleton state to prevent duplicate initialization across hook instances
let globalInitPromise: Promise<{
  meeClient: MeeClient;
  orchestrator: MultichainSmartAccount;
  smartAccountAddress: Address;
  authorization: SignedAuthorization;
} | null> | null = null;
let globalInitResult: {
  meeClient: MeeClient;
  orchestrator: MultichainSmartAccount;
  smartAccountAddress: Address;
  authorization: SignedAuthorization;
} | null = null;
let globalInitForAddress: Address | null = null;

function clearGlobalInit() {
  globalInitPromise = null;
  globalInitResult = null;
  globalInitForAddress = null;
}

export function useSmartAccount() {
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const { signAuthorization } = useSign7702Authorization();
  const [state, setState] = useState<SmartAccountState>({
    meeClient: null,
    orchestrator: null,
    smartAccountAddress: null,
    authorization: null,
    isLoading: false,
    error: null,
  });

  const initSmartAccount = useCallback(async () => {
    // Find embedded wallet
    const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');

    if (!embeddedWallet) {
      return;
    }

    const walletAddress = embeddedWallet.address as Address;

    // If we already have a result for this address, use it immediately
    if (globalInitResult && globalInitForAddress === walletAddress) {
      setState({
        meeClient: globalInitResult.meeClient,
        orchestrator: globalInitResult.orchestrator,
        smartAccountAddress: globalInitResult.smartAccountAddress,
        authorization: globalInitResult.authorization,
        isLoading: false,
        error: null,
      });
      return;
    }

    // If init is already in progress for this address, wait for it
    if (globalInitPromise && globalInitForAddress === walletAddress) {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      try {
        const result = await globalInitPromise;
        if (result) {
          setState({
            meeClient: result.meeClient,
            orchestrator: result.orchestrator,
            smartAccountAddress: result.smartAccountAddress,
            authorization: result.authorization,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error : new Error('Failed to initialize'),
        }));
      }
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    globalInitForAddress = walletAddress;

    globalInitPromise = (async () => {
      try {
        // Get the ethereum provider from embedded wallet
        const provider = (await embeddedWallet.getEthereumProvider()) as EIP1193Provider;

        // Sign EIP-7702 authorization to install Nexus smart account on the EOA
        const authorization = (await signAuthorization({
          // @ts-ignore
          contractAddress: CONTRACTS.NEXUS_IMPLEMENTATION,
          chainId: arbitrum.id,
        })) as SignedAuthorization;

        // Create Biconomy MEE client and orchestrator
        const { meeClient, orchestrator } = await createSmartAccount(provider, walletAddress);

        const smartAccountAddress = getSmartAccountAddress(orchestrator);

        const result = { meeClient, orchestrator, smartAccountAddress, authorization };
        globalInitResult = result;
        return result;
      } catch (error) {
        console.error('[useSmartAccount] Failed to initialize smart account:', error);
        // Clear global state on error to allow retry
        clearGlobalInit();
        throw error;
      }
    })();

    try {
      const result = await globalInitPromise;
      if (result) {
        setState({
          meeClient: result.meeClient,
          orchestrator: result.orchestrator,
          smartAccountAddress: result.smartAccountAddress,
          authorization: result.authorization,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to initialize'),
      }));
    }
  }, [wallets, signAuthorization]);

  useEffect(() => {
    if (!ready || !authenticated) {
      clearGlobalInit();
      setState({
        meeClient: null,
        orchestrator: null,
        smartAccountAddress: null,
        authorization: null,
        isLoading: false,
        error: null,
      });
      clearSmartAccountCache();
      return;
    }

    // If we have wallets and no meeClient yet, call initSmartAccount
    // initSmartAccount internally handles: cached result, in-flight promise, or fresh init
    if (wallets.length > 0 && !state.meeClient && !state.isLoading) {
      initSmartAccount();
    }
  }, [ready, authenticated, wallets, state.meeClient, state.isLoading, initSmartAccount]);

  const sendTransaction = useCallback(
    async (calls: { to: Address; data: `0x${string}`; value?: bigint }[]) => {
      if (!state.meeClient || !state.orchestrator || !state.authorization) {
        throw new Error('Smart account not initialized');
      }
      try {
        console.log('Calls:', calls);

        // Build instruction from calls
        const instruction = await state.orchestrator.build({
          type: 'default',
          data: {
            calls: calls.map(call => ({
              to: call.to,
              value: call.value ?? BigInt(0),
              data: call.data,
            })),
            chainId: arbitrum.id,
          },
        });

        // Get the actual quote for execution
        // delegate + authorization enable EIP-7702 (smart account installed on EOA)
        const quote = await state.meeClient.getQuote({
          instructions: [instruction],
          sponsorship: true,
          delegate: true,
          authorizations: [state.authorization],
        });
        console.log('Quote:', JSON.stringify(quote, null, 2));

        // Execute the quote
        const result = await state.meeClient.executeQuote({ quote });
        const hash = result.hash;

        // Get MEE scan link for tracking
        const meeScanLink = getMeeScanLink(hash);

        // Wait for transaction to be confirmed
        console.log('Waiting for transaction confirmation...');
        const receipt = await state.meeClient.waitForSupertransactionReceipt({ hash });
        console.log('Transaction confirmed:', receipt);

        return {
          hash,
          meeScanLink,
          receipt,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Transaction failed:', error);
        throw new Error(errorMessage);
      }
    },
    [state.meeClient, state.orchestrator, state.authorization]
  );

  return {
    ...state,
    // Backwards compatibility: expose nexusClient-like interface
    nexusClient: state.meeClient,
    sendTransaction,
    refetch: initSmartAccount,
  };
}
