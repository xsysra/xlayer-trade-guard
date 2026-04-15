import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { ExecuteFacts, PreflightFacts, QuoteFacts, ScanFacts, TradeGuardRequest, TradeGuardResult } from "../contracts.js";
import type { HeroRuntime } from "./run-hero.js";
import { renderHeroOutput, runHeroCommand } from "./run-hero.js";

function createStubRuntime(events: string[]): HeroRuntime {
  return {
    createFallbackFacts(request: TradeGuardRequest) {
      events.push(`fallback:${request.tokenIn}->${request.tokenOut}:${request.amount}`);
      return {
        preflight: {
          cliReady: true,
          xlayerSupported: true,
          walletReady: Boolean(request.walletAddress),
          resolvedWalletAddress: request.walletAddress ?? null,
          tokenInResolved: request.tokenIn,
          tokenOutResolved: request.tokenOut,
          reasons: []
        },
        scan: {
          status: "ok",
          effectiveRiskLevel: 1,
          action: "",
          triggeredLabels: [],
          summaryLines: ["[L1] Fixture safe"],
          warnings: []
        },
        quote: {
          status: "ok",
          expectedOut: request.amount,
          priceImpactPercent: "0.20",
          routeSummary: [`fixture ${request.tokenIn}->${request.tokenOut}`],
          warnings: []
        },
        execute: {
          status: "not_attempted",
          summaryLines: [],
          warnings: []
        }
      };
    },
    runLivePreflight(request: TradeGuardRequest) {
      events.push(`preflight:${request.tokenIn}->${request.tokenOut}`);
      const preflight: PreflightFacts = {
        cliReady: true,
        xlayerSupported: true,
        walletReady: false,
        resolvedWalletAddress: null,
        tokenInResolved: request.tokenIn,
        tokenOutResolved: request.tokenOut,
        reasons: []
      };
      return {
        preflight,
        traces: [
          {
            step: "preflight",
            command: "onchainos --version",
            startedAt: "2026-04-15T00:00:00.000Z",
            finishedAt: "2026-04-15T00:00:00.100Z",
            exitCode: 0,
            stderrExcerpt: ""
          }
        ]
      };
    },
    runLiveScan(_request: TradeGuardRequest, preflight: PreflightFacts) {
      events.push(`scan:${preflight.tokenOutResolved}`);
      const scan: ScanFacts = {
        status: "failed",
        effectiveRiskLevel: null,
        action: null,
        triggeredLabels: [],
        summaryLines: ["Token scan failed before verdict."],
        warnings: ["timeout"]
      };
      return {
        scan,
        trace: {
          step: "scan",
          command: "onchainos security token-scan --tokens 196:0xdead",
          startedAt: "2026-04-15T00:00:00.100Z",
          finishedAt: "2026-04-15T00:00:00.200Z",
          exitCode: 1,
          stderrExcerpt: "timeout",
          errorClass: "scan_failed_warn_only"
        }
      };
    },
    runLiveQuote(request: TradeGuardRequest, _preflight: PreflightFacts) {
      events.push(`quote:${request.tokenIn}->${request.tokenOut}:${request.amount}`);
      const quote: QuoteFacts = {
        status: "ok",
        expectedOut: "3.1",
        priceImpactPercent: "0.05",
        routeSummary: ["OKX > DEX"],
        warnings: []
      };
      return {
        quote,
        trace: {
          step: "quote",
          command: "onchainos swap quote --from okb --to usdc --readable-amount 0.1 --chain xlayer",
          startedAt: "2026-04-15T00:00:00.200Z",
          finishedAt: "2026-04-15T00:00:00.300Z",
          exitCode: 0,
          stderrExcerpt: ""
        }
      };
    },
    runLiveExecute(_request: TradeGuardRequest, _preflight: PreflightFacts) {
      events.push("execute");
      const execute: ExecuteFacts = {
        status: "confirmed",
        summaryLines: ["swap execute confirmed"],
        warnings: [],
        swapTxHash: "0xabc"
      };
      return {
        execute,
        trace: {
          step: "execute",
          command: "onchainos swap execute ...",
          startedAt: "2026-04-15T00:00:00.300Z",
          finishedAt: "2026-04-15T00:00:00.400Z",
          exitCode: 0,
          stderrExcerpt: ""
        }
      };
    }
  };
}

describe("runHeroCommand", () => {
  const fallbackResult: TradeGuardResult = {
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
    artifactPath: "artifacts/hero-runs/2026-04-15T000000000Z-fallback-canonical-okb-usdc"
  };

  it("renders concise stdout by default", () => {
    const output = renderHeroOutput(fallbackResult, false);

    expect(output).toContain("I ran the canonical fallback path for xlayer-trade-guard.");
    expect(output).not.toContain("artifactPath");
    expect(output).not.toContain("0xa301291889d560df0bbd4ac2939ec7a78f1f3ff6");
  });

  it("renders raw JSON when --json is requested", () => {
    const output = renderHeroOutput(fallbackResult, true);

    expect(output).toContain('"proofMode": "fallback"');
    expect(output).toContain('"artifactPath": "artifacts/hero-runs/2026-04-15T000000000Z-fallback-canonical-okb-usdc"');
  });

  it("writes a fallback artifact using the canonical pair and amount", async () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "trade-guard-fallback-repo-"));
    const artifactRoot = join(repoRoot, "artifacts", "hero-runs");

    const result = await runHeroCommand(
      ["--mode", "fallback", "--token-out", "weth", "--amount", "2.5", "--wallet", "0x1111111111111111111111111111111111111111"],
      {
        now: () => new Date("2026-04-15T00:00:00Z"),
        artifactRoot,
        repoRoot
      }
    );

    const latest = readFileSync(join(artifactRoot, "latest.json"), "utf8");
    const runDir = join(artifactRoot, "2026-04-15T000000000Z-fallback-canonical-okb-usdc");
    const preflight = JSON.parse(readFileSync(join(runDir, "preflight.json"), "utf8")) as PreflightFacts;
    const quote = JSON.parse(readFileSync(join(runDir, "quote.json"), "utf8")) as QuoteFacts;

    expect(result.proofMode).toBe("fallback");
    expect(result.tokenOut).toBe("usdc");
    expect(result.amount).toBe("0.1");
    expect(result.resolvedWalletAddress).toBeNull();
    expect(preflight.tokenOutResolved).toBe("usdc");
    expect(preflight.resolvedWalletAddress).toBeNull();
    expect(quote.expectedOut).toBe("0.1");
    expect(quote.routeSummary).toContain("fixture okb->usdc");
    expect(latest).toContain("artifacts/hero-runs/2026-04-15T000000000Z-fallback-canonical-okb-usdc/result.json");
  });

  it("defaults artifact output under repoRoot instead of caller cwd", async () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "trade-guard-default-artifacts-"));

    const result = await runHeroCommand(["--mode", "fallback"], {
      now: () => new Date("2026-04-15T00:00:00Z"),
      repoRoot,
      env: {}
    });

    const latest = readFileSync(join(repoRoot, "artifacts", "hero-runs", "latest.json"), "utf8");

    expect(result.artifactPath).toBe("artifacts/hero-runs/2026-04-15T000000000Z-fallback-canonical-okb-usdc");
    expect(latest).toContain("\"proofMode\": \"fallback\"");
  });

  it("uses the live runtime for quote_live instead of fallback fixtures", async () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "trade-guard-live-repo-"));
    const artifactRoot = join(repoRoot, "artifacts", "hero-runs");
    const events: string[] = [];

    const result = await runHeroCommand(["--mode", "quote_live"], {
      now: () => new Date("2026-04-15T00:00:00Z"),
      artifactRoot,
      repoRoot,
      runtime: createStubRuntime(events)
    });

    const runDir = join(artifactRoot, "2026-04-15T000000000Z-quote_live-canonical-okb-usdc");
    const trace = JSON.parse(readFileSync(join(runDir, "trace.json"), "utf8")) as Array<{ step: string }>;

    expect(events).toEqual(["preflight:okb->usdc", "scan:usdc", "quote:okb->usdc:0.1"]);
    expect(result.proofMode).toBe("quote_live");
    expect(result.riskDecision).toBe("warn");
    expect(result.tradeReadiness).toBe("can_quote");
    expect(result.quoteAvailable).toBe(true);
    expect(trace.map((entry) => entry.step)).toEqual(["preflight", "scan", "quote"]);
  });
});
