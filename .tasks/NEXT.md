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

**Letzter vollständig verifizierter Stand:** Commit `48d7cce195aa7bdc756cee67977111c05f066b1f` passed [DopeFarm CI run 38353059424](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38353059424) and [Master Pack Validation run 38353059561](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38353059561). Both runs completed successfully on the exact same PR-head SHA. The CI run confirms locked install, lint, format, strict TypeScript, unit tests, production build, Chromium/Firefox/WebKit E2E, preview smoke, Master-Pack validation, preserved-source verification, product-policy validation and whitespace.

1. **Resolved on verified SHA:** expanded plant-care E2E covers all five fictional setting controls, pruning, taking and setting a cutting, visible state feedback, autosave/reload persistence, and the existing cross-browser acceptance paths.
2. **Open — economy/progression design:** the source pack does not define authoritative fictional upgrade prices/effects, XP/level thresholds or unlock rules. Keep unconfigured upgrades unavailable and do not fabricate balance values. Close this item only after an explicit, documented balance decision or authoritative source is recorded.
3. **Open — production assets and rights:** complete final character art/animation, environment art, audio and asset pipeline; finish asset provenance/licensing and release-rights review. The procedural Third-Person avatar remains a placeholder.
4. **Verified — save/load resilience:** quota exhaustion and aborted writes have repository tests; corrupt-primary/backup recovery, import/export, autosave/reload and cross-browser persistence are in the green suite. The only remaining persistence design item is a migration chain for a defined legacy schema; do not invent a legacy format that does not exist.
5. **Next actionable P1 — quality/incident negative paths:** formalize compliance incident/corrective-action lifecycle and add browser acceptance for compliance-blocked care/dispatch, held inventory and duplicate financial/delivery events. Domain tests already cover suspended-license care, QC review/rejection, insufficient stock and idempotent revenue posting.
5. **Merge/release gate:** the mandatory CI and Master-Pack gates are green on `48d7cce195aa7bdc756cee67977111c05f066b1f`. Do not describe the whole release as complete while the above product/release blockers remain open. Historical archive parity is intentionally not claimed as 1:1; original source files remain preserved and validated separately.

### Current status rule
No workflow result from a parent commit counts as proof for a newer commit. Running, cancelled, skipped or failed jobs are not green. Do not mark any queue item complete from documentation alone.
