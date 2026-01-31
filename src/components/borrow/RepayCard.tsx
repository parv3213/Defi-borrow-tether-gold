"use client";

import { TokenInput } from "@/components/shared/TokenAmount";
import { TransactionButton } from "@/components/shared/TransactionButton";
import { SAFE_LTV, WARNING_LTV } from "@/config/morpho";
import { TOKENS } from "@/config/tokens";
import { useMorphoMarket } from "@/hooks/useMorphoMarket";
import { useMorphoPosition } from "@/hooks/useMorphoPosition";
import { useRepay } from "@/hooks/useRepay";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { formatPercent, formatTokenAmount, parseTokenInput } from "@/lib/format";
import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";

type Mode = "repay" | "withdraw";

export function RepayCard() {
  const { usdt0Balance, refetch: refetchBalances } = useTokenBalances();
  const { data: position, refetch: refetchPosition } = useMorphoPosition();
  const { data: market } = useMorphoMarket();
  const { repay, withdraw, txState, resetState, isLoading } = useRepay();

  const [mode, setMode] = useState<Mode>("repay");
  const [amount, setAmount] = useState("");
  const [repayFull, setRepayFull] = useState(false);

  const token = mode === "repay" ? TOKENS.USDT0 : TOKENS.XAUT0;
  const parsedAmount = parseTokenInput(amount, token.decimals);

  // Calculate projected LTV after action
  const projectedLTV = useMemo(() => {
    if (!market || !position) return 0;

    let newCollateral = position.collateral;
    let newDebt = position.borrowedAssets;

    if (mode === "repay" && parsedAmount) {
      newDebt = newDebt > parsedAmount ? newDebt - parsedAmount : BigInt(0);
    } else if (mode === "withdraw" && parsedAmount) {
      newCollateral = newCollateral > parsedAmount ? newCollateral - parsedAmount : BigInt(0);
    }

    if (newCollateral === BigInt(0)) return 0;
    const collateralValue = (newCollateral * market.oraclePrice) / BigInt(10 ** 36);
    if (collateralValue === BigInt(0)) return 0;

    return Number(newDebt) / Number(collateralValue);
  }, [market, position, mode, parsedAmount]);

  // Max withdrawable collateral (keeping position healthy)
  const maxWithdraw = useMemo(() => {
    if (!market || !position || position.collateral === BigInt(0)) return BigInt(0);

    const currentDebt = position.borrowedAssets;
    if (currentDebt === BigInt(0)) return position.collateral;

    // Required collateral value to maintain safe LTV
    const requiredCollateralValue = (currentDebt * BigInt(1e18)) / BigInt(Math.floor(SAFE_LTV * 1e18));
    const requiredCollateral = (requiredCollateralValue * BigInt(10 ** 36)) / market.oraclePrice;

    if (requiredCollateral >= position.collateral) return BigInt(0);
    return position.collateral - requiredCollateral;
  }, [market, position]);

  // Reset on success
  useEffect(() => {
    if (txState.status === "success") {
      setAmount("");
      setRepayFull(false);
      refetchBalances();
      refetchPosition();
      const timeout = setTimeout(() => {
        resetState();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [txState.status, refetchBalances, refetchPosition, resetState]);

  const handleAction = async () => {
    if (mode === "repay") {
      if (repayFull) {
        await repay({ repayAmount: BigInt(0), repayFull: true });
      } else if (parsedAmount && parsedAmount > BigInt(0)) {
        await repay({ repayAmount: parsedAmount });
      }
    } else {
      if (parsedAmount && parsedAmount > BigInt(0)) {
        await withdraw({ withdrawAmount: parsedAmount });
      }
    }
  };

  const handleMax = () => {
    if (mode === "repay") {
      // Max is the debt or balance, whichever is smaller
      if (position && usdt0Balance?.balance) {
        const maxRepay =
          position.borrowedAssets < usdt0Balance.balance
            ? position.borrowedAssets
            : usdt0Balance.balance;
        setAmount(formatUnits(maxRepay, TOKENS.USDT0.decimals));
      }
    } else {
      if (maxWithdraw > BigInt(0)) {
        setAmount(formatUnits(maxWithdraw, TOKENS.XAUT0.decimals));
      }
    }
  };

  // Validation
  const hasPosition = position && position.borrowedAssets > BigInt(0);
  const hasCollateral = position && position.collateral > BigInt(0);

  const insufficientBalance =
    mode === "repay" &&
    parsedAmount &&
    usdt0Balance?.balance &&
    parsedAmount > usdt0Balance.balance;

  const exceedsDebt =
    mode === "repay" && parsedAmount && position && parsedAmount > position.borrowedAssets;

  const exceedsCollateral =
    mode === "withdraw" && parsedAmount && position && parsedAmount > position.collateral;

  const wouldBeUnsafe = mode === "withdraw" && projectedLTV > (market?.lltv || 0.77);

  const canAct =
    !isLoading &&
    ((mode === "repay" &&
      (repayFull || (parsedAmount && parsedAmount > BigInt(0))) &&
      !insufficientBalance &&
      hasPosition) ||
      (mode === "withdraw" &&
        parsedAmount &&
        parsedAmount > BigInt(0) &&
        !exceedsCollateral &&
        !wouldBeUnsafe &&
        hasCollateral));

  if (!hasPosition && !hasCollateral) {
    return null;
  }

  return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-white mb-4">Manage Position</h2>

          {/* Mode toggle */}
          <div className="flex gap-2 mb-4">
              <button
                  onClick={() => {
                      setMode("repay");
                      setAmount("");
                      resetState();
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      mode === "repay" ? "bg-indigo-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
              >
                  Repay Debt
              </button>
              <button
                  onClick={() => {
                      setMode("withdraw");
                      setAmount("");
                      resetState();
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      mode === "withdraw" ? "bg-indigo-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
              >
                  Withdraw Collateral
              </button>
          </div>

          <div className="space-y-4 flex-1 flex flex-col">
              {mode === "repay" && (
                  <>
                      {/* Current debt display */}
                      <div className="bg-gray-900 rounded-lg p-4">
                          <p className="text-sm text-gray-400 mb-1">Current Debt</p>
                          <p className="text-xl font-semibold text-white">
                              {position ? formatTokenAmount(position.borrowedAssets, TOKENS.USDT0.decimals) : "0.00"}{" "}
                              USDT0
                          </p>
                      </div>

                      {/* Repay full toggle */}
                      <label className="flex items-center gap-3 cursor-pointer">
                          <input
                              type="checkbox"
                              checked={repayFull}
                              onChange={(e) => {
                                  setRepayFull(e.target.checked);
                                  if (e.target.checked) setAmount("");
                              }}
                              className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-gray-300">Repay full debt</span>
                      </label>

                      {!repayFull && (
                          <TokenInput
                              value={amount}
                              onChange={setAmount}
                              token={TOKENS.USDT0}
                              balance={usdt0Balance?.balance}
                              disabled={isLoading}
                              label="Repay Amount"
                              onMax={handleMax}
                          />
                      )}
                  </>
              )}

              {mode === "withdraw" && (
                  <>
                      {/* Current collateral display */}
                      <div className="bg-gray-900 rounded-lg p-4">
                          <p className="text-sm text-gray-400 mb-1">Current Collateral</p>
                          <p className="text-xl font-semibold text-white">
                              {position ? formatTokenAmount(position.collateral, TOKENS.XAUT0.decimals, 6) : "0.000000"}{" "}
                              XAUT0
                          </p>
                      </div>

                      <TokenInput
                          value={amount}
                          onChange={setAmount}
                          token={TOKENS.XAUT0}
                          balance={position?.collateral}
                          disabled={isLoading}
                          label="Withdraw Amount"
                          onMax={handleMax}
                      />

                      {maxWithdraw > BigInt(0) && (
                          <p className="text-sm text-gray-400">
                              Safe max:{" "}
                              <span className="text-green-400">
                                  {formatTokenAmount(maxWithdraw, TOKENS.XAUT0.decimals, 6)} XAUT0
                              </span>
                          </p>
                      )}

                      {/* Projected LTV */}
                      {parsedAmount && parsedAmount > BigInt(0) && (
                          <div className="bg-gray-900 rounded-lg p-4">
                              <div className="flex justify-between text-sm">
                                  <span className="text-gray-400">Projected LTV</span>
                                  <span
                                      className={
                                          projectedLTV > WARNING_LTV
                                              ? projectedLTV > (market?.lltv || 0.77)
                                                  ? "text-red-400"
                                                  : "text-yellow-400"
                                              : "text-green-400"
                                      }
                                  >
                                      {formatPercent(projectedLTV)}
                                  </span>
                              </div>
                          </div>
                      )}
                  </>
              )}

              {/* Error messages */}
              {insufficientBalance && <p className="text-sm text-red-400">Insufficient USDT0 balance</p>}
              {exceedsDebt && <p className="text-sm text-yellow-400">Amount exceeds debt</p>}
              {exceedsCollateral && <p className="text-sm text-red-400">Amount exceeds collateral</p>}
              {wouldBeUnsafe && <p className="text-sm text-red-400">Withdrawal would make position unhealthy</p>}

              {/* Action button */}
              <div className="mt-auto">
                  <TransactionButton onClick={handleAction} state={txState} disabled={!canAct}>
                      {mode === "repay" ? (repayFull ? "Repay Full Debt" : "Repay") : "Withdraw Collateral"}
                  </TransactionButton>
              </div>
          </div>
      </div>
  );
}
