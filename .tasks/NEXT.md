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


## Current production overlay — Dr. Green Dump / DopeFarm

The historical Master-Pack tasks remain the task catalogue. The current user-approved identity, cannabis-specific visuals and directly visible care requirements are governed by the production policy. Release approval requires every gate to be green for one exact commit.

### Immediate execution queue
1. Confirm the latest strict typecheck, unit tests and production build on the current revision.
2. Finish browser E2E, preview smoke, Master-Pack validation, product-policy validation and whitespace checks on that same revision.
3. Verify that plant-care E2E covers fictional level changes, visible feedback, save/autosave/reload and rejected invalid input; add missing cases before marking P1-005 done.
4. Reconcile unsupported economy/progression values with canonical evidence. Do not invent upgrade prices, effects, XP, level thresholds or unlock schedules.
5. Record exact-SHA evidence in the implementation audit. Keep main untouched until review and all required gates pass.

### Current status rule
No workflow result from a parent commit counts as proof for a newer commit. Running, cancelled, skipped or failed jobs are not green. Do not mark any queue item complete from documentation alone.
