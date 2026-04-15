# xlayer-trade-guard

`xlayer-trade-guard` is a guarded X Layer swap skill for the OKX Build X
Hackathon. It applies explicit OKX / OnchainOS control checks before quote or
execute, then records a judge-readable proof surface for one narrow live path.

This submission is intentionally scoped as a single-agent control skill:

- one chain: `X Layer Mainnet`
- one guarded pair: `okb -> usdc`
- one live amount: `0.0005`
- one control pipeline
- one curated proof bundle for review

## Project Intro

The repo exists to answer one question before a swap is allowed to move
forward: should this request stop, pause, quote only, or proceed to execution?

Instead of presenting a generic trading assistant, `xlayer-trade-guard`
separates trade controls into explicit machine-readable decisions:

- `riskDecision`
- `tradeReadiness`
- `executionState`

That makes the workflow easier to audit. A judge can inspect one request, one
control path, and one proof bundle without inferring hidden behavior.

## What Risk It Controls

This skill is built as a control layer in front of a narrow swap path.

It checks:

- runtime readiness for the X Layer path
- token-scan output for the destination token
- whether the request should stop, pause, or continue
- whether quote access and execute readiness should remain distinct

It does not claim to be:

- a generic trading bot
- a multi-pair routing engine
- a wallet product
- a final confirmation tracker beyond submitted-transaction proof

## Architecture

```mermaid
flowchart LR
    A["Swap request"] --> B["Preflight"]
    B --> C["Token scan"]
    C --> D["riskDecision"]
    D --> E["tradeReadiness"]
    E --> F["Quote"]
    F --> G["Execute"]
    G --> H["Curated judge proof"]
```

Operational flow for this submission:

1. accept one bounded swap request on `eip155:196`
2. run preflight checks for CLI readiness and X Layer support
3. run the OKX token scan for the target token
4. derive `riskDecision`
5. derive `tradeReadiness`
6. quote when controls allow it
7. attempt execute only when the request is ready
8. write the proof surface carried by the public submission bundle

## Agentic Wallet Identity And Live Proof

Submission posture for this version:

- Submission type: `single-agent`
- Arena fit: `Skills Arena`
- Network: `X Layer Mainnet (eip155:196)`
- Agentic Wallet identity:
  `0xfeff3812a78e25dd8c234a33980723ce19725433`
- Standalone deployed contract:
  `none in this Skills Arena version`
- Live transaction submission proof:
  `0x84c0644df08e308653a5526591666837cd4f321cfe039be71062dee3ba1d2bc9`

Proof boundary for this repo:

- `executionState = submitted` means transaction submission proof
- this release does not claim final on-chain confirmation
- judge-facing proof should start from the curated bundle under
  `artifacts/judge-proof/2026-04-15T132739646Z-execute_live-canonical-okb-usdc/`

## Official OKX / OnchainOS Skill Usage

The current control path uses official OKX / OnchainOS command families on
X Layer:

- `onchainos security token-scan`
- `onchainos swap quote`
- `onchainos swap execute`

Bounded usage in this release:

- one guarded `okb -> usdc` path
- one live execute submission proof path
- one artifact-backed review surface for judges

The repo does not oversell broader capability than the current evidence. The
public story stays tied to the narrow path recorded in the proof bundle.

## Judge Verification Checklist

A reviewer should be able to verify these claims quickly:

1. the repo exposes `riskDecision` and `tradeReadiness` as separate fields
2. the current live path reaches `executionState = submitted`
3. the execute surface records a real `swapTxHash`
4. the curated proof bundle preserves the material proof facts without raw
   operator traces

Start from these files:

- [artifacts/judge-proof/2026-04-15T132739646Z-execute_live-canonical-okb-usdc/manifest.json](artifacts/judge-proof/2026-04-15T132739646Z-execute_live-canonical-okb-usdc/manifest.json)
- [artifacts/judge-proof/2026-04-15T132739646Z-execute_live-canonical-okb-usdc/proof-summary.md](artifacts/judge-proof/2026-04-15T132739646Z-execute_live-canonical-okb-usdc/proof-summary.md)
- [artifacts/judge-proof/2026-04-15T132739646Z-execute_live-canonical-okb-usdc/result-summary.json](artifacts/judge-proof/2026-04-15T132739646Z-execute_live-canonical-okb-usdc/result-summary.json)
- [artifacts/judge-proof/2026-04-15T132739646Z-execute_live-canonical-okb-usdc/execute-summary.json](artifacts/judge-proof/2026-04-15T132739646Z-execute_live-canonical-okb-usdc/execute-summary.json)

## How To Run

Primary verification commands:

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm hero:fallback
pnpm hero:quote-live -- --amount 0.0005
pnpm hero:execute-live -- --amount 0.0005 --gas-level fast --slippage 1
```

Current request boundary:

- fallback path is canonical-only and not submission proof
- live quote and live execute keep one bounded pair and amount for review
- the curated judge-proof bundle is the public review surface for this repo

## Team Info

- Public repo:
  [xsysra/xlayer-trade-guard](https://github.com/xsysra/xlayer-trade-guard)
- Maintainer:
  [`@xsysra`](https://github.com/xsysra)
- Contact email:
  `enconsun@gmail.com`
- Telegram:
  `xsysra`
- Submission mode:
  `single-agent`

## Why This Matters On X Layer

X Layer needs agent-facing controls, not only agent-facing execution. This
submission shows that one narrow swap path can stay auditable from the first
preflight check through transaction submission proof:

- one explicit risk gate
- one execution-readiness decision
- one bounded live path on X Layer
- one proof surface a judge can inspect quickly
