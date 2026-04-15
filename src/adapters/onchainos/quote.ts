import type { StepTrace } from "../../artifacts/trace.js";
import type { PreflightFacts, QuoteFacts, TradeGuardRequest } from "../../contracts.js";
import { runOnchainos, toStepTrace, type OnchainosRunner } from "./cli.js";
import { normalizeQuoteOutput, resolveToken } from "./normalize.js";

export type LiveQuoteRun = {
  quote: QuoteFacts;
  trace: StepTrace;
};

export function runLiveQuote(
  request: TradeGuardRequest,
  _preflight: PreflightFacts,
  env: NodeJS.ProcessEnv = process.env,
  runner: OnchainosRunner = runOnchainos
): LiveQuoteRun {
  const tokenIn = resolveToken(request.tokenIn);
  const tokenOut = resolveToken(request.tokenOut);

  const run = runner(
    [
      "swap",
      "quote",
      "--from",
      tokenIn?.quoteValue ?? request.tokenIn,
      "--to",
      tokenOut?.quoteValue ?? request.tokenOut,
      "--readable-amount",
      request.amount,
      "--chain",
      "xlayer"
    ],
    env
  );

  const quote = normalizeQuoteOutput(run.exitCode === 0 ? run.stdout : run.stdout || run.stderr);
  return {
    quote,
    trace: toStepTrace("quote", run, quote.errorClass)
  };
}
