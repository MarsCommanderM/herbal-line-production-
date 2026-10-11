# Next Task — Authoritative Queue

## Current status
Repository metadata and archive checks are recorded in `docs/audits/BASELINE.md` and `docs/audits/MASTERPACK_VALIDATION.md`. Exact ZIP parity remains a blocker: the historical 42-path snapshot differs from the supplied archive in 36 of 42 file blobs. The clean integration branch must not be merged until the supplied archive is restored byte-for-byte and verified.

## P0-002 — Reconcile Project Truth
- **Goal:** Compare product scope, canonical contracts, schemas, simulation rules, and persistence ownership; resolve contradictions before application scaffolding.
- **Outputs:** `docs/audits/CONTRACT_RECONCILIATION.md`, explicit decision log, corrected domain/save contracts only where justified.
- **Acceptance:** one consistent source of truth for entities, transitions, time, RNG, money, batch release, inventory reservation, order/delivery idempotency and save migration.
- **Dependencies:** P0-001.
- **Status:** Implemented on recovery branch; integration-branch CI verification pending.

## P0-003 — Reproducible Engineering Baseline
- **Goal:** Establish a runnable Vite/TypeScript app, strict compiler settings, pinned dependencies and committed lockfile, lint, unit tests, production build and CI.
- **Outputs:** app shell, dependency manifest/lockfile, scripts, CI gates, smoke tests and reproducible instructions.
- **Acceptance:** clean checkout can install via frozen lockfile and run typecheck, lint, tests and build; each result is observed on the same commit and recorded.
- **Dependencies:** P0-002.
- **Status:** Implemented; integration-branch CI verification pending.

## P1-001 — Vertical Slice Domain
- **Goal:** Implement the first fully traceable management loop: intake → abstract game stages → QC hold/release → inventory → pharmacy dispatch.
- **Acceptance:** illegal transitions rejected; held/rejected batches cannot dispatch; stock movement and delivery are traceable; deterministic tests cover positive and negative paths.
- **Dependencies:** P0-003.
- **Status:** Implemented; integration-branch verification pending.

## Operating rule
Do not mark a task complete without implementation evidence, relevant tests, reviewed diff and updated documentation. Continue to the next unblocked task after acceptance. Paid or irreversible external actions require existing explicit authorization.


## Active blocker
Exact Master Pack parity is not complete. Do not merge the clean integration branch until all 42 archive files match the supplied ZIP byte-for-byte. The first end-to-end loop is implemented and must be re-verified on the integration branch before acceptance.
