# Next Task — Authoritative Queue

## Current status
P0-001 repository truth audit is recorded in `docs/audits/BASELINE.md`. The GitHub-connected audit confirmed the project documentation and contract paths, and recorded the missing executable-app/toolchain baseline. The target repository was not cloned into an executable checkout here; no app build or game tests have been claimed. Master-pack validation and ZIP integrity were tested on the local extracted pack.

## P0-002 — Reconcile Project Truth (SOURCE-LEVEL COMPLETE; REVIEW OPEN)
- **Goal:** Compare product scope, canonical contracts, schemas, simulation rules, and persistence ownership; resolve contradictions before application scaffolding.
- **Outputs:** `docs/audits/CONTRACT_RECONCILIATION.md`, explicit decision log, corrected domain/save contracts only where justified.
- **Acceptance:** one consistent source of truth for entities, transitions, time, RNG, money, batch release, inventory reservation, order/delivery idempotency and save migration.
- **Dependencies:** P0-001.
- **Status:** Source-level reconciliation recorded; exact archive parity and final review remain open.

## P0-003 — Reproducible Engineering Baseline
- **Goal:** Establish a runnable Vite/TypeScript app, strict compiler settings, pinned dependencies and committed lockfile, lint, unit tests, production build and CI.
- **Outputs:** app shell, dependency manifest/lockfile, scripts, CI gates, smoke tests and reproducible instructions.
- **Acceptance:** clean checkout can install via frozen lockfile and run typecheck, lint, tests and build; each result is observed on the same commit and recorded.
- **Dependencies:** P0-002.
- **Status:** DONE on main at `5b5f770f90956660c3860467ee02f4bbcf31ebd0`; CI and master-pack validation passed.

## P1-001 — Vertical Slice Domain
- **Goal:** Implement the first fully traceable management loop: intake → abstract botanical stages → QC hold/release → inventory → generic customer dispatch.
- **Acceptance:** illegal transitions rejected; held/rejected batches cannot dispatch; stock movement and delivery are traceable; deterministic tests cover positive and negative paths.
- **Dependencies:** P0-003.
- **Status:** End-to-end domain flow and management controls implemented; CI/browser E2E and save/load remain open.

## Operating rule
Do not mark a task complete without implementation evidence, relevant tests, reviewed diff and updated documentation. Continue to the next unblocked task after acceptance. Paid or irreversible external actions require existing explicit authorization.
