import { describe, expect, it } from "vitest";

import type { TradeGuardResult } from "../contracts.js";
import { renderConsoleSummary, renderSummaryMarkdown } from "./summary.js";

const FALLBACK_RESULT: TradeGuardResult = {
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
  resolvedWalletAddress: "0xa301291889d560df0bbd4ac2939ec7a78f1f3ff6",
  artifactPath: "artifacts/hero-runs/2026-04-15T102616464Z-fallback-canonical-okb-usdc"
};

describe("summary output", () => {
  it("renders a concise console summary without path spam or wallet leakage", () => {
    const summary = renderConsoleSummary(FALLBACK_RESULT);
    const paragraphs = summary.split("\n\n");

    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0]).toContain("I ran the canonical fallback path for xlayer-trade-guard.");
    expect(paragraphs[1]).toContain("okb -> usdc");
    expect(paragraphs[1]).toContain("riskDecision = proceed");
    expect(paragraphs[2]).toContain("This proves the guarded workflow and artifact contract.");
    expect(summary).not.toContain("/Users/");
    expect(summary).not.toContain("artifacts/hero-runs/");
    expect(summary).not.toContain("0xa301291889d560df0bbd4ac2939ec7a78f1f3ff6");
  });

  it("renders summary.md with the same concise proof boundary", () => {
    const summary = renderSummaryMarkdown(FALLBACK_RESULT);
    const paragraphs = summary.split("\n\n");

    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0]).toContain("I ran the canonical fallback path for xlayer-trade-guard.");
    expect(paragraphs[2]).toContain("It does not prove live quote or live execute yet.");
    expect(summary).not.toContain("artifactPath");
    expect(summary).not.toContain("0xa301291889d560df0bbd4ac2939ec7a78f1f3ff6");
  });
});
