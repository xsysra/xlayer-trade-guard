import { describe, expect, it } from "vitest";

import {
  DEFAULT_CANONICAL_REQUEST,
  buildProofRequest
} from "./contracts.js";

describe("trade guard contracts", () => {
  it("locks the canonical quote-live request to okb/usdc on xlayer", () => {
    expect(DEFAULT_CANONICAL_REQUEST).toEqual({
      network: "eip155:196",
      tokenIn: "okb",
      tokenOut: "usdc",
      amount: "0.1",
      amountKind: "readable",
      continueOnPause: false,
      executeLive: false,
      runLabel: "canonical-okb-usdc"
    });
  });

  it("builds execute-live requests from the canonical base", () => {
    expect(
      buildProofRequest("execute_live", {
        walletAddress: "0x1111111111111111111111111111111111111111"
      })
    ).toMatchObject({
      network: "eip155:196",
      tokenIn: "okb",
      tokenOut: "usdc",
      amount: "0.1",
      executeLive: true,
      walletAddress: "0x1111111111111111111111111111111111111111"
    });
  });

  it("keeps fallback mode on the same pair and amount", () => {
    expect(buildProofRequest("fallback", { runLabel: "fixture-run" })).toMatchObject({
      network: "eip155:196",
      tokenIn: "okb",
      tokenOut: "usdc",
      amount: "0.1",
      executeLive: false,
      runLabel: "fixture-run"
    });
  });
});
