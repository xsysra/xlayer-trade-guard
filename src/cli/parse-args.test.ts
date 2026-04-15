import { describe, expect, it } from "vitest";

import { parseHeroArgs } from "./parse-args.js";

describe("parseHeroArgs", () => {
  it("parses the canonical live CLI surface", () => {
    const result = parseHeroArgs([
      "--mode",
      "execute_live",
      "--token-in",
      "okb",
      "--token-out",
      "usdc",
      "--amount",
      "0.1",
      "--wallet",
      "0x1111111111111111111111111111111111111111",
      "--continue-on-pause",
      "--slippage",
      "1",
      "--gas-level",
      "fast"
    ]);

    expect(result).toMatchObject({
      mode: "execute_live",
      request: {
        tokenIn: "okb",
        tokenOut: "usdc",
        amount: "0.1",
        walletAddress: "0x1111111111111111111111111111111111111111",
        continueOnPause: true,
        slippagePercent: "1",
        gasLevel: "fast"
      }
    });
  });

  it("rejects invalid proof modes", () => {
    expect(() => parseHeroArgs(["--mode", "quote-live"])).toThrow("Invalid --mode");
  });

  it("rejects invalid gas levels", () => {
    expect(() => parseHeroArgs(["--gas-level", "turbo"])).toThrow("Invalid --gas-level");
  });

  it("parses --json as an opt-in raw output flag", () => {
    const result = parseHeroArgs(["--mode", "quote_live", "--json"]);

    expect(result).toMatchObject({
      mode: "quote_live",
      json: true
    });
  });
});
