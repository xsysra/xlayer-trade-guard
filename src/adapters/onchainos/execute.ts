import type { StepTrace } from "../../artifacts/trace.js";
import type { ExecuteFacts, PreflightFacts, TradeGuardRequest } from "../../contracts.js";
import { runOnchainos, toStepTrace, type OnchainosRunner } from "./cli.js";
import { normalizeExecuteOutput, resolveToken } from "./normalize.js";

export type LiveExecuteRun = {
  execute: ExecuteFacts;
  trace: StepTrace;
};

export function runLiveExecute(
  request: TradeGuardRequest,
  preflight: PreflightFacts,
  env: NodeJS.ProcessEnv = process.env,
  runner: OnchainosRunner = runOnchainos
): LiveExecuteRun {
  const tokenIn = resolveToken(request.tokenIn);
  const tokenOut = resolveToken(request.tokenOut);
  const args = [
    "swap",
    "execute",
    "--from",
    tokenIn?.quoteValue ?? request.tokenIn,
    "--to",
    tokenOut?.quoteValue ?? request.tokenOut,
    "--readable-amount",
    request.amount,
    "--chain",
    "xlayer",
    "--wallet",
    preflight.resolvedWalletAddress ?? ""
  ];

  if (request.slippagePercent) {
    args.push("--slippage", request.slippagePercent);
  }

  if (request.gasLevel) {
    args.push("--gas-level", request.gasLevel);
  }

  const run = runner(args, env);
  const execute = normalizeExecuteOutput(run.exitCode === 0 ? run.stdout : run.stdout || run.stderr);

  return {
    execute,
    trace: toStepTrace("execute", run, execute.errorClass)
  };
}
