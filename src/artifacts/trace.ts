export type StepTrace = {
  step: "preflight" | "scan" | "quote" | "execute";
  command: string;
  startedAt: string;
  finishedAt: string;
  exitCode: number;
  stderrExcerpt: string;
  errorClass?: string;
};
