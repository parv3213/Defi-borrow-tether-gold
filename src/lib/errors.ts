// Error types for classification
export enum ErrorType {
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INSUFFICIENT_ALLOWANCE = 'INSUFFICIENT_ALLOWANCE',
  SLIPPAGE_TOO_HIGH = 'SLIPPAGE_TOO_HIGH',
  POSITION_UNHEALTHY = 'POSITION_UNHEALTHY',
  EXCEEDS_LTV = 'EXCEEDS_LTV',
  INSUFFICIENT_LIQUIDITY = 'INSUFFICIENT_LIQUIDITY',
  USER_REJECTED = 'USER_REJECTED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export interface ClassifiedError {
  type: ErrorType;
  message: string;
  details?: string;
}

// Classify error from various sources
export function classifyError(error: unknown): ClassifiedError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // User rejection
  if (
    lowerMessage.includes('user rejected') ||
    lowerMessage.includes('user denied') ||
    lowerMessage.includes('cancelled')
  ) {
    return {
      type: ErrorType.USER_REJECTED,
      message: 'Transaction was cancelled',
    };
  }

  // Insufficient balance
  if (
    lowerMessage.includes('insufficient balance') ||
    lowerMessage.includes('exceeds balance') ||
    lowerMessage.includes('transfer amount exceeds balance')
  ) {
    return {
      type: ErrorType.INSUFFICIENT_BALANCE,
      message: 'Insufficient token balance',
    };
  }

  // Insufficient allowance
  if (
    lowerMessage.includes('insufficient allowance') ||
    lowerMessage.includes('exceeds allowance')
  ) {
    return {
      type: ErrorType.INSUFFICIENT_ALLOWANCE,
      message: 'Token approval required',
    };
  }

  // Slippage
  if (
    lowerMessage.includes('slippage') ||
    lowerMessage.includes('too little received') ||
    lowerMessage.includes('price moved')
  ) {
    return {
      type: ErrorType.SLIPPAGE_TOO_HIGH,
      message: 'Price changed too much. Try increasing slippage tolerance.',
    };
  }

  // Morpho position health
  if (
    lowerMessage.includes('unhealthy') ||
    lowerMessage.includes('insufficient collateral') ||
    lowerMessage.includes('exceeds borrow')
  ) {
    return {
      type: ErrorType.POSITION_UNHEALTHY,
      message: 'This would make your position unhealthy',
    };
  }

  // LTV exceeded
  if (lowerMessage.includes('ltv') || lowerMessage.includes('loan-to-value')) {
    return {
      type: ErrorType.EXCEEDS_LTV,
      message: 'Borrow amount exceeds maximum LTV',
    };
  }

  // Insufficient liquidity
  if (
    lowerMessage.includes('insufficient liquidity') ||
    lowerMessage.includes('not enough liquidity')
  ) {
    return {
      type: ErrorType.INSUFFICIENT_LIQUIDITY,
      message: 'Not enough liquidity available',
    };
  }

  // Network errors
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('failed to fetch')
  ) {
    return {
      type: ErrorType.NETWORK_ERROR,
      message: 'Network error. Please try again.',
    };
  }

  // Contract execution errors
  if (lowerMessage.includes('execution reverted') || lowerMessage.includes('revert')) {
    return {
      type: ErrorType.CONTRACT_ERROR,
      message: 'Transaction failed',
      details: errorMessage,
    };
  }

  // Unknown
  return {
    type: ErrorType.UNKNOWN,
    message: 'An unexpected error occurred',
    details: errorMessage,
  };
}

// Get user-friendly error message
export function getErrorMessage(error: unknown): string {
  const classified = classifyError(error);
  return classified.message;
}
