import { buildProofRequest, type ProofMode, type TradeGuardRequest } from "../contracts.js";

const VALID_MODES = new Set<ProofMode>(["fallback", "quote_live", "execute_live"]);
const VALID_GAS_LEVELS = new Set<NonNullable<TradeGuardRequest["gasLevel"]>>(["slow", "average", "fast"]);

function readValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}`);
  }

  return value;
}

export function parseHeroArgs(argv: string[]): { mode: ProofMode; request: TradeGuardRequest; json: boolean } {
  const modeIndex = argv.indexOf("--mode");
  const requestedMode = modeIndex >= 0 ? readValue(argv, modeIndex, "--mode") : "quote_live";
  const json = argv.includes("--json");
  if (!VALID_MODES.has(requestedMode as ProofMode)) {
    throw new Error(`Invalid --mode: ${requestedMode}`);
  }

  const mode = requestedMode as ProofMode;
  if (mode === "fallback") {
    return {
      mode,
      json,
      request: buildProofRequest(mode)
    };
  }

  const overrides: Partial<TradeGuardRequest> = {};

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--token-in") overrides.tokenIn = readValue(argv, index, "--token-in");
    if (argv[index] === "--token-out") overrides.tokenOut = readValue(argv, index, "--token-out");
    if (argv[index] === "--amount") overrides.amount = readValue(argv, index, "--amount");
    if (argv[index] === "--wallet") overrides.walletAddress = readValue(argv, index, "--wallet");
    if (argv[index] === "--run-label") overrides.runLabel = readValue(argv, index, "--run-label");
    if (argv[index] === "--continue-on-pause") overrides.continueOnPause = true;
    if (argv[index] === "--slippage") overrides.slippagePercent = readValue(argv, index, "--slippage");
    if (argv[index] === "--gas-level") {
      const gasLevel = readValue(argv, index, "--gas-level");
      if (!VALID_GAS_LEVELS.has(gasLevel as NonNullable<TradeGuardRequest["gasLevel"]>)) {
        throw new Error(`Invalid --gas-level: ${gasLevel}`);
      }

      overrides.gasLevel = gasLevel as NonNullable<TradeGuardRequest["gasLevel"]>;
    }
  }

  return {
    mode,
    json,
    request: buildProofRequest(mode, overrides)
  };
}
