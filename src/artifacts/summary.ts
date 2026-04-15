import type { TradeGuardResult } from "../contracts.js";

function describeMode(result: TradeGuardResult): string {
  if (result.proofMode === "fallback") {
    return "I ran the canonical fallback path for xlayer-trade-guard.";
  }

  if (result.proofMode === "quote_live") {
    return "I ran the live quote path for xlayer-trade-guard on X Layer.";
  }

  return "I ran the live execute path for xlayer-trade-guard on X Layer.";
}

function describeOutcome(result: TradeGuardResult): string {
  const fields = [
    `${result.tokenIn} -> ${result.tokenOut} on ${result.network}`,
    `amount ${result.amount}`,
    `riskDecision = ${result.riskDecision ?? "not_started"}`,
    `tradeReadiness = ${result.tradeReadiness}`,
    `quoteAvailable = ${result.quoteAvailable}`,
    `executionState = ${result.executionState}`
  ];

  if (result.stopReason) {
    fields.push(`stopReason = ${result.stopReason}`);
  }

  return `Result: ${fields.join(", ")}.`;
}

function describeProofBoundary(result: TradeGuardResult): string {
  if (result.proofMode === "fallback") {
    return "This proves the guarded workflow and artifact contract. It does not prove live quote or live execute yet.";
  }

  if (result.proofMode === "quote_live") {
    if (result.quoteAvailable) {
      return "This proves the repo reached the live quote path under the current environment. It does not prove live execute yet.";
    }

    return "This shows the live quote path fails closed under the current environment. It does not prove live execute yet.";
  }

  if (result.executionState === "submitted" || result.executionState === "confirmed") {
    return "This proves the repo reached the live execute path under the current environment. Raw proof remains available in the artifact bundle if needed.";
  }

  return "This shows the live execute path and its current guard outcome. It does not prove a completed live execution yet.";
}

export function renderConsoleSummary(result: TradeGuardResult): string {
  return [describeMode(result), describeOutcome(result), describeProofBoundary(result)].join("\n\n");
}

export function renderSummaryMarkdown(result: TradeGuardResult): string {
  return renderConsoleSummary(result);
}
