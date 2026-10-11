# Prioritized MVP Roadmap

## P0 — Establish a verifiable baseline
- Initialize TypeScript/Vite/React application and lockfile.
- Add lint, type-check, unit-test, and production-build scripts.
- Configure CI for pull requests and pushes.
- Define domain types, command results, event envelope, and versioned save format.
- Add deterministic test fixtures and a small set of baseline tests.

**Exit condition:** clean install and all configured checks pass in an observed CI run.

## P1 — Build the end-to-end management slice
- Intake lot registration and provenance.
- Work orders and staff assignments.
- Fictional production-stage transitions.
- Batch status history and event log.
- Quality hold, release, rejection, and documented deviation handling.
- Inventory movements and reconciliation.
- Pharmacy order allocation and delivery record.

**Exit condition:** a player can complete the entire loop; held/rejected batches cannot be dispatched; every movement is traceable.

## P2 — Make it playable
- Operations dashboard and exception queue.
- Facility capacity and shift planning.
- Budget, recurring costs, and simplified business performance.
- Tutorial tasks and first-session guidance.
- Local save/load, schema validation, and recoverable invalid-save messaging.

**Exit condition:** a new player can complete a guided scenario without developer tools.

## P3 — Improve depth and presentation
- Staff skill progression and training.
- Maintenance and equipment downtime.
- Audit scenarios, supplier issues, record mismatches, and delivery exceptions.
- Research/training unlock tree.
- Timeline, batch genealogy, and management reports.
- Sound, motion, and visual polish with reduced-motion support.

**Exit condition:** multiple viable management strategies exist and failures are explainable.

## P4 — Release readiness
- Playwright smoke tests for the primary journey.
- Accessibility pass and responsive-device checks.
- Dependency audit, error handling, and data migration tests.
- Balance review using fictional values only.
- Known-issues list, versioning, release notes, and rollback plan.

**Exit condition:** reproducible release candidate with documented evidence and no unresolved critical defects.

## Priority policy
P0/P1 correctness outranks cosmetic polish. Never mark a feature complete based on UI appearance alone; its domain transitions, persistence, and tests must also be verified.
