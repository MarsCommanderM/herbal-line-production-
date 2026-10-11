# Implementation Status — 2026-10-12

## Current integration branch

- Branch: `production/herbal-line-clean-baseline-20261012`
- Initial integration commit: `bbac611ddd3588112f2001b817a20bfc720ae2d5`
- Base: observed `main` HEAD `5b49d50ee34609d95bb97b763e0b0886c2cad64d`
- Original `main` has not been modified by the recovery work.
- Exact 1:1 Master Pack content parity is not verified and remains a merge blocker.

## Implemented

- Pinned Node 22/npm 10 toolchain with committed package lock.
- Vite + strict TypeScript application entry point.
- Three.js facility view with stylized medical-cannabis silhouettes.
- PixiJS HUD plus accessible management controls.
- Canonical contract reconciliation: typed QC decisions, explicit recovery-review license state, ledger-derived balance, quantity-based reservation, transient UI excluded from save payload, persisted QC assessment history, separated command categories.
- Deterministic campaign state and typed command reducer for fictional stage progression, batch queue/processing, quality assessment and release, stock reservation, pharmacy order, dispatch, delivery confirmation, and idempotent revenue posting.
- Unit tests for finance, state transitions, end-to-end campaign completion, repeated delivery confirmation, stale revisions, blocked quality release, and insufficient stock.
- Read-only CI workflow with source lint, format check, typecheck, tests, production build, master-pack validation, and whitespace check.

## Verification

- Recovery branch run [38181116339](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38181116339) passed on commit `7bb88fbf23dc30139f8fa49c384024b1a7191fdd`.
- That run completed clean install, source lint, format check, strict typecheck, 16 tests, production build, master-pack validation, and `git diff --check`.
- Clean integration branch CI passed on commit `9ae1426a23ca3cf3b453e4991a3c40b3794f5eee`: [run 38181308979](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38181308979).
- Browser smoke/E2E: not run.
- Save/load and migration/recovery: not implemented.

## Acceptance status

**Not production-ready and not ready to merge.** The first management loop is implemented, but current integration-branch CI, browser smoke testing, exact archive parity, save/load, and further production hardening remain open.
