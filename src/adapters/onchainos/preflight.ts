import type { StepTrace } from "../../artifacts/trace.js";
import type { PreflightFacts, TradeGuardRequest } from "../../contracts.js";
import { REASON_CODES } from "../../core/reasons.js";
import { runOnchainos, toStepTrace, type OnchainosRunner } from "./cli.js";
import { parseChainSupport, parseWalletAddress, parseWalletStatus, resolveToken } from "./normalize.js";

export type LivePreflightRun = {
  preflight: PreflightFacts;
  traces: StepTrace[];
};

export function runLivePreflight(
  request: TradeGuardRequest,
  env: NodeJS.ProcessEnv = process.env,
  runner: OnchainosRunner = runOnchainos
): LivePreflightRun {
  const traces: StepTrace[] = [];
  const versionRun = runner(["--version"], env);
  traces.push(
    toStepTrace(
      "preflight",
      versionRun,
      versionRun.exitCode === 0 ? undefined : REASON_CODES.preflightCliUnavailable
    )
  );

  const tokenIn = resolveToken(request.tokenIn);
  const tokenOut = resolveToken(request.tokenOut);
  const explicitWalletAddress = request.walletAddress ?? env.HERO_WALLET_ADDRESS ?? null;

  if (versionRun.exitCode !== 0) {
    return {
      preflight: {
        cliReady: false,
        xlayerSupported: false,
        walletReady: false,
        resolvedWalletAddress: explicitWalletAddress,
        tokenInResolved: tokenIn?.quoteValue ?? null,
        tokenOutResolved: tokenOut?.quoteValue ?? null,
        reasons: [REASON_CODES.preflightCliUnavailable]
      },
      traces
    };
  }

  const chainsRun = runner(["swap", "chains"], env);
  traces.push(
    toStepTrace(
      "preflight",
      chainsRun,
      chainsRun.exitCode === 0 ? undefined : REASON_CODES.preflightXlayerUnsupported
    )
  );

  const walletStatusRun = runner(["wallet", "status"], env);
  traces.push(toStepTrace("preflight", walletStatusRun));

  const walletAddressesRun = runner(["wallet", "addresses", "--chain", "xlayer"], env);
  traces.push(toStepTrace("preflight", walletAddressesRun));

  const xlayerSupported = chainsRun.exitCode === 0 && parseChainSupport(chainsRun.stdout);
  const walletStatus = parseWalletStatus(walletStatusRun.stdout);
  const resolvedWalletAddress = explicitWalletAddress ?? parseWalletAddress(walletAddressesRun.stdout);
  const reasons = [
    ...(xlayerSupported ? [] : [REASON_CODES.preflightXlayerUnsupported]),
    ...(tokenIn ? [] : [REASON_CODES.preflightTokenInUnresolved]),
    ...(tokenOut ? [] : [REASON_CODES.preflightTokenOutUnresolved]),
    ...(walletStatus.loggedIn && resolvedWalletAddress ? [] : [REASON_CODES.preflightWalletNotReady])
  ];

  return {
    preflight: {
      cliReady: true,
      xlayerSupported,
      walletReady: walletStatus.loggedIn && Boolean(resolvedWalletAddress),
      resolvedWalletAddress,
      tokenInResolved: tokenIn?.quoteValue ?? null,
      tokenOutResolved: tokenOut?.quoteValue ?? null,
      reasons
    },
    traces
  };
}
