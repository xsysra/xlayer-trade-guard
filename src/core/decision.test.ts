import { describe, expect, it } from "vitest";

import { deriveRiskDecision } from "./decision.js";

describe("deriveRiskDecision", () => {
  it("blocks level 4 buy risk", () => {
    expect(
      deriveRiskDecision({
        status: "ok",
        effectiveRiskLevel: 4,
        action: "block",
        triggeredLabels: ["Honeypot"],
        summaryLines: ["[L4] Honeypot"],
        warnings: []
      })
    ).toMatchObject({
      riskDecision: "block",
      stopReason: "scan_level4_block",
      machineReasons: ["scan_level4_block"],
      riskSummary: ["[L4] Honeypot"]
    });
  });

  it("pauses level 3 buy risk", () => {
    expect(
      deriveRiskDecision({
        status: "ok",
        effectiveRiskLevel: 3,
        action: "warn",
        triggeredLabels: ["Low Liquidity"],
        summaryLines: ["[L3] Low Liquidity"],
        warnings: []
      })
    ).toMatchObject({
      riskDecision: "pause",
      stopReason: "scan_level3_pause",
      machineReasons: ["scan_level3_pause"]
    });
  });

  it("warns and continues when scan fails", () => {
    expect(
      deriveRiskDecision({
        status: "failed",
        effectiveRiskLevel: null,
        action: null,
        triggeredLabels: [],
        summaryLines: ["Token scan failed before verdict."],
        warnings: ["timeout"]
      })
    ).toMatchObject({
      riskDecision: "warn",
      stopReason: null,
      machineReasons: ["scan_failed_warn_only"]
    });
  });

  it("warns and continues when the target token is native", () => {
    expect(
      deriveRiskDecision({
        status: "skipped_native_token",
        effectiveRiskLevel: null,
        action: null,
        triggeredLabels: [],
        summaryLines: ["Target token is native, so token-scan was skipped."],
        warnings: ["native-token-skip"]
      })
    ).toMatchObject({
      riskDecision: "warn",
      stopReason: null,
      machineReasons: ["scan_skipped_native_token"]
    });
  });
});
