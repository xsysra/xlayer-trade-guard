import { spawnSync } from "node:child_process";

import type { StepTrace } from "../../artifacts/trace.js";

export type CommandRun = {
  args: string[];
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  startedAt: string;
  finishedAt: string;
};

export type OnchainosRunner = (args: string[], env?: NodeJS.ProcessEnv) => CommandRun;

export function runOnchainos(args: string[], env: NodeJS.ProcessEnv = process.env): CommandRun {
  const bin = env.ONCHAINOS_BIN ?? "onchainos";
  const startedAt = new Date().toISOString();
  const result = spawnSync(bin, args, {
    encoding: "utf8",
    env
  });
  const finishedAt = new Date().toISOString();

  return {
    args,
    command: [bin, ...args].join(" "),
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status ?? 1,
    startedAt,
    finishedAt
  };
}

export function toStepTrace(
  step: StepTrace["step"],
  run: CommandRun,
  errorClass?: string
): StepTrace {
  return {
    step,
    command: run.command,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    exitCode: run.exitCode,
    stderrExcerpt: run.stderr.slice(0, 240),
    errorClass
  };
}
