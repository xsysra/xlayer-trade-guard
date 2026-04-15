import { mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

import type {
  ExecuteFacts,
  PreflightFacts,
  QuoteFacts,
  ScanFacts,
  TradeGuardRequest,
  TradeGuardResult
} from "../contracts.js";
import { renderSummaryMarkdown } from "./summary.js";
import type { StepTrace } from "./trace.js";

type WriterInput = {
  repoRoot: string;
  artifactRoot: string;
  runId: string;
  request: TradeGuardRequest;
  preflight: PreflightFacts;
  scan: ScanFacts | null;
  quote: QuoteFacts | null;
  execute: ExecuteFacts | null;
  result: Omit<TradeGuardResult, "artifactPath">;
  traces: StepTrace[];
};

export function writeArtifactPack(input: WriterInput) {
  const outputDir = join(input.artifactRoot, input.runId);
  const normalizedOutputDir = outputDir.replace(/\\/g, "/");
  mkdirSync(outputDir, { recursive: true });

  const artifactPath = relative(input.repoRoot, outputDir).replace(/\\/g, "/");
  const result: TradeGuardResult = {
    ...input.result,
    artifactPath
  };

  writeFileSync(join(outputDir, "request.json"), JSON.stringify(input.request, null, 2));
  writeFileSync(join(outputDir, "preflight.json"), JSON.stringify(input.preflight, null, 2));
  if (input.scan) {
    writeFileSync(join(outputDir, "scan.json"), JSON.stringify(input.scan, null, 2));
  }
  if (input.quote) {
    writeFileSync(join(outputDir, "quote.json"), JSON.stringify(input.quote, null, 2));
  }
  if (input.execute) {
    writeFileSync(join(outputDir, "execute.json"), JSON.stringify(input.execute, null, 2));
  }
  writeFileSync(join(outputDir, "trace.json"), JSON.stringify(input.traces, null, 2));
  writeFileSync(join(outputDir, "result.json"), JSON.stringify(result, null, 2));
  writeFileSync(join(outputDir, "summary.md"), renderSummaryMarkdown(result));
  writeFileSync(
    join(input.artifactRoot, "latest.json"),
    JSON.stringify(
      {
        runId: input.runId,
        proofMode: result.proofMode,
        resultPath: `${artifactPath}/result.json`,
        summaryPath: `${artifactPath}/summary.md`
      },
      null,
      2
    )
  );

  return { outputDir: normalizedOutputDir, result };
}
