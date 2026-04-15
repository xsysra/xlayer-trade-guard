export type ProofMode = "fallback" | "quote_live" | "execute_live";
export type RiskDecision = "block" | "pause" | "warn" | "proceed";
export type TradeReadiness = "can_quote" | "can_execute" | "cannot";

export type TradeGuardRequest = {
  network: "eip155:196";
  tokenIn: string;
  tokenOut: string;
  amount: string;
  amountKind: "readable";
  walletAddress?: string;
  continueOnPause?: boolean;
  executeLive?: boolean;
  slippagePercent?: string;
  gasLevel?: "average" | "fast" | "slow";
  runLabel?: string;
};

export type PreflightFacts = {
  cliReady: boolean;
  xlayerSupported: boolean;
  walletReady: boolean;
  resolvedWalletAddress: string | null;
  tokenInResolved: string | null;
  tokenOutResolved: string | null;
  reasons: string[];
};

export type ScanFacts = {
  status: "ok" | "failed" | "skipped_native_token";
  effectiveRiskLevel: 1 | 2 | 3 | 4 | null;
  action: "block" | "warn" | "" | null;
  triggeredLabels: string[];
  summaryLines: string[];
  warnings: string[];
};

export type QuoteFacts = {
  status: "ok" | "cannot" | "failed";
  expectedOut?: string;
  priceImpactPercent?: string;
  routeSummary?: string[];
  warnings: string[];
  errorClass?: string;
};

export type ExecuteFacts = {
  status: "not_attempted" | "submitted" | "confirmed" | "failed";
  approveTxHash?: string;
  swapTxHash?: string;
  summaryLines: string[];
  warnings: string[];
  errorClass?: string;
};

export type TradeGuardWorkflowResult = {
  network: "eip155:196";
  tokenIn: string;
  tokenOut: string;
  amount: string;
  riskDecision: RiskDecision | null;
  tradeReadiness: TradeReadiness;
  scanStatus: "not_started" | "ok" | "failed" | "skipped_native_token";
  stopReason: string | null;
  userConfirmed: boolean;
  proofMode: ProofMode;
  riskSummary: string[];
  machineReasons: string[];
  quoteAvailable: boolean;
  executionAttempted: boolean;
  executionState: "not_attempted" | "submitted" | "confirmed" | "failed";
  resolvedWalletAddress: string | null;
  explorerUrl?: string;
};

export type TradeGuardResult = TradeGuardWorkflowResult & {
  artifactPath: string;
};

export const DEFAULT_CANONICAL_REQUEST: TradeGuardRequest = {
  network: "eip155:196",
  tokenIn: "okb",
  tokenOut: "usdc",
  amount: "0.1",
  amountKind: "readable",
  continueOnPause: false,
  executeLive: false,
  runLabel: "canonical-okb-usdc"
};

export function buildProofRequest(
  mode: ProofMode,
  overrides: Partial<TradeGuardRequest> = {}
): TradeGuardRequest {
  return {
    ...DEFAULT_CANONICAL_REQUEST,
    ...overrides,
    executeLive: mode === "execute_live"
  };
}
