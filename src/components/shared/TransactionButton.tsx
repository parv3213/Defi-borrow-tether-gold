"use client";

import { formatTxHash, getArbiscanTxUrl } from "@/lib/format";
import { TransactionState } from "@/types";
import clsx from "clsx";

interface TransactionButtonProps {
  onClick: () => void;
  state: TransactionState;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function TransactionButton({
  onClick,
  state,
  children,
  disabled,
  className,
}: TransactionButtonProps) {
  const isLoading = state.status === "pending" || state.status === "confirming";
  const isDisabled = disabled || isLoading;

  return (
    <div className="space-y-2">
      <button
        onClick={onClick}
        disabled={isDisabled}
        className={clsx(
          "w-full py-3 px-4 font-semibold rounded-lg transition-all",
          isDisabled
            ? "bg-gray-600 text-gray-400 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-700 text-white",
          className
        )}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {state.status === "pending" ? "Preparing..." : "Confirming..."}
          </span>
        ) : (
          children
        )}
      </button>

      {state.status === "success" && state.hash && (
        <div className="text-center">
          <a
            href={getArbiscanTxUrl(state.hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-400 hover:text-green-300"
          >
            ✓ Transaction confirmed: {formatTxHash(state.hash)}
          </a>
        </div>
      )}

      {state.status === "error" && state.error && (
        <div className="text-center text-sm text-red-400">
          ✗ {state.error}
        </div>
      )}
    </div>
  );
}
