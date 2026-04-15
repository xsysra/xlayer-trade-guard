import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import type { TradeGuardResult, TradeGuardRequest } from "../contracts.js";
import type { StepTrace } from "../artifacts/trace.js";
import type { LiveExecuteRun } from "../adapters/onchainos/execute.js";
import type { LivePreflightRun } from "../adapters/onchainos/preflight.js";
import type { LiveQuoteRun } from "../adapters/onchainos/quote.js";
import type { LiveScanRun } from "../adapters/onchainos/scan.js";
import { createFallbackFacts } from "../adapters/fixtures/hero-fixture.js";
import { runLiveExecute } from "../adapters/onchainos/execute.js";
import { runLivePreflight } from "../adapters/onchainos/preflight.js";
import { runLiveQuote } from "../adapters/onchainos/quote.js";
import { runLiveScan } from "../adapters/onchainos/scan.js";
import { renderConsoleSummary } from "../artifacts/summary.js";
import { writeArtifactPack } from "../artifacts/writer.js";
import { deriveRiskDecision } from "../core/decision.js";
import { evaluateTradeGuardWorkflow } from "../core/workflow.js";
import { parseHeroArgs } from "./parse-args.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export type HeroRuntime = {
  createFallbackFacts: typeof createFallbackFacts;
  runLivePreflight: (request: TradeGuardRequest, env?: NodeJS.ProcessEnv) => LivePreflightRun;
  runLiveScan: (
    request: TradeGuardRequest,
    preflight: LivePreflightRun["preflight"],
    env?: NodeJS.ProcessEnv
  ) => LiveScanRun;
  runLiveQuote: (
    request: TradeGuardRequest,
    preflight: LivePreflightRun["preflight"],
    env?: NodeJS.ProcessEnv
  ) => LiveQuoteRun;
  runLiveExecute: (
    request: TradeGuardRequest,
    preflight: LivePreflightRun["preflight"],
    env?: NodeJS.ProcessEnv
  ) => LiveExecuteRun;
};

const DEFAULT_RUNTIME: HeroRuntime = {
  createFallbackFacts,
  runLivePreflight,
  runLiveScan,
  runLiveQuote,
  runLiveExecute
};

type RunnerOptions = {
  artifactRoot?: string;
  repoRoot?: string;
  now?: () => Date;
  env?: NodeJS.ProcessEnv;
  runtime?: HeroRuntime;
};

function resolveArtifactRoot(repoRoot: string, requestedRoot?: string): string {
  if (!requestedRoot) {
    return resolve(repoRoot, "artifacts/hero-runs");
  }

  return resolve(repoRoot, requestedRoot);
}

function canProceedToQuote(request: TradeGuardRequest, preflight: LivePreflightRun["preflight"], scan: LiveScanRun["scan"]) {
  if (!preflight.cliReady || !preflight.xlayerSupported || !preflight.tokenInResolved || !preflight.tokenOutResolved) {
    return false;
  }

  const derived = deriveRiskDecision(scan);
  if (derived.riskDecision === "block") {
    return false;
  }

  if (derived.riskDecision === "pause" && !request.continueOnPause) {
    return false;
  }

  return true;
}

function pushTrace(traces: StepTrace[], trace: StepTrace | null | undefined) {
  if (trace) {
    traces.push(trace);
  }
}

export function renderHeroOutput(result: TradeGuardResult, json: boolean): string {
  return json ? JSON.stringify(result, null, 2) : renderConsoleSummary(result);
}

export async function runHeroCommand(argv: string[], options: RunnerOptions = {}): Promise<TradeGuardResult> {
  const { mode, request } = parseHeroArgs(argv);
  const now = options.now ?? (() => new Date());
  const env = options.env ?? process.env;
  const repoRoot = resolve(options.repoRoot ?? REPO_ROOT);
  const artifactRoot = resolveArtifactRoot(repoRoot, options.artifactRoot ?? env.HERO_ARTIFACT_ROOT);
  const runtime = options.runtime ?? DEFAULT_RUNTIME;
  const traces: StepTrace[] = [];

  let preflight;
  let scan;
  let quote = null;
  let execute = null;

  if (mode === "fallback") {
    const fallback = runtime.createFallbackFacts(request);
    preflight = fallback.preflight;
    scan = fallback.scan;
    quote = fallback.quote;
    execute = request.executeLive ? fallback.execute : null;
  } else {
    const livePreflight = runtime.runLivePreflight(request, env);
    preflight = livePreflight.preflight;
    traces.push(...livePreflight.traces);

    if (!preflight.cliReady || !preflight.xlayerSupported || !preflight.tokenInResolved || !preflight.tokenOutResolved) {
      scan = null;
    } else {
      const liveScan = runtime.runLiveScan(request, preflight, env);
      scan = liveScan.scan;
      pushTrace(traces, liveScan.trace);

      if (canProceedToQuote(request, preflight, scan)) {
        const liveQuote = runtime.runLiveQuote(request, preflight, env);
        quote = liveQuote.quote;
        pushTrace(traces, liveQuote.trace);

        if (mode === "execute_live" && quote.status === "ok" && preflight.walletReady) {
          const liveExecute = runtime.runLiveExecute(request, preflight, env);
          execute = liveExecute.execute;
          pushTrace(traces, liveExecute.trace);
        }
      }
    }
  }

  const workflowResult = evaluateTradeGuardWorkflow({
    request,
    preflight,
    scan,
    quote,
    execute
  });

  const runId = `${now().toISOString().replace(/[:.]/g, "").replace("Z", "Z")}-${mode}-${request.runLabel ?? "canonical-okb-usdc"}`;

  return writeArtifactPack({
    repoRoot,
    artifactRoot,
    runId,
    request,
    preflight,
    scan,
    quote,
    execute,
    result: {
      ...workflowResult,
      proofMode: mode
    },
    traces
  }).result;
}

if (process.argv[1]?.endsWith("run-hero.ts")) {
  const { json } = parseHeroArgs(process.argv.slice(2));

  runHeroCommand(process.argv.slice(2)).then((result) => {
    console.log(renderHeroOutput(result, json));
  });
}
