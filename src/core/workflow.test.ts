import { describe, expect, it } from "vitest";

import { buildProofRequest } from "../contracts.js";
import { evaluateTradeGuardWorkflow } from "./workflow.js";

describe("evaluateTradeGuardWorkflow", () => {
  it("stops before scan with a workflow-level not_started state when the CLI is unavailable", () => {
    const result = evaluateTradeGuardWorkflow({
      request: buildProofRequest("quote_live"),
      preflight: {
        cliReady: false,
        xlayerSupported: true,
        walletReady: false,
        resolvedWalletAddress: null,
        tokenInResolved: "okb",
        tokenOutResolved: "usdc",
        reasons: ["preflight_cli_unavailable"]
      },
      scan: null,
      quote: null,
      execute: null
    });

    expect(result.stopReason).toBe("preflight_cli_unavailable");
    expect(result.tradeReadiness).toBe("cannot");
    expect(result.quoteAvailable).toBe(false);
    expect(result.scanStatus).toBe("not_started");
  });

  it("stops before scan when quote-blocking preflight says xlayer is unsupported", () => {
    const result = evaluateTradeGuardWorkflow({
      request: buildProofRequest("quote_live"),
      preflight: {
        cliReady: true,
        xlayerSupported: false,
        walletReady: false,
        resolvedWalletAddress: null,
        tokenInResolved: "okb",
        tokenOutResolved: "usdc",
        reasons: ["preflight_xlayer_unsupported"]
      },
      scan: null,
      quote: null,
      execute: null
    });

    expect(result.stopReason).toBe("preflight_xlayer_unsupported");
    expect(result.tradeReadiness).toBe("cannot");
    expect(result.scanStatus).toBe("not_started");
  });

  it("keeps tradeReadiness on the operational side when a level 4 scan blocks", () => {
    const result = evaluateTradeGuardWorkflow({
      request: buildProofRequest("quote_live"),
      preflight: {
        cliReady: true,
        xlayerSupported: true,
        walletReady: false,
        resolvedWalletAddress: null,
        tokenInResolved: "okb",
        tokenOutResolved: "usdc",
        reasons: []
      },
      scan: {
        status: "ok",
        effectiveRiskLevel: 4,
        action: "block",
        triggeredLabels: ["Honeypot"],
        summaryLines: ["[L4] Honeypot"],
        warnings: []
      },
      quote: null,
      execute: null
    });

    expect(result.riskDecision).toBe("block");
    expect(result.stopReason).toBe("scan_level4_block");
    expect(result.tradeReadiness).toBe("can_quote");
  });

  it("stops on pause risk when the user did not continue", () => {
    const result = evaluateTradeGuardWorkflow({
      request: buildProofRequest("quote_live", { continueOnPause: false }),
      preflight: {
        cliReady: true,
        xlayerSupported: true,
        walletReady: false,
        resolvedWalletAddress: null,
        tokenInResolved: "okb",
        tokenOutResolved: "usdc",
        reasons: []
      },
      scan: {
        status: "ok",
        effectiveRiskLevel: 3,
        action: "warn",
        triggeredLabels: ["Low Liquidity"],
        summaryLines: ["[L3] Low Liquidity"],
        warnings: []
      },
      quote: null,
      execute: null
    });

    expect(result.riskDecision).toBe("pause");
    expect(result.stopReason).toBe("scan_level3_pause");
    expect(result.tradeReadiness).toBe("can_quote");
  });

  it("allows quote-derived readiness to continue when the scan failed", () => {
    const result = evaluateTradeGuardWorkflow({
      request: buildProofRequest("quote_live"),
      preflight: {
        cliReady: true,
        xlayerSupported: true,
        walletReady: false,
        resolvedWalletAddress: null,
        tokenInResolved: "okb",
        tokenOutResolved: "usdc",
        reasons: []
      },
      scan: {
        status: "failed",
        effectiveRiskLevel: null,
        action: null,
        triggeredLabels: [],
        summaryLines: ["Token scan failed before verdict."],
        warnings: ["timeout"]
      },
      quote: {
        status: "ok",
        expectedOut: "3.1",
        priceImpactPercent: "0.20",
        routeSummary: ["OKX > DEX"],
        warnings: []
      },
      execute: null
    });

    expect(result.riskDecision).toBe("warn");
    expect(result.stopReason).toBe(null);
    expect(result.tradeReadiness).toBe("can_quote");
    expect(result.quoteAvailable).toBe(true);
  });

  it("returns can_quote when quote succeeds but no wallet is ready", () => {
    const result = evaluateTradeGuardWorkflow({
      request: buildProofRequest("quote_live"),
      preflight: {
        cliReady: true,
        xlayerSupported: true,
        walletReady: false,
        resolvedWalletAddress: null,
        tokenInResolved: "okb",
        tokenOutResolved: "usdc",
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
        expectedOut: "3.1",
        priceImpactPercent: "0.20",
        routeSummary: ["OKX > DEX"],
        warnings: []
      },
      execute: null
    });

    expect(result.tradeReadiness).toBe("can_quote");
    expect(result.quoteAvailable).toBe(true);
    expect(result.executionAttempted).toBe(false);
    expect(result.stopReason).toBe(null);
  });

  it("returns can_execute when quote succeeds and wallet is ready", () => {
    const result = evaluateTradeGuardWorkflow({
      request: buildProofRequest("quote_live", {
        walletAddress: "0x1111111111111111111111111111111111111111"
      }),
      preflight: {
        cliReady: true,
        xlayerSupported: true,
        walletReady: true,
        resolvedWalletAddress: "0x1111111111111111111111111111111111111111",
        tokenInResolved: "okb",
        tokenOutResolved: "usdc",
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
        expectedOut: "3.1",
        priceImpactPercent: "0.20",
        routeSummary: ["OKX > DEX"],
        warnings: []
      },
      execute: null
    });

    expect(result.tradeReadiness).toBe("can_execute");
    expect(result.executionAttempted).toBe(false);
  });

  it("records execute failure without rewriting tradeReadiness", () => {
    const result = evaluateTradeGuardWorkflow({
      request: buildProofRequest("execute_live", {
        walletAddress: "0x1111111111111111111111111111111111111111"
      }),
      preflight: {
        cliReady: true,
        xlayerSupported: true,
        walletReady: true,
        resolvedWalletAddress: "0x1111111111111111111111111111111111111111",
        tokenInResolved: "okb",
        tokenOutResolved: "usdc",
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
        expectedOut: "3.1",
        priceImpactPercent: "0.20",
        routeSummary: ["OKX > DEX"],
        warnings: []
      },
      execute: {
        status: "failed",
        summaryLines: ["swap execute failed after retry"],
        warnings: [],
        errorClass: "execute_failed_after_retry"
      }
    });

    expect(result.tradeReadiness).toBe("can_execute");
    expect(result.executionAttempted).toBe(true);
    expect(result.executionState).toBe("failed");
    expect(result.stopReason).toBe("execute_failed_after_retry");
  });
});
