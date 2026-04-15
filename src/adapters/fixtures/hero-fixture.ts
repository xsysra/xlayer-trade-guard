import { DEFAULT_CANONICAL_REQUEST, type ExecuteFacts, type PreflightFacts, type QuoteFacts, type ScanFacts, type TradeGuardRequest } from "../../contracts.js";

export function createFallbackFacts(_request: TradeGuardRequest): {
  preflight: PreflightFacts;
  scan: ScanFacts;
  quote: QuoteFacts;
  execute: ExecuteFacts;
} {
  const request = DEFAULT_CANONICAL_REQUEST;
  const tokenIn = request.tokenIn.trim().toLowerCase();
  const tokenOut = request.tokenOut.trim().toLowerCase();
  const resolvedWalletAddress = null;

  return {
    preflight: {
      cliReady: true,
      xlayerSupported: true,
      walletReady: Boolean(resolvedWalletAddress),
      resolvedWalletAddress,
      tokenInResolved: tokenIn,
      tokenOutResolved: tokenOut,
      reasons: []
    },
    scan: {
      status: "ok",
      effectiveRiskLevel: 1,
      action: "",
      triggeredLabels: [],
      summaryLines: ["[L1] No risk labels triggered"],
      warnings: []
    },
    quote: {
      status: "ok",
      expectedOut: request.amount,
      priceImpactPercent: "0.20",
      routeSummary: [`fixture ${tokenIn}->${tokenOut}`],
      warnings: []
    },
    execute: {
      status: "not_attempted",
      summaryLines: [],
      warnings: []
    }
  };
}
