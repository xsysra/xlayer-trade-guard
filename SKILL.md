---
name: xlayer-trade-guard
description: Use when a user needs a guarded X Layer swap, an OKX token risk gate before quote or execute, or artifact-backed quote or transaction submission proof for demo or judge review.
---

# XLayer Trade Guard

## Use This Skill When

- the user wants a guarded X Layer swap, not a generic trading bot
- the flow must expose both `riskDecision` and `tradeReadiness`
- the user needs quote proof, execute submission proof, or judge-facing demo narration
- the agent should explain the result cleanly without dumping raw artifact paths by default

## Do Not Use This Skill For

- background strategies
- multi-chain routing
- freeform trading assistants
- custom risk engines

## Value Proposition

This skill keeps one narrow X Layer swap easy to inspect. It puts an explicit
token risk gate in front of quote and execute, separates guard outcome from
execution readiness, and writes artifact-backed proof an operator or judge can
review quickly.

## Proof Paths

- `pnpm hero:fallback`
  - canonical smoke path only
  - stable artifact schema
  - never submission proof
- `pnpm hero:quote-live`
  - first real proof floor
  - records guard outcome plus quote availability
- `pnpm hero:execute-live`
  - current transaction submission proof path
  - records `swapTxHash` when execute is submitted successfully

## Input Policy

- `pnpm hero:fallback` is canonical-only and intentionally ignores token,
  amount, and wallet overrides
- `pnpm hero:quote-live` may vary `tokenIn`, `tokenOut`, `amount`,
  `runLabel`, and `continueOnPause`
- `pnpm hero:execute-live` may also vary `wallet`, `gasLevel`, and
  `slippage`

## Prompt Contract

Use short, bounded prompts.

### General Prompt Shapes

```text
Use xlayer-trade-guard. Quote on X Layer from <token-in> to <token-out> for <amount>. Stop if preflight fails. Keep the reply short and demo-friendly. No paths or links.
```

```text
Use xlayer-trade-guard. Execute on X Layer from <token-in> to <token-out> for <amount> only if wallet is ready. Otherwise explain the blocker. Keep the reply short and demo-friendly. No paths or links.
```

```text
Use xlayer-trade-guard. Read the latest artifact bundle from the most recent run and explain whether it is quote proof, transaction submission proof, or final confirmation. Keep it short. No paths or links.
```

### Current Demo Prompts

```text
Use xlayer-trade-guard. Quote on X Layer from okb to usdc for 0.0005. Stop if preflight fails. Keep the reply short and demo-friendly. No paths or links.
```

```text
Use xlayer-trade-guard. Execute on X Layer from okb to usdc for 0.0005 only if wallet is ready. Otherwise explain the blocker. Keep the reply short and demo-friendly. No paths or links.
```

```text
Use xlayer-trade-guard. Read the latest artifact bundle from the most recent run. Do not just summarize. Read the execute artifact and extract the exact proof fields. Show me: swapTxHash, executionState, executionAttempted, stopReason, and whether this counts as real transaction submission proof or final confirmation. Keep it short. No paths or links.
```

Prompt-to-CLI mapping:

- `from <token>` -> `--token-in`
- `to <token>` -> `--token-out`
- `for <amount>` -> `--amount`
- `use wallet 0x...` -> `--wallet`
- `continue on pause` -> `--continue-on-pause`
- `fast gas` / `average gas` / `slow gas` -> `--gas-level`

## Response Contract

- keep fallback canonical and never present it as live proof
- if live quote fails, report the real `stopReason`
- if execute prerequisites are missing, stop before pretending to execute
- default to a short human-facing summary, not an artifact inventory
- start proof inspection from `artifacts/hero-runs/latest.json`
- prefer `summary.md` before raw artifact dumps unless the user explicitly asks
- surface `swapTxHash` after execute when the artifact actually contains it
- avoid wallet addresses in default output unless wallet readiness is the
  blocker or the user explicitly asks
- say `transaction submission proof` for `executionState = submitted`
- say `final confirmation` only when the artifact actually shows `confirmed`

## Config Contract

Current env-backed settings:

- `ONCHAINOS_BIN`
- `HERO_ARTIFACT_ROOT`
- `HERO_WALLET_ADDRESS`

The live pair and amount are not env-configurable first-class settings yet.
Use prompt or CLI overrides for live modes instead.

## Guard Decision Contract

- `riskDecision` comes from token-scan facts on the target token
- `tradeReadiness` comes from preflight plus quote facts
- Level 4 buy risk blocks
- Level 3 buy risk pauses for explicit confirmation
- scan failures warn and may continue to quote
