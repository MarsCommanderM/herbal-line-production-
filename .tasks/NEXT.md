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

**Letzter vollständig verifizierter Stand:** Commit `db6eb92e27f10177fad42d7e6597345a77a2f773` passed [DopeFarm CI run 38348389937](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38348389937) and [Master Pack Validation run 38348394537](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38348394537). A duplicate PR-triggered CI run on the same SHA also passed: [38348394747](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38348394747). All mandatory CI steps completed successfully on that exact SHA.

1. **Resolved on verified SHA:** locked install, lint, format, strict TypeScript, unit tests, production build, Chromium/Firefox/WebKit E2E (including stale 3D-visual cleanup after importing an older save), preview smoke, Master-Pack validation, preserved-source verification, product-policy validation and whitespace.
2. **Current task:** expand plant-care E2E to cover all five fictional setting controls, pruning, cutting, visible feedback and persisted reload state; the resulting commit must receive a new full green CI run before it replaces the verified baseline.
3. **Open:** economy/progression remains intentionally incomplete until authoritative fictional prices/effects, XP/level thresholds and unlock rules are supplied; do not invent them.
4. **Open:** complete production art/audio and asset pipeline, asset provenance/licensing and release rights review; current procedural avatar is a placeholder, not final art.
5. **Open:** persistence fault-injection for quota exhaustion/interrupted writes, migration chain and cross-browser recovery; expand negative-path acceptance for held inventory, compliance blocks and duplicate financial/delivery events.
6. **Merge gate:** keep `main` untouched until all current-head CI checks are green, actionable review findings are resolved, and remaining release blockers are either completed or explicitly accepted by the project owner. Historical archive parity is intentionally not claimed as 1:1; original source files remain preserved and validated separately.

### Current status rule
No workflow result from a parent commit counts as proof for a newer commit. Running, cancelled, skipped or failed jobs are not green. Do not mark any queue item complete from documentation alone.
