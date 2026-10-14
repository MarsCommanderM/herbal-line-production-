# Dr. Green Dump / DopeFarm — Prioritized Backlog

**Status source:** exact-HEAD CI and Master Pack Validation both passed on `c099d29b748353b16870d5afd63e04274759e288`; [App CI 38513719586](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38513719586), [Master Pack Validation 38513719521](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38513719521).

| ID | Priority | Work package | Status | Evidence / remaining acceptance |
|---|---|---|---|---|
| P0-001 | P0 | Repository truth audit | Complete | Branch, base, manifest, provenance and known risks recorded; do not confuse source-snapshot identity with ZIP-container re-hashing. |
| P0-002 | P0 | Canonical scope/contract reconciliation | Complete for current implementation | Owner-confirmed medical-cannabis game scope and Third Person are enforced by policy and product validator. Detailed product decisions listed below remain open. |
| P0-003 | P0 | Reproducible engineering baseline | Green on exact current HEAD | [App CI 38513719586](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38513719586) and [Master Pack Validation 38513719521](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38513719521) both passed on `c099d29b748353b16870d5afd63e04274759e288`; App CI reports 11 unit-test files passed and 71 browser tests passed with 4 WebGL-dependent cases skipped. |
| P1-001 | P1 | Intake-to-pharmacy vertical slice | Implemented / CI green | Domain and browser scenarios cover intake, production, QC, inventory, order, delivery, ledger and traceability. |
| P1-002 | P1 | Save/load, validation and recovery | Implemented / exact-HEAD CI green | Historical Master Pack V1 and previous active-app V1 migrate into V2 after checksum, payload, ledger and invariant checks. Conflicting balances or unreconstructable assessment references fail closed without overwriting source data. |
| P1-003 | P1 | Operational dashboard and queue UX | Implemented / CI green | Keyboard, responsive layout, status/error paths, empty states and Axe WCAG 2.1/2.2 A/AA checks pass in CI. |
| P1-004 | P1 | Quality, audit and incident systems | Lifecycle implemented / exact-HEAD CI green; design input remains | Typed audit/case state, incidents, violations, corrective-action transitions, audit events, recovery gate, persisted save validation, invariants, management actions, unit tests and browser reload coverage pass on `c099d29…`. Numerical risk reduction remains blocked by missing approved fictional balance rules. |
| P1-005 | P1 | Visible cannabis plant care and 3D feedback | Chromium acceptance green; full renderer parity open | Exact-HEAD E2E verifies third-person movement and direct plant selection on Chromium/SwiftShader. Four renderer-dependent browser cases are skipped when a non-reference context has no WebGL canvas and remain explicitly unproven. |
| P2-001 | P2 | Facility, capacity, staffing and maintenance | Implemented / CI green | Invariants and browser scenarios pass. |
| P2-002 | P2 | Economy and progression | Blocked by missing authoritative balance | `sensor_pack_1` and `drying_rack_1` remain unavailable; no XP thresholds, prices, effects or unlock rules may be invented. |
| P2-003 | P2 | Content, tutorial and contextual guidance | Implemented / CI green | State-derived guidance/tutorial and compliance/QC/delivery states have unit and browser coverage. Editorial/content approval remains a release gate. |
| P3-001 | P3 | Final art/audio/asset pipeline | Blocked by approved final assets | Current procedural scene is a functional foundation, not final premium art. Final art/audio must have recorded provenance and compatible commercial-use rights; visual/performance evidence remains open. |
| P3-002 | P3 | Release candidate QA/security/rights | Engineering checks green on exact HEAD; release review open | On `c099d29…`: secret-pattern scan, `npm audit` (0 vulnerabilities), CycloneDX/license metadata comparison, axe and source-snapshot checks passed. Legal compatibility/notice review, contributor-rights, privacy/security sign-off, working-title review and final asset rights remain open. |
| P4-001 | P4 | Release and post-launch operations | Pending | Define release artifact identity, rollback, production smoke and incident response; execute a rollback drill. |

## Hard gates

- Do not merge or modify `main` while P1 blockers and release rights gates remain open.
- Running, failed, cancelled or skipped workflow **jobs** are not passes. The current browser suite itself reported 4 skipped WebGL-dependent cases; they are explicitly not represented as passed tests.
- Do not invent prices, progression, legacy-save formats, incident workflows, licenses or owner approvals.
- Every code change needs exact-SHA App CI and Master Pack Validation, reviewed diff, tests and updated evidence.
