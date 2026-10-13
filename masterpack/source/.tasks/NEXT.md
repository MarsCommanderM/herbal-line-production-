# Next Task — Authoritative Queue

## Current status
The master pack is a production specification, not an implemented game. The first task in a target checkout is always the evidence-based repository audit.

## P0-001 — Repository Truth Audit
- **Goal:** Establish the actual repository baseline without destroying existing work.
- **Inputs:** Current checkout, branch, commit, working tree, package files, assets, tests, CI and available toolchain.
- **Outputs:** `docs/audits/BASELINE.md`, module/file map, observed test/build baseline, classified risks, proposed safe integration plan.
- **Acceptance:** The audit records exact commands and observed results; existing changes are preserved; secrets are never printed; no implementation changes occur before the baseline is documented.
- **Dependencies:** None.
- **Status:** Pending target-repository audit.

## P0-002 — Reconcile Project Truth
- **Goal:** Compare the actual checkout with `PROJECT_MANIFEST.json`, `AGENTS.md`, the master document, contracts and schemas.
- **Outputs:** Decision log and conflict list; approved corrections only.
- **Acceptance:** One canonical version of product scope, simulation time, IDs, status models and persistence ownership is documented.
- **Dependencies:** P0-001.
- **Status:** Pending.

## P0-003 — Reproducible Engineering Baseline
- **Goal:** Implement or reconcile strict TypeScript, pinned dependency lockfile, format/lint, typecheck, unit tests, production build and CI.
- **Outputs:** Runnable app scaffold, scripts, CI workflow and test harness.
- **Acceptance:** Clean checkout installs deterministically and all required checks are actually run; results are recorded.
- **Dependencies:** P0-002.
- **Status:** Pending.

## P1-001 — Vertical Slice Domain
- **Goal:** Implement the first fully traceable management loop: intake → abstract work orders → fictional production stages → QA hold/release → inventory → pharmacy dispatch.
- **Acceptance:** Illegal transitions are rejected; held/rejected batches cannot dispatch; all stock movement and delivery are traceable; deterministic tests cover positive and negative paths.
- **Dependencies:** P0-003.
- **Status:** Pending.

## Operating rule
Do not mark a task complete without implementation evidence, relevant tests, reviewed diff and updated documentation. Continue to the next unblocked task after a task is accepted. Paid or irreversible external actions require existing explicit authorization.
