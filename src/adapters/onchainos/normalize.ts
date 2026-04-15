import type { ExecuteFacts, QuoteFacts, ScanFacts } from "../../contracts.js";
import { REASON_CODES } from "../../core/reasons.js";

type TokenResolution = {
  normalized: string;
  quoteValue: string;
  scanAddress: string | null;
  isNative: boolean;
};

const NATIVE_XLAYER_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const XLAYER_USDC_ADDRESS = "0x74b7f16337b8972027f6196a17a631ac6de26d22";

const LEVEL_LABELS: Record<
  string,
  {
    level: 2 | 3 | 4;
    label: string;
  }
> = {
  isHoneypot: { level: 4, label: "Honeypot" },
  isHoneyPot: { level: 4, label: "Honeypot" },
  isRubbishAirdrop: { level: 4, label: "Garbage Airdrop" },
  isAirdropScam: { level: 4, label: "Gas Mint Scam" },
  isLowLiquidity: { level: 3, label: "Low Liquidity" },
  isDumping: { level: 3, label: "Dumping" },
  isLiquidityRemoval: { level: 3, label: "Liquidity Removal" },
  isPump: { level: 3, label: "Pump" },
  isWash: { level: 3, label: "Wash Trading" },
  isFakeLiquidity: { level: 3, label: "Fake Liquidity" },
  isWash2: { level: 3, label: "Wash Trading v2" },
  isFundLinkage: { level: 3, label: "Rugpull Gang" },
  isVeryLowLpBurn: { level: 3, label: "Very Low LP Burn" },
  isVeryHighLpHolderProp: { level: 3, label: "Very High LP Holder Concentration" },
  isHasBlockingHis: { level: 3, label: "Has Blocking History" },
  isOverIssued: { level: 3, label: "Over Issued" },
  isCounterfeit: { level: 3, label: "Counterfeit" },
  isMintable: { level: 2, label: "Mintable" },
  isHasFrozenAuth: { level: 2, label: "Freeze Authority" },
  isNotRenounced: { level: 2, label: "Not Renounced" }
};

function parseJson(stdout: string): unknown {
  const trimmed = stdout.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.search(/[\[{]/);
    if (firstBrace < 0) {
      return null;
    }

    try {
      return JSON.parse(trimmed.slice(firstBrace));
    } catch {
      return null;
    }
  }
}

function unwrapData(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") {
    return raw;
  }

  if ("data" in raw) {
    return (raw as { data?: unknown }).data ?? raw;
  }

  return raw;
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  return raw as Record<string, unknown>;
}

function getPrimaryRecord(raw: unknown): Record<string, unknown> | null {
  const unwrapped = unwrapData(raw);

  if (Array.isArray(unwrapped)) {
    const first = unwrapped[0];
    return asRecord(first);
  }

  return asRecord(unwrapped);
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const numeric = Number.parseFloat(value.replace("%", ""));
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function readNamedRoute(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  const record = asRecord(value);
  if (!record) {
    return null;
  }

  for (const key of ["dexName", "name", "label", "protocol"]) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return null;
}

function readRouteSummary(record: Record<string, unknown>): string[] {
  const dexRouters = Array.isArray(record.dexRouterList)
    ? record.dexRouterList.map((entry) => readNamedRoute(entry)).filter((entry): entry is string => Boolean(entry))
    : [];
  if (dexRouters.length > 0) {
    return dexRouters;
  }

  const explicitSummary = readStringArray(record.routeSummary);
  if (explicitSummary.length > 0) {
    return explicitSummary;
  }

  if (Array.isArray(record.routes)) {
    return record.routes.map((entry) => readNamedRoute(entry)).filter((entry): entry is string => Boolean(entry));
  }

  const singleRoute = readNamedRoute(record.route);
  return singleRoute ? [singleRoute] : [];
}

function inferTaxLevel(value: unknown): 2 | 3 | 4 | null {
  const tax = readNumber(value);
  if (tax === null) {
    return null;
  }

  if (tax >= 50) {
    return 4;
  }

  if (tax >= 21) {
    return 3;
  }

  if (tax > 0) {
    return 2;
  }

  return null;
}

function extractEvmAddress(raw: unknown): string | null {
  if (typeof raw === "string") {
    const match = raw.match(/0x[a-fA-F0-9]{40}/);
    return match ? match[0] : null;
  }

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      const address = extractEvmAddress(entry);
      if (address) {
        return address;
      }
    }

    return null;
  }

  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const directKeys = ["address", "evmAddress", "xlayerAddress", "walletAddress"];
  for (const key of directKeys) {
    const value = record[key];
    const direct = extractEvmAddress(value);
    if (direct) {
      return direct;
    }
  }

  for (const value of Object.values(record)) {
    const nested = extractEvmAddress(value);
    if (nested) {
      return nested;
    }
  }

  return null;
}

export function resolveToken(token: string): TokenResolution | null {
  const normalized = token.trim().toLowerCase();
  if (normalized.length === 0) {
    return null;
  }

  if (normalized === "okb" || normalized === NATIVE_XLAYER_ADDRESS) {
    return {
      normalized: "okb",
      quoteValue: "okb",
      scanAddress: null,
      isNative: true
    };
  }

  if (normalized === "usdc" || normalized === XLAYER_USDC_ADDRESS) {
    return {
      normalized: "usdc",
      quoteValue: "usdc",
      scanAddress: XLAYER_USDC_ADDRESS,
      isNative: false
    };
  }

  if (/^0x[a-f0-9]{40}$/i.test(normalized)) {
    return {
      normalized,
      quoteValue: normalized,
      scanAddress: normalized,
      isNative: normalized === NATIVE_XLAYER_ADDRESS
    };
  }

  return null;
}

export function parseWalletStatus(stdout: string): { loggedIn: boolean } {
  const record = getPrimaryRecord(parseJson(stdout));
  return {
    loggedIn: Boolean(record?.loggedIn)
  };
}

export function parseWalletAddress(stdout: string): string | null {
  return extractEvmAddress(unwrapData(parseJson(stdout)));
}

export function parseChainSupport(stdout: string): boolean {
  const raw = unwrapData(parseJson(stdout));
  if (Array.isArray(raw)) {
    return raw.some((entry) => {
      const record = asRecord(entry);
      if (!record) {
        return false;
      }

      const chainName = String(record.chainName ?? "").toLowerCase();
      const chainIndex = String(record.chainIndex ?? "");
      return chainName.includes("xlayer") || chainIndex === "196";
    });
  }

  return stdout.toLowerCase().includes("xlayer") || stdout.includes("196");
}

export function normalizeScanOutput(raw: unknown): ScanFacts {
  const record = getPrimaryRecord(typeof raw === "string" ? parseJson(raw) : raw);

  if (!record) {
    return {
      status: "failed",
      effectiveRiskLevel: null,
      action: null,
      triggeredLabels: [],
      summaryLines: ["Token scan failed before verdict."],
      warnings: ["scan payload missing"]
    };
  }

  const triggeredLabels: string[] = [];
  let effectiveRiskLevel: 1 | 2 | 3 | 4 | null = null;

  for (const [field, definition] of Object.entries(LEVEL_LABELS)) {
    if (record[field] === true) {
      triggeredLabels.push(definition.label);
      effectiveRiskLevel = effectiveRiskLevel === null ? definition.level : Math.max(effectiveRiskLevel, definition.level) as 2 | 3 | 4;
    }
  }

  if (record.isHasAssetEditAuth === true && String(record.chainId ?? "") === "501") {
    triggeredLabels.push("Privileged Address");
    effectiveRiskLevel = effectiveRiskLevel === null ? 3 : Math.max(effectiveRiskLevel, 3) as 3 | 4;
  }

  for (const field of ["buyTaxes", "sellTaxes"]) {
    const taxLevel = inferTaxLevel(record[field]);
    if (taxLevel !== null) {
      effectiveRiskLevel = effectiveRiskLevel === null ? taxLevel : Math.max(effectiveRiskLevel, taxLevel) as 2 | 3 | 4;
      triggeredLabels.push(`${field === "buyTaxes" ? "Buy" : "Sell"} Tax`);
    }
  }

  const explicitLevel = readNumber(record.effectiveRiskLevel ?? record.riskLevel ?? record.level);
  if (explicitLevel !== null && explicitLevel >= 1 && explicitLevel <= 4) {
    effectiveRiskLevel = explicitLevel as 1 | 2 | 3 | 4;
  }

  if (effectiveRiskLevel === null && record.isRiskToken === true) {
    effectiveRiskLevel = 2;
    triggeredLabels.push("Risk flagged by API");
  }

  if (effectiveRiskLevel === null) {
    effectiveRiskLevel = 1;
  }

  const action = effectiveRiskLevel === 4 ? "block" : effectiveRiskLevel >= 2 ? "warn" : "";
  const summaryLines =
    triggeredLabels.length > 0
      ? triggeredLabels.map((label) => `[L${effectiveRiskLevel}] ${label}`)
      : ["[L1] No risk labels triggered"];

  return {
    status: "ok",
    effectiveRiskLevel,
    action,
    triggeredLabels,
    summaryLines,
    warnings: readStringArray(record.warnings)
  };
}

export function normalizeQuoteOutput(raw: unknown): QuoteFacts {
  const record = getPrimaryRecord(typeof raw === "string" ? parseJson(raw) : raw);
  if (!record) {
    return {
      status: "failed",
      warnings: [],
      errorClass: REASON_CODES.quoteFailedTimeout
    };
  }

  const routeSummary = readRouteSummary(record);

  if (record.toTokenAmount !== undefined || record.toAmount !== undefined || record.amountOut !== undefined) {
    return {
      status: "ok",
      expectedOut: String(record.toAmount ?? record.toTokenAmount ?? record.amountOut),
      priceImpactPercent:
        typeof record.priceImpact === "string"
          ? record.priceImpact
          : typeof record.priceImpactPercent === "string"
            ? record.priceImpactPercent
            : undefined,
      routeSummary,
      warnings: readStringArray(record.warnings)
    };
  }

  const code = String(record.code ?? "").toUpperCase();
  const message = String(record.message ?? record.msg ?? record.error ?? "").toLowerCase();
  if (code === "NO_ROUTE" || message.includes("route") || message.includes("liquidity") || message.includes("honeypot")) {
    return {
      status: "cannot",
      warnings: readStringArray(record.warnings),
      errorClass: REASON_CODES.quoteNoRoute
    };
  }

  return {
    status: "failed",
    warnings: readStringArray(record.warnings),
    errorClass: REASON_CODES.quoteFailedTimeout
  };
}

export function normalizeExecuteOutput(raw: unknown): ExecuteFacts {
  const record = getPrimaryRecord(typeof raw === "string" ? parseJson(raw) : raw);
  if (!record) {
    return {
      status: "failed",
      summaryLines: ["swap execute failed"],
      warnings: [],
      errorClass: REASON_CODES.executeFailedAfterRetry
    };
  }

  const approveTxHash =
    typeof record.approveTxHash === "string" && record.approveTxHash.length > 0
      ? record.approveTxHash
      : undefined;
  const swapTxHash =
    typeof record.swapTxHash === "string" && record.swapTxHash.length > 0
      ? record.swapTxHash
      : undefined;

  if (swapTxHash) {
    return {
      status: "submitted",
      approveTxHash,
      swapTxHash,
      summaryLines: ["swap execute submitted"],
      warnings: readStringArray(record.warnings)
    };
  }

  return {
    status: "failed",
    summaryLines: ["swap execute failed"],
    warnings: readStringArray(record.warnings),
    errorClass: REASON_CODES.executeFailedAfterRetry
  };
}

export const LOCKED_TOKEN_ADDRESSES = {
  nativeXLayer: NATIVE_XLAYER_ADDRESS,
  xlayerUsdc: XLAYER_USDC_ADDRESS
} as const;
