'use client';

import { useSmartAccount } from '@/hooks/useSmartAccount';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

export function DepositAddress() {
  const { smartAccountAddress, isLoading } = useSmartAccount();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    if (!smartAccountAddress) return;

    try {
      await navigator.clipboard.writeText(smartAccountAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="h-48 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!smartAccountAddress) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h2 className="text-lg font-semibold text-white mb-4">Deposit USDT0</h2>

      <div className="space-y-4">
        {/* Warning */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
          <p className="text-sm text-yellow-400">
            <span className="font-semibold">⚠️ Important:</span> Only send USDT0 on Arbitrum One to
            this address. Sending other tokens or using the wrong network will result in loss of
            funds.
          </p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center p-4 bg-white rounded-lg">
          <QRCodeSVG value={smartAccountAddress} size={180} level="H" includeMargin={false} />
        </div>

        {/* Address */}
        <div className="space-y-2">
          <p className="text-sm text-gray-400">Your deposit address</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-3 bg-gray-900 rounded-lg text-sm text-white font-mono break-all">
              {smartAccountAddress}
            </code>
            <button
              onClick={copyToClipboard}
              aria-label="Copy address"
              className="w-12 h-10 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              {copied ? (
                <span className="text-green-400 text-lg">✓</span>
              ) : (
                <svg
                  className="w-5 h-5 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Network badge */}
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
            Arbitrum One
          </span>
          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
            Smart Account
          </span>
        </div>
      </div>
    </div>
  );
}
