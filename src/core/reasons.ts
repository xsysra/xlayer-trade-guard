export const REASON_CODES = {
  preflightCliUnavailable: "preflight_cli_unavailable",
  preflightXlayerUnsupported: "preflight_xlayer_unsupported",
  preflightTokenInUnresolved: "preflight_token_in_unresolved",
  preflightTokenOutUnresolved: "preflight_token_out_unresolved",
  preflightWalletNotReady: "preflight_wallet_not_ready",
  scanLevel4Block: "scan_level4_block",
  scanLevel3Pause: "scan_level3_pause",
  scanFailedWarnOnly: "scan_failed_warn_only",
  scanSkippedNativeToken: "scan_skipped_native_token",
  quoteNoRoute: "quote_no_route",
  quoteFailedTimeout: "quote_failed_timeout",
  executeWalletNotReady: "execute_wallet_not_ready",
  executeFailedAfterRetry: "execute_failed_after_retry"
} as const;
