# Next Task — Authoritative Queue

## Verified engineering baseline

- Current verified code revision: `24a0f650d9a118fa32e13a2d0abe36229f0f0036`.
- Evidence: [GitHub Actions run 38182607944](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38182607944). Install, source lint, format, strict typecheck, 27 unit tests, production build, 4 Chromium E2E tests, preview smoke, Master Pack validator and diff check all passed.
- QC failure/review now has a terminal rejection path; rejected batches cannot be released, and the UI prevents accepting a customer order before inventory is released.
- Save/load includes SHA-256 validation, IndexedDB, autosave, last-known-good backup, fallback recovery and JSON export/import.

## P0-002 — Exact Master Pack Parity (NEXT, OPEN)

A reproducible hash comparison against the supplied 42-file ZIP at revision `24a0f650d9a118fa32e13a2d0abe36229f0f0036` found:

- 42/42 expected paths are present.
- Only 4/42 file blobs match the ZIP exactly.
- 38/42 file contents differ.
- 33 additional implementation/tooling paths exist beyond the pack.

The expected Git blob SHA-1 values are recorded in `docs/audits/MASTERPACK_EXPECTED_BLOBS.json`. Run `python scripts/verify_masterpack_parity.py` in a checkout to reproduce the per-path result. The command is intentionally not a normal CI gate yet: it should fail until the pack baseline is synchronized.

**Acceptance:** establish a dedicated commit/tree with all 42 exact source blobs; then layer reviewed implementation changes in separate commits. Do not delete implementation work or rewrite `main` directly.

## P0-003 — Reproducible Engineering Baseline (VERIFIED)

Pinned dependencies, lockfile, lint, format, typecheck, unit tests, production build, Chromium E2E, production preview smoke, pack validator and whitespace checks are green on `24a0f650d9a118fa32e13a2d0abe36229f0f0036`.

## P1-001 — Vertical Slice Domain (FUNCTIONAL BASELINE)

The fictional operations loop supports a successful QC/release path, a terminal QC reject path, stock reservation, order fulfilment and idempotent delivery accounting. Remaining acceptance: broader negative-path coverage, queue UX and accessibility.

## P1-002 — Save/Load and Recovery (FUNCTIONAL BASELINE; HARDENING OPEN)

Implemented: SHA-256 save envelope, transient UI exclusion, IndexedDB, manual save/load, autosave, backup-before-primary replacement, fallback from corrupt primary, JSON export/import and validated restore. Remaining: migration chain beyond v1, quota/interrupted-write tests and cross-browser coverage.

## P1-003 — Operational Dashboard and Queue UX

After P0-002 parity, continue with keyboard/accessibility audit, explicit blocked-action reasons, queue prioritization and complete empty/error-state coverage.

## Operating rule

Do not mark a task complete without same-revision evidence, relevant tests and reviewed diffs. Preserve `main`; integrate through a reviewed pull request. Continue to the next unblocked task after acceptance.
