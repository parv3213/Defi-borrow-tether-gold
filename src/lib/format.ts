import { formatUnits } from 'viem';

// Format token amount with proper decimals
export function formatTokenAmount(
  amount: bigint,
  decimals: number,
  maxDecimals: number = 4
): string {
  const formatted = formatUnits(amount, decimals);
  const num = parseFloat(formatted);

  if (num === 0) return '0';
  if (num < 0.00001) return '< 0.00001';

  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

// Format USD value
export function formatUSD(amount: number | bigint): string {
  const num = typeof amount === 'bigint' ? Number(amount) / 1e6 : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

// Format percentage
export function formatPercent(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

// Format APR
export function formatAPR(apr: number): string {
  return formatPercent(apr, 2);
}

// Format health factor
export function formatHealthFactor(hf: number): string {
  if (hf === Infinity || hf > 100) return '∞';
  if (hf < 0.01) return '< 0.01';
  return hf.toFixed(2);
}

// Parse user input to bigint with decimals
export function parseTokenInput(input: string, decimals: number): bigint | null {
  try {
    if (!input || input === '') return null;

    // Remove commas
    const cleaned = input.replace(/,/g, '');

    // Validate number format
    if (!/^\d*\.?\d*$/.test(cleaned)) return null;

    const parts = cleaned.split('.');
    const whole = parts[0] || '0';
    let fraction = parts[1] || '';

    // Pad or truncate fraction to match decimals
    if (fraction.length > decimals) {
      fraction = fraction.slice(0, decimals);
    } else {
      fraction = fraction.padEnd(decimals, '0');
    }

    return BigInt(whole + fraction);
  } catch {
    return null;
  }
}

// Truncate address for display
export function truncateAddress(address: string, chars: number = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

// Format transaction hash
export function formatTxHash(hash: string): string {
  return truncateAddress(hash, 6);
}

// Get Arbiscan URL for transaction
export function getArbiscanTxUrl(hash: string): string {
  return `https://arbiscan.io/tx/${hash}`;
}

// Get Arbiscan URL for address
export function getArbiscanAddressUrl(address: string): string {
  return `https://arbiscan.io/address/${address}`;
}
