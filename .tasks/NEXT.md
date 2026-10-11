# Next Task — Authoritative Queue

## Current status
P0-001 repository truth audit is recorded in `docs/audits/BASELINE.md`. The GitHub-connected audit confirmed the project documentation and contract paths, and recorded the missing executable-app/toolchain baseline. The target repository was not cloned into an executable checkout here; no app build or game tests have been claimed. Master-pack validation and ZIP integrity were tested on the local extracted pack.

## P0-002 — Reconcile Project Truth (CURRENT)
- **Goal:** Compare product scope, canonical contracts, schemas, simulation rules, and persistence ownership; resolve contradictions before application scaffolding.
- **Outputs:** `docs/audits/CONTRACT_RECONCILIATION.md`, explicit decision log, corrected domain/save contracts only where justified.
- **Acceptance:** one consistent source of truth for entities, transitions, time, RNG, money, batch release, inventory reservation, order/delivery idempotency and save migration.
- **Dependencies:** P0-001.
- **Status:** In progress.

## P0-003 — Reproducible Engineering Baseline
- **Goal:** Establish a runnable Vite/TypeScript app, strict compiler settings, pinned dependencies and committed lockfile, lint, unit tests, production build and CI.
- **Outputs:** app shell, dependency manifest/lockfile, scripts, CI gates, smoke tests and reproducible instructions.
- **Acceptance:** clean checkout can install via frozen lockfile and run typecheck, lint, tests and build; each result is observed on the same commit and recorded.
- **Dependencies:** P0-002.
- **Status:** Pending.

## P1-001 — Vertical Slice Domain
- **Goal:** Implement the first fully traceable management loop: intake → abstract botanical stages → QC hold/release → inventory → generic customer dispatch.
- **Acceptance:** illegal transitions rejected; held/rejected batches cannot dispatch; stock movement and delivery are traceable; deterministic tests cover positive and negative paths.
- **Dependencies:** P0-003.
- **Status:** Pending.

## Operating rule
Do not mark a task complete without implementation evidence, relevant tests, reviewed diff and updated documentation. Continue to the next unblocked task after acceptance. Paid or irreversible external actions require existing explicit authorization.
