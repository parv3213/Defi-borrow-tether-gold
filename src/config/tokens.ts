import { TokenInfo } from '@/types';
import { CONTRACTS } from './contracts';

export const TOKENS: Record<string, TokenInfo> = {
  USDT0: {
    address: CONTRACTS.USDT0,
    symbol: 'USDT0',
    name: 'Tether USD',
    decimals: 6,
  },
  XAUT0: {
    address: CONTRACTS.XAUT0,
    symbol: 'XAUT0',
    name: 'Tether Gold',
    decimals: 6,
  },
  WETH: {
    address: CONTRACTS.WETH,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
  },
};

export const TOKEN_LIST = Object.values(TOKENS);

export function getTokenByAddress(address: string): TokenInfo | undefined {
  return TOKEN_LIST.find(t => t.address.toLowerCase() === address.toLowerCase());
}

export function getTokenBySymbol(symbol: string): TokenInfo | undefined {
  return TOKENS[symbol.toUpperCase()];
}
