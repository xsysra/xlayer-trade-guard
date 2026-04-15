import type { RiskDecision, ScanFacts } from "../contracts.js";
import { REASON_CODES } from "./reasons.js";

type DerivedDecision = {
  riskDecision: RiskDecision;
  stopReason: string | null;
  machineReasons: string[];
  riskSummary: string[];
};

export function deriveRiskDecision(scanFacts: ScanFacts): DerivedDecision {
  if (scanFacts.status === "failed") {
    return {
      riskDecision: "warn",
      stopReason: null,
      machineReasons: [REASON_CODES.scanFailedWarnOnly],
      riskSummary: scanFacts.summaryLines
    };
  }

  if (scanFacts.status === "skipped_native_token") {
    return {
      riskDecision: "warn",
      stopReason: null,
      machineReasons: [REASON_CODES.scanSkippedNativeToken],
      riskSummary: scanFacts.summaryLines
    };
  }

  if (scanFacts.effectiveRiskLevel === 4) {
    return {
      riskDecision: "block",
      stopReason: REASON_CODES.scanLevel4Block,
      machineReasons: [REASON_CODES.scanLevel4Block],
      riskSummary: scanFacts.summaryLines
    };
  }

  if (scanFacts.effectiveRiskLevel === 3) {
    return {
      riskDecision: "pause",
      stopReason: REASON_CODES.scanLevel3Pause,
      machineReasons: [REASON_CODES.scanLevel3Pause],
      riskSummary: scanFacts.summaryLines
    };
  }

  if (scanFacts.effectiveRiskLevel === 2) {
    return {
      riskDecision: "warn",
      stopReason: null,
      machineReasons: [],
      riskSummary: scanFacts.summaryLines
    };
  }

  return {
    riskDecision: "proceed",
    stopReason: null,
    machineReasons: [],
    riskSummary: scanFacts.summaryLines
  };
}
