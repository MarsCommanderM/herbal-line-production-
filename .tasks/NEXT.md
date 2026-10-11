# Next Task — Authoritative Queue

## Current verified state

- P0-001 repository truth audit exists in `docs/audits/BASELINE.md`.
- P0-002 contract decisions are recorded in `docs/audits/CONTRACT_RECONCILIATION.md`; exact byte-for-byte parity with the supplied Master Pack remains open.
- P0-003 reproducible Vite/TypeScript baseline is verified on the current integration revision.
- Latest verified code revision: `bce2a0bd0edda036032be03e8dfea3033057ea52`.
- Evidence: [GitHub Actions run 38182289439](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38182289439) — install, lint, format, typecheck, 26 unit tests, production build, 3 Chromium E2E tests, production preview smoke, master-pack validator and `git diff --check` all passed.

## P0-002 — Reconcile Project Truth (PARTIAL; PARITY OPEN)

- **Goal:** Compare product scope, canonical contracts, schemas, simulation rules, and persistence ownership.
- **Complete:** source-level contract decisions and an evidence-backed app/CI baseline.
- **Acceptance still open:** compare all 42 supplied Master Pack files byte-for-byte against a dedicated synchronization baseline; document every intentional deviation before implementation edits are layered on top.
- **Do not claim:** the current implementation branch is a 1:1 ZIP mirror.
- **Next action:** produce a reproducible per-path hash comparison and reconcile the pack without overwriting valuable implementation work.

## P0-003 — Reproducible Engineering Baseline (VERIFIED)

- **Goal:** Pinned dependencies, committed lockfile, strict TypeScript, lint, formatting, unit tests, production build, browser tests, preview smoke, and pack validation.
- **Evidence:** run 38182289439 on commit `bce2a0bd0edda036032be03e8dfea3033057ea52`.
- **Status:** all required workflow steps green on that exact revision.

## P1-001 — Vertical Slice Domain (IMPLEMENTED; ACCEPTANCE CONTINUES)

- **Goal:** Intake → fictional botanical stages → QC hold/release → inventory → generic customer dispatch.
- **Evidence:** deterministic domain tests and Chromium E2E interaction coverage; the UI runs in the actual browser with a WebGL canvas.
- **Remaining:** complete negative-path browser coverage, queue/empty/error UX, and accessibility review.

## P1-002 — Save/Load and Recovery (FUNCTIONAL BASELINE; HARDENING OPEN)

- **Implemented:** canonical SHA-256 save envelope; deterministic serialization; IndexedDB persistence; manual save/load; autosave after successful actions; last-known-good backup; fallback recovery; JSON export/import; validation before import; transient UI excluded from persisted payload.
- **Evidence:** unit tests plus Chromium E2E tests for save/load, autosave across reload, corrupted-primary fallback to backup, and export/import round-trip.
- **Remaining:** explicit migration chain when a new schema version is introduced, quota/interrupted-write recovery tests, and cross-browser coverage.

## P1-003 — Operational Dashboard and Queue UX (NEXT)

- **Goal:** improve task clarity, disabled/blocked-action explanations, empty states, keyboard flow, and accessible feedback without duplicating domain rules in the UI.
- **Gate:** every primary action has a clear precondition, visible result, and tested error state.

## Operating rule

Do not mark a task complete without implementation evidence, relevant tests, reviewed diff and updated documentation. Preserve `main`; integrate through a reviewed pull request. Continue to the next unblocked task after acceptance. Paid or irreversible external actions require existing explicit authorization.
