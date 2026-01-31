'use client';

import {
  clearSmartAccountCache,
  createSmartAccount,
  getSmartAccountAddress,
} from '@/services/biconomy';
import { NexusClient } from '@biconomy/sdk';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useCallback, useEffect, useState } from 'react';
import { createWalletClient, custom, type Address, type WalletClient } from 'viem';
import { arbitrum } from 'viem/chains';

interface SmartAccountState {
  nexusClient: NexusClient | null;
  smartAccountAddress: Address | null;
  isLoading: boolean;
  error: Error | null;
}

export function useSmartAccount() {
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const [state, setState] = useState<SmartAccountState>({
    nexusClient: null,
    smartAccountAddress: null,
    isLoading: false,
    error: null,
  });

  const initSmartAccount = useCallback(async () => {
    // Find embedded wallet
    const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');

    if (!embeddedWallet) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Get the ethereum provider from embedded wallet
      const provider = await embeddedWallet.getEthereumProvider();

      // Create viem wallet client
      const walletClient = createWalletClient({
        account: embeddedWallet.address as Address,
        chain: arbitrum,
        transport: custom(provider),
      });

      // Create Biconomy Nexus client
      const nexusClient = await createSmartAccount(walletClient as WalletClient);
      const smartAccountAddress = getSmartAccountAddress(nexusClient);

      setState({
        nexusClient,
        smartAccountAddress,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to initialize smart account:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to initialize'),
      }));
    }
  }, [wallets]);

  useEffect(() => {
    if (!ready || !authenticated) {
      setState({
        nexusClient: null,
        smartAccountAddress: null,
        isLoading: false,
        error: null,
      });
      clearSmartAccountCache();
      return;
    }

    if (wallets.length > 0 && !state.nexusClient && !state.isLoading) {
      initSmartAccount();
    }
  }, [ready, authenticated, wallets, state.nexusClient, state.isLoading, initSmartAccount]);

  const sendTransaction = useCallback(
    async (calls: { to: Address; data: `0x${string}`; value?: bigint }[]) => {
      if (!state.nexusClient) {
        throw new Error('Smart account not initialized');
      }

      // TODO Simulate transaction before sending
      const hash = await state.nexusClient.sendTransaction({
        calls,
      });

      // Wait for transaction receipt
      const receipt = await state.nexusClient.waitForTransactionReceipt({
        hash,
      });

      return {
        hash,
        receipt,
      };
    },
    [state.nexusClient]
  );

  return {
    ...state,
    sendTransaction,
    refetch: initSmartAccount,
  };
}
