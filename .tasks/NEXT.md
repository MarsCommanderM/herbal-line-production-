# Next Task — Authoritative Queue

## Current status
- **P0-001:** Audit report recorded at `docs/audits/BASELINE.md`. Repository metadata and key paths were checked; local master-pack validation and ZIP integrity passed. Target-repository build/test remains unrun because no executable clone was available in the audit environment.
- **P0-002:** Source-level contract reconciliation recorded at `docs/audits/CONTRACT_RECONCILIATION.md`. Conflicting money state, transient UI persistence, QC result duplication, inventory reservation status, license recovery state and command channels were reconciled. TypeScript compile proof is deferred to P0-003.

## P0-003 — Reproducible Engineering Baseline (CURRENT)
- **Goal:** Establish a runnable Vite/TypeScript web shell, pinned direct dependencies, a committed lockfile, strict compiler settings, domain tests and CI.
- **Outputs:** `package.json`, `package-lock.json`, `tsconfig.json`, `index.html`, `src/`, `vitest.config.ts`, CI workflow and evidence report.
- **Acceptance:** Clean checkout installs through `npm ci`; strict typecheck, unit tests and production build run on the same commit; lockfile is committed; CI results are linked and recorded. Master-pack validation is a separate gate and must not be described as a game build.
- **Dependencies:** P0-001 and source-level P0-002 reconciliation.
- **Status:** In progress.

## P1-001 — Vertical Slice Domain
- **Goal:** Implement the first complete, generic botanical operations management loop: intake → fictional state progression → QC hold/release → inventory → customer dispatch.
- **Acceptance:** Illegal transitions rejected; held/rejected batches cannot dispatch; stock movement and delivery are traceable; deterministic tests cover positive and negative paths.
- **Dependencies:** P0-003.
- **Status:** Pending.

## Operating rule
Do not mark a task complete without implementation evidence, relevant tests, reviewed diff and updated documentation. Continue to the next unblocked task after acceptance. Paid or irreversible external actions require existing explicit authorization.
