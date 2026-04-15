import { describe, expect, it } from "vitest";

import {
  LOCKED_TOKEN_ADDRESSES,
  normalizeExecuteOutput,
  normalizeQuoteOutput,
  normalizeScanOutput,
  parseChainSupport,
  parseWalletAddress,
  parseWalletStatus,
  resolveToken
} from "./normalize.js";

describe("resolveToken", () => {
  it("locks okb and usdc to the canonical xlayer values", () => {
    expect(resolveToken("okb")).toEqual({
      normalized: "okb",
      quoteValue: "okb",
      scanAddress: null,
      isNative: true
    });

    expect(resolveToken("usdc")).toEqual({
      normalized: "usdc",
      quoteValue: "usdc",
      scanAddress: LOCKED_TOKEN_ADDRESSES.xlayerUsdc,
      isNative: false
    });
  });
});

describe("normalizeScanOutput", () => {
  it("treats official level-3 labels like pump as pause-worthy risk", () => {
    const result = normalizeScanOutput({
      chainId: "196",
      isPump: true
    });

    expect(result).toMatchObject({
      status: "ok",
      effectiveRiskLevel: 3,
      action: "warn",
      triggeredLabels: ["Pump"],
      summaryLines: ["[L3] Pump"]
    });
  });

  it("ignores solana-only asset edit authority outside solana", () => {
    const result = normalizeScanOutput({
      chainId: "196",
      isHasAssetEditAuth: true
    });

    expect(result).toMatchObject({
      status: "ok",
      effectiveRiskLevel: 1,
      action: "",
      triggeredLabels: [],
      summaryLines: ["[L1] No risk labels triggered"]
    });
  });

  it("uses isRiskToken as a fallback level-2 warning when no explicit labels fire", () => {
    const result = normalizeScanOutput({
      chainId: "196",
      isRiskToken: true
    });

    expect(result).toMatchObject({
      status: "ok",
      effectiveRiskLevel: 2,
      action: "warn",
      triggeredLabels: ["Risk flagged by API"],
      summaryLines: ["[L2] Risk flagged by API"]
    });
  });

  it("applies tax thresholds to risk level", () => {
    const result = normalizeScanOutput({
      chainId: "196",
      buyTaxes: "55"
    });

    expect(result).toMatchObject({
      status: "ok",
      effectiveRiskLevel: 4,
      action: "block",
      summaryLines: ["[L4] Buy Tax"]
    });
  });
});

describe("normalizeQuoteOutput", () => {
  it("extracts route summary from dexRouterList", () => {
    const result = normalizeQuoteOutput({
      toTokenAmount: "12345",
      priceImpactPercent: "0.1",
      dexRouterList: [{ dexName: "OKX" }, { dexName: "CurveNG" }]
    });

    expect(result).toMatchObject({
      status: "ok",
      expectedOut: "12345",
      priceImpactPercent: "0.1",
      routeSummary: ["OKX", "CurveNG"]
    });
  });

  it("accepts amountOut and routeSummary shapes from live quote payloads", () => {
    const result = normalizeQuoteOutput({
      amountOut: "77.5",
      priceImpact: "0.2",
      routeSummary: ["OKX Aggregator", "X Layer Pool"]
    });

    expect(result).toMatchObject({
      status: "ok",
      expectedOut: "77.5",
      priceImpactPercent: "0.2",
      routeSummary: ["OKX Aggregator", "X Layer Pool"]
    });
  });

  it("treats explicit NO_ROUTE quote codes as cannot", () => {
    const result = normalizeQuoteOutput({
      code: "NO_ROUTE",
      message: "No path found"
    });

    expect(result).toMatchObject({
      status: "cannot",
      errorClass: "quote_no_route"
    });
  });
});

describe("normalizeExecuteOutput", () => {
  it("treats swap tx hash as a submitted execution", () => {
    const result = normalizeExecuteOutput({
      approveTxHash: "0xaaa",
      swapTxHash: "0xbbb"
    });

    expect(result).toMatchObject({
      status: "submitted",
      approveTxHash: "0xaaa",
      swapTxHash: "0xbbb"
    });
  });
});

describe("preflight parsers", () => {
  it("parses wallet status and wallet address from okx payload shapes", () => {
    expect(parseWalletStatus(JSON.stringify({ data: { loggedIn: true } }))).toEqual({ loggedIn: true });
    expect(
      parseWalletAddress(JSON.stringify({ data: [{ chainName: "xlayer", address: "0x1111111111111111111111111111111111111111" }] }))
    ).toBe("0x1111111111111111111111111111111111111111");
  });

  it("recognizes xlayer chain support from chain list payloads", () => {
    expect(
      parseChainSupport(
        JSON.stringify({
          data: [{ chainIndex: "196", chainName: "xlayer" }]
        })
      )
    ).toBe(true);
  });
});
