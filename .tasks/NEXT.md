# Next Task — Authoritative Queue

## Current verified state

- P0-001 repository truth audit exists in `docs/audits/BASELINE.md`.
- P0-002 contract decisions are recorded in `docs/audits/CONTRACT_RECONCILIATION.md`; exact byte-for-byte parity with the supplied Master Pack remains open.
- P0-003 reproducible Vite/TypeScript baseline is verified on the current integration revision.
- Latest verified code revision: `bce2a0bd0edda036032be03e8dfea3033057ea52`.
- Evidence: [GitHub Actions run 38182289439](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38182289439) — install, lint, format, typecheck, 26 unit tests, production build, 3 Chromium E2E tests, production preview smoke, master-pack validator and `git diff --check` all passed.

## P0-002 — Reconcile Project Truth (SCOPE DECISION RECORDED; EXACT MIRROR NOT CLAIMED)

- **Complete:** canonical contract conflicts are logged; the archive SHA-256 and expected Git blob IDs are retained; a reproducible per-path comparison records the exact drift.
- **Evidence:** `docs/audits/MASTERPACK_PARITY_REPORT.md`; archive contains 42 paths, 4/42 exact matches, 38 content mismatches and 33 extra implementation/tooling paths at the recorded comparison revision.
- **Decision:** the current deliverable is a fictional, generic botanical operations game. Exact ZIP mirroring is not a release gate because blindly restoring the historical product pack would overwrite the verified app and undo the deliberately generic scope. Do not claim 1:1 parity.
- **Status:** source-of-truth ambiguity closed with a documented scope fork; archive parity remains historically measurable but intentionally not targeted.

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

## P1-003 — Operational Dashboard and Queue UX (FUNCTIONAL BASELINE; ACCESSIBILITY REVIEW OPEN)

- **Implemented:** state-derived campaign guidance, recommended next step, quality/compliance blockers, station availability, and delivered-goal completion.
- **Evidence:** Chromium E2E run 38207213170 passed 7 scenarios, including predictable keyboard tab order, focus-visible styling, 390×844 mobile layout without horizontal overflow, live-region semantics, and reduced-motion handling.
- **Remaining:** full WCAG contrast/semantics review, broader assistive-technology testing, and more viewport coverage.
- **Gate:** every primary action has a clear precondition, visible result, and tested error state.

## P2-001 — Facility, capacity, staffing and maintenance (IMPLEMENTED BASELINE; REVIEW CONTINUES)

- **Implemented on this branch:** cross-entity invariant validation runs before every successful domain commit. It checks room capacity/occupancy, batch/plant/inventory links, QC state, terminal rejected batches, machine/job consistency, inventory reservation bounds, and ledger idempotency keys.
- **Evidence:** unit tests validate the initial state, deliberately corrupted state, full queue → processing → QC → rejection progression, duplicate ledger keys, and rejection of commands that would preserve an invalid state. Same-revision CI run 38207727309 passed, including all 7 Chromium E2E tests.
- **Remaining:** property-based/fuzz coverage, assignment/maintenance constraints, and broader command-by-command invariant coverage.

## Operating rule

Do not mark a task complete without implementation evidence, relevant tests, reviewed diff and updated documentation. Preserve `main`; integrate through a reviewed pull request. Continue to the next unblocked task after acceptance. Paid or irreversible external actions require existing explicit authorization.
