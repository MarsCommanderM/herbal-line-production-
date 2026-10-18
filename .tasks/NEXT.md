# Next Task — Authoritative Queue

## Current verified state

- P0-001 repository truth audit exists in `docs/audits/BASELINE.md`.
- P0-002 contract decisions and the intentional medical-cannabis scope (botanical fork reversed) are recorded in `docs/audits/CONTRACT_RECONCILIATION.md` and `docs/audits/MASTERPACK_PARITY_REPORT.md`; exact byte-for-byte ZIP parity is not claimed or targeted.
- P0-003 reproducible Vite/TypeScript baseline is verified on the current integration revision.
- Latest verified invariant/fuzz feature revision: `64e29a6fe0165075b61914f296114294c2d3e981`.
- Evidence: [GitHub Actions run 38208111520](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38208111520) — locked install, lint, format, strict typecheck, unit tests, production build, 7 Chromium E2E tests, preview smoke, master-pack validator and `git diff --check` passed.

## P0-002 — Reconcile Project Truth (SCOPE DECISION RECORDED; EXACT MIRROR NOT CLAIMED)

- **Complete:** canonical contract conflicts are logged; the archive SHA-256 and expected Git blob IDs are retained; a reproducible per-path comparison records the exact drift.
- **Evidence:** `docs/audits/MASTERPACK_PARITY_REPORT.md`; archive contains 42 paths, 4/42 exact matches, 38 content mismatches and 33 extra implementation/tooling paths at the recorded comparison revision.
- **Decision:** the current deliverable is a fictional, strictly regulated medical cannabis operations game. Exact ZIP mirroring is not a release gate because blindly restoring the historical product pack would overwrite the verified app and undo the deliberately generic scope. Do not claim 1:1 parity.
- **Status:** source-of-truth ambiguity closed with a documented scope fork; archive parity remains historically measurable but intentionally not targeted.

## P0-003 — Reproducible Engineering Baseline (VERIFIED)

- **Goal:** Pinned dependencies, committed lockfile, strict TypeScript, lint, formatting, unit tests, production build, browser tests, preview smoke, and pack validation.
- **Evidence:** run 38208111520 on feature revision `64e29a6fe0165075b61914f296114294c2d3e981` passed all required workflow steps.
- **Status:** pinned install, lint, format, strict typecheck, unit tests, production build, Chromium E2E, preview smoke, master-pack validation and diff check verified green.

## P1-001 — Vertical Slice Domain (IMPLEMENTED; ACCEPTANCE CONTINUES)

- **Goal:** Intake → fictional medical cannabis stages → QC hold/release → inventory → generic customer dispatch.
- **Evidence:** deterministic domain tests and Chromium E2E interaction coverage; the UI runs in the actual browser with a WebGL canvas.
- **Remaining:** complete negative-path browser coverage, queue/empty/error UX, and accessibility review.

## P1-002 — Save/Load and Recovery (FUNCTIONAL BASELINE; HARDENING OPEN)

- **Implemented:** canonical SHA-256 save envelope; deterministic serialization; IndexedDB persistence; manual save/load; autosave after successful actions; last-known-good backup; fallback recovery; JSON export/import; validation before import; transient UI excluded from persisted payload.
- **Evidence:** unit tests plus Chromium E2E tests for save/load, autosave across reload, corrupted-primary fallback to backup, and export/import round-trip.
- **Remaining:** explicit migration chain when a new schema version is introduced, quota/interrupted-write recovery tests, and cross-browser coverage.

## P1-003 — Operational Dashboard and Queue UX (FUNCTIONAL BASELINE; ACCESSIBILITY REVIEW OPEN)

- **Implemented:** state-derived campaign guidance, recommended next step, quality/compliance blockers, station availability, and delivered-goal completion.
- **Evidence:** Chromium E2E run 38207213170 passed 7 scenarios, including predictable keyboard tab order, focus-visible styling, 390×844 mobile layout without horizontal overflow, live-region semantics, and reduced-motion handling.
- **Remaining:** full WCAG contrast/semantics review, broader assistive-technology testing, and more viewport coverage.
- **Gate:** every primary action has a clear precondition, visible result, and tested error state.

## P2-001 — Facility, capacity, staffing and maintenance (IMPLEMENTATION INTEGRATED; CI PENDING)

- **Implemented:** cross-entity invariant validation runs before every successful domain commit. It checks room capacity/occupancy, batch/plant/inventory links, QC state, terminal rejected batches, machine/job consistency, inventory reservation bounds, ledger idempotency keys, bidirectional staff/machine room assignments, role-to-room compatibility, and maintenance/job consistency.
- **Evidence:** unit tests validate the initial state, deliberately corrupted state, full queue → processing → QC → rejection progression, duplicate ledger keys, and rejection of commands that would preserve an invalid state. A deterministic corruption matrix and 100 generated room-occupancy mutations also pass. Same-revision CI run 38208111520 passed, including all 7 Chromium E2E tests.
- **Added on the reconciled feature branch:** typed staff assignment/unassignment and machine movement commands, an abstract maintenance start/complete lifecycle, a live facility overview, unit tests, and Chromium E2E coverage. Same-revision CI verification is pending.
- **Remaining:** property-based command-sequence testing, machine movement edge cases, and broader command-by-command invariant coverage.

## P2-002 — Economy and progression (DAILY SETTLEMENT + TIERED UPGRADES + RECOVERY IMPLEMENTED; CI PENDING)

- **Implemented:** pure fictional daily-cost calculation, explicit end-of-day transition to next-day 08:00, idempotent wage and utility expense postings, audit events, a 30-day zero-revenue balance projection, cash-runway estimate, negative-balance warning, two prerequisite-gated ledger-backed energy-efficiency tiers (20% then an additional 10% utility-cost reduction), a stable/watch/critical financial-health indicator, and one-time distress support that clears the deficit and restores at least seven days of operating-cost runway.
- **Balance model:** wages sum each staff member's configured daily wage; utility costs use unlocked-room power units × 24 hours × 125 cents per unit-hour. These are game-balance constants, not real-world cost estimates.
- **Acceptance:** finance unit tests cover deterministic cost totals, idempotency, multi-day zero-revenue and explicit-revenue projections, cash runway, and invalid assumptions; domain tests cover day/time progression, ledger entries, event emission, settlement uniqueness and negative balance; Chromium E2E checks day-end feedback, autosave, runway, and the 30-day forecast.
- **Recovery guardrails:** support is unavailable while the balance is positive, posts an explicit `grant` ledger entry, uses a campaign-scoped idempotency key, and cannot be claimed twice.
- **Remaining:** broader multi-day progression tuning, revenue/expense ratio scenarios, more upgrade categories, and economy balancing after recovery. The tiered-upgrade revision's same-revision CI is pending.

## Operating rule

Do not mark a task complete without implementation evidence, relevant tests, reviewed diff and updated documentation. Preserve `main`; integrate through a reviewed pull request. Continue to the next unblocked task after acceptance. Paid or irreversible external actions require existing explicit authorization.

## P2-003 — Content, tutorial and contextual notices (IMPLEMENTED; CI PENDING)

- Added a six-step, state-derived core-loop tutorial. It is a pure selector over existing game state; it does not grant permissions, mutate the campaign, or introduce a new save-schema field.
- Added a content source register documenting the in-repository design sources and confirming that the tutorial uses only fictional gameplay rules, with no external operational claims.
- Playwright assertions cover initial progress, tutorial progression after the first action, and completion after the full delivery flow. Exact-revision cross-browser CI is pending.
- Remaining: content/design review, contextual notice coverage for empty/error states, and accessibility review of the combined management panel.
