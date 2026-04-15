import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { writeArtifactPack } from "./writer.js";

describe("writeArtifactPack", () => {
  it("writes the canonical files and latest pointer with a stable repo-relative artifact path", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "trade-guard-repo-"));
    const artifactRoot = join(repoRoot, "artifacts", "hero-runs");

    const result = writeArtifactPack({
      repoRoot,
      artifactRoot,
      runId: "20260415T000000Z-fallback-canonical-okb-usdc",
      request: {
        network: "eip155:196",
        tokenIn: "okb",
        tokenOut: "usdc",
        amount: "0.1",
        amountKind: "readable"
      },
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
        routeSummary: ["fixture route"],
        warnings: []
      },
      execute: {
        status: "not_attempted",
        summaryLines: [],
        warnings: []
      },
      result: {
        network: "eip155:196",
        tokenIn: "okb",
        tokenOut: "usdc",
        amount: "0.1",
        riskDecision: "proceed",
        tradeReadiness: "can_quote",
        scanStatus: "ok",
        stopReason: null,
        userConfirmed: false,
        proofMode: "fallback",
        riskSummary: ["[L1] No risk labels triggered"],
        machineReasons: [],
        quoteAvailable: true,
        executionAttempted: false,
        executionState: "not_attempted",
        resolvedWalletAddress: null
      },
      traces: []
    });

    expect(existsSync(join(result.outputDir, "request.json"))).toBe(true);
    expect(existsSync(join(result.outputDir, "result.json"))).toBe(true);
    expect(existsSync(join(result.outputDir, "summary.md"))).toBe(true);
    expect(result.result.artifactPath).toBe("artifacts/hero-runs/20260415T000000Z-fallback-canonical-okb-usdc");
    expect(readFileSync(join(artifactRoot, "latest.json"), "utf8")).toContain(
      "artifacts/hero-runs/20260415T000000Z-fallback-canonical-okb-usdc/result.json"
    );
  });
});
