'use client';

import { ClassifiedError, ErrorType } from '@/lib/errors';
import clsx from 'clsx';

interface ErrorBannerProps {
  error: ClassifiedError | null;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorBanner({ error, onDismiss, className }: ErrorBannerProps) {
  if (!error) return null;

  const getBgColor = () => {
    switch (error.type) {
      case ErrorType.USER_REJECTED:
        return 'bg-yellow-500/10 border-yellow-500/20';
      case ErrorType.NETWORK_ERROR:
        return 'bg-blue-500/10 border-blue-500/20';
      default:
        return 'bg-red-500/10 border-red-500/20';
    }
  };

  const getTextColor = () => {
    switch (error.type) {
      case ErrorType.USER_REJECTED:
        return 'text-yellow-400';
      case ErrorType.NETWORK_ERROR:
        return 'text-blue-400';
      default:
        return 'text-red-400';
    }
  };

  const getIcon = () => {
    switch (error.type) {
      case ErrorType.USER_REJECTED:
        return '⚠️';
      case ErrorType.NETWORK_ERROR:
        return '🌐';
      default:
        return '❌';
    }
  };

  return (
    <div className={clsx('rounded-lg border p-4 flex items-start gap-3', getBgColor(), className)}>
      <span className="text-lg flex-shrink-0">{getIcon()}</span>
      <div className="flex-1 min-w-0">
        <p className={clsx('font-medium', getTextColor())}>{error.message}</p>
        {error.details && <p className="mt-1 text-sm text-gray-500 truncate">{error.details}</p>}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="flex-shrink-0 text-gray-500 hover:text-gray-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
