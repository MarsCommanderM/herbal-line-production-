# Next Task — Authoritative Queue

## Current verified state

- Repository truth audit: `docs/audits/BASELINE.md`.
- Source-level contract decisions: `docs/audits/CONTRACT_RECONCILIATION.md`.
- P0-003 and persistence/browser baseline passed on `bce2a0bd0edda036032be03e8dfea3033057ea52`: [CI run 38182289439](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38182289439).
- Exact Master Pack parity is a P0 blocker. A tree/blob comparison at `b6db945d13f04bd57e461dbc60b2a3d45e039d02` found 4/42 matching source blobs, 38/42 content mismatches, and 31 additional implementation paths. `scripts/verify_masterpack_parity.py` plus `docs/audits/MASTERPACK_EXPECTED_BLOBS.json` now make the comparison reproducible; run the checker against a checkout to get current results.

## P0-002 — Exact Master Pack Parity (NEXT, OPEN)

- **Goal:** Verify and restore the 42 supplied files without destroying implementation work.
- **Acceptance:** all 42 expected blob hashes match on a dedicated synchronization baseline; intentional implementation deviations are then layered in separate commits and recorded.
- **Current evidence:** archive SHA-256 `4e783542951f573ed7412444e9e2ed00c490a9b7919f67c30399b86297a4b8972`; current tree is not a 1:1 mirror.
- **Next action:** compare every expected path and actual Git blob hash, restore source files on a dedicated branch, then re-apply only the reviewed contract/implementation deltas.

## P0-003 — Reproducible Engineering Baseline (VERIFIED ON BASELINE)

Pinned dependencies, lockfile, source lint, format, typecheck, unit tests, production build, Chromium E2E, production preview smoke, Master Pack validator and whitespace check all passed on commit `bce2a0bd0edda036032be03e8dfea3033057ea52`. The current QC rejection changes require their own green CI run before acceptance.

## P1-001 — Vertical Slice Domain (FUNCTIONAL; NEGATIVE-PATH HARDENING)

The fictional management loop now has explicit terminal QC rejection, releases room/machine occupancy, and prevents customer-order acceptance before a batch has released inventory. Unit and browser acceptance for the rejection path are being added in the current change set.

## P1-002 — Save/Load and Recovery (FUNCTIONAL BASELINE; HARDENING OPEN)

SHA-256 save envelope, IndexedDB, manual save/load, autosave, last-known-good backup, corrupt-primary fallback and validated JSON export/import are implemented. Migration beyond v1, quota/interrupted-write recovery and cross-browser testing remain open.

## P1-003 — Operational Dashboard and Queue UX

After P0-002 parity is resolved, continue with keyboard/accessibility audit, explicit blocked-action reasons, queue prioritization and empty/error-state coverage.

## Operating rule

Do not mark a task complete without same-revision evidence, relevant tests and reviewed diffs. Preserve `main`; integrate through a reviewed PR. Continue to the next unblocked task after acceptance.
