import type { StepTrace } from "../../artifacts/trace.js";
import type { PreflightFacts, ScanFacts, TradeGuardRequest } from "../../contracts.js";
import { REASON_CODES } from "../../core/reasons.js";
import { runOnchainos, toStepTrace, type OnchainosRunner } from "./cli.js";
import { normalizeScanOutput, resolveToken } from "./normalize.js";

export type LiveScanRun = {
  scan: ScanFacts;
  trace: StepTrace | null;
};

export function runLiveScan(
  request: TradeGuardRequest,
  _preflight: PreflightFacts,
  env: NodeJS.ProcessEnv = process.env,
  runner: OnchainosRunner = runOnchainos
): LiveScanRun {
  const tokenOut = resolveToken(request.tokenOut);

  if (!tokenOut) {
    return {
      scan: {
        status: "failed",
        effectiveRiskLevel: null,
        action: null,
        triggeredLabels: [],
        summaryLines: ["Token scan failed before verdict."],
        warnings: [REASON_CODES.preflightTokenOutUnresolved]
      },
      trace: null
    };
  }

  if (tokenOut.isNative || !tokenOut.scanAddress) {
    return {
      scan: {
        status: "skipped_native_token",
        effectiveRiskLevel: null,
        action: null,
        triggeredLabels: [],
        summaryLines: ["Target token is native, so token-scan was skipped."],
        warnings: [REASON_CODES.scanSkippedNativeToken]
      },
      trace: null
    };
  }

  const run = runner(["security", "token-scan", "--tokens", `196:${tokenOut.scanAddress}`], env);
  if (run.exitCode !== 0) {
    return {
      scan: {
        status: "failed",
        effectiveRiskLevel: null,
        action: null,
        triggeredLabels: [],
        summaryLines: ["Token scan failed before verdict."],
        warnings: [run.stderr || "scan command failed"]
      },
      trace: toStepTrace("scan", run, REASON_CODES.scanFailedWarnOnly)
    };
  }

  const scan = normalizeScanOutput(run.stdout);
  return {
    scan,
    trace: toStepTrace("scan", run, scan.status === "failed" ? REASON_CODES.scanFailedWarnOnly : undefined)
  };
}
