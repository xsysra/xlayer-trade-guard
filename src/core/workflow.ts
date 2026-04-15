import type {
  ExecuteFacts,
  PreflightFacts,
  QuoteFacts,
  ScanFacts,
  TradeGuardRequest,
  TradeGuardWorkflowResult
} from "../contracts.js";
import { deriveRiskDecision } from "./decision.js";
import { REASON_CODES } from "./reasons.js";

type WorkflowInput = {
  request: TradeGuardRequest;
  preflight: PreflightFacts;
  scan: ScanFacts | null;
  quote: QuoteFacts | null;
  execute: ExecuteFacts | null;
};

function getPreflightStopReason(preflight: PreflightFacts): string | null {
  if (!preflight.cliReady) {
    return REASON_CODES.preflightCliUnavailable;
  }

  if (!preflight.xlayerSupported) {
    return REASON_CODES.preflightXlayerUnsupported;
  }

  if (!preflight.tokenInResolved) {
    return REASON_CODES.preflightTokenInUnresolved;
  }

  if (!preflight.tokenOutResolved) {
    return REASON_CODES.preflightTokenOutUnresolved;
  }

  return null;
}

function deriveTradeReadiness(
  preflight: PreflightFacts,
  quote: QuoteFacts | null
): TradeGuardWorkflowResult["tradeReadiness"] {
  if (getPreflightStopReason(preflight)) {
    return "cannot";
  }

  if (!quote) {
    return "can_quote";
  }

  if (quote.status === "ok") {
    return preflight.walletReady ? "can_execute" : "can_quote";
  }

  return "cannot";
}

export function evaluateTradeGuardWorkflow(input: WorkflowInput): TradeGuardWorkflowResult {
  const { request, preflight, scan, quote, execute } = input;
  const preflightStopReason = getPreflightStopReason(preflight);
  const userConfirmed = Boolean(request.continueOnPause);

  if (preflightStopReason) {
    return {
      network: request.network,
      tokenIn: request.tokenIn,
      tokenOut: request.tokenOut,
      amount: request.amount,
      riskDecision: null,
      tradeReadiness: "cannot",
      scanStatus: "not_started",
      stopReason: preflightStopReason,
      userConfirmed,
      proofMode: request.executeLive ? "execute_live" : "quote_live",
      riskSummary: [],
      machineReasons: [preflightStopReason],
      quoteAvailable: false,
      executionAttempted: false,
      executionState: "not_attempted",
      resolvedWalletAddress: preflight.resolvedWalletAddress
    };
  }

  const derived = scan ? deriveRiskDecision(scan) : null;
  const scanStatus = scan ? scan.status : "not_started";
  const tradeReadiness = deriveTradeReadiness(preflight, quote);

  if (derived?.riskDecision === "block") {
    return {
      network: request.network,
      tokenIn: request.tokenIn,
      tokenOut: request.tokenOut,
      amount: request.amount,
      riskDecision: "block",
      tradeReadiness,
      scanStatus,
      stopReason: derived.stopReason,
      userConfirmed,
      proofMode: request.executeLive ? "execute_live" : "quote_live",
      riskSummary: derived.riskSummary,
      machineReasons: derived.machineReasons,
      quoteAvailable: false,
      executionAttempted: false,
      executionState: "not_attempted",
      resolvedWalletAddress: preflight.resolvedWalletAddress
    };
  }

  if (derived?.riskDecision === "pause" && !request.continueOnPause) {
    return {
      network: request.network,
      tokenIn: request.tokenIn,
      tokenOut: request.tokenOut,
      amount: request.amount,
      riskDecision: "pause",
      tradeReadiness,
      scanStatus,
      stopReason: derived.stopReason,
      userConfirmed,
      proofMode: request.executeLive ? "execute_live" : "quote_live",
      riskSummary: derived.riskSummary,
      machineReasons: derived.machineReasons,
      quoteAvailable: false,
      executionAttempted: false,
      executionState: "not_attempted",
      resolvedWalletAddress: preflight.resolvedWalletAddress
    };
  }

  const quoteAvailable = quote?.status === "ok";

  const stopReason =
    quote?.status === "cannot"
      ? quote.errorClass ?? REASON_CODES.quoteNoRoute
      : quote?.status === "failed"
        ? quote.errorClass ?? REASON_CODES.quoteFailedTimeout
        : request.executeLive && quote?.status === "ok" && !preflight.walletReady
          ? REASON_CODES.executeWalletNotReady
          : execute?.status === "failed"
            ? execute.errorClass ?? REASON_CODES.executeFailedAfterRetry
            : null;

  return {
    network: request.network,
    tokenIn: request.tokenIn,
    tokenOut: request.tokenOut,
    amount: request.amount,
    riskDecision: derived?.riskDecision ?? null,
    tradeReadiness,
    scanStatus,
    stopReason,
    userConfirmed,
    proofMode: request.executeLive ? "execute_live" : "quote_live",
    riskSummary: derived?.riskSummary ?? [],
    machineReasons: [...(derived?.machineReasons ?? []), ...(stopReason ? [stopReason] : [])],
    quoteAvailable,
    executionAttempted: Boolean(request.executeLive && preflight.walletReady && quote?.status === "ok"),
    executionState: execute?.status ?? "not_attempted",
    resolvedWalletAddress: preflight.resolvedWalletAddress
  };
}
