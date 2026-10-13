# Dr. Green Dump / DopeFarm — Prioritized Backlog

**Status source:** verified CI for implementation revision `1a2bd1779617f39d0f7d5a383a02f18f82c3ad3d`; the current branch must pass CI again after this bookkeeping refresh.

| ID | Priority | Work package | Status | Evidence / remaining acceptance |
|---|---|---|---|---|
| P0-001 | P0 | Repository truth audit | Complete | Branch, base, manifest, provenance and known risks recorded; do not confuse source-snapshot identity with ZIP-container re-hashing. |
| P0-002 | P0 | Canonical scope/contract reconciliation | Complete for current implementation | Owner-confirmed medical-cannabis game scope and Third Person are enforced by policy and product validator. Detailed product decisions listed below remain open. |
| P0-003 | P0 | Reproducible engineering baseline | Green on verified baseline | [App CI]( https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38423858305 ) and [Master Pack Validation]( https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38423858306 ) both passed on exact revision `1a2bd1779617f39d0f7d5a383a02f18f82c3ad3d`; this revision had 76/76 unit tests and 59 browser tests passed, with 4 WebGL-dependent browser cases skipped. |
| P1-001 | P1 | Intake-to-pharmacy vertical slice | Implemented / CI green | Domain and browser scenarios cover intake, production, QC, inventory, order, delivery, ledger and traceability. |
| P1-002 | P1 | Save/load, validation and recovery | In progress — schema blocker | Current v1 validation, checksum, backup recovery, quota/transaction fault tests and import/export are covered. Legacy migration remains blocked until an actual legacy save schema is identified. |
| P1-003 | P1 | Operational dashboard and queue UX | Implemented / CI green | Keyboard, responsive layout, status/error paths, empty states and Axe WCAG 2.1/2.2 A/AA checks pass in CI. |
| P1-004 | P1 | Quality, audit and incident systems | In progress — lifecycle gap | Existing gates cover suspended-license actions, held inventory, audit records and QC rejection. The formal incident/corrective-action lifecycle still needs its state transitions and persistence/events implemented against the documented contract; do not invent real-world procedures. |
| P1-005 | P1 | Visible cannabis plant care and 3D feedback | Implemented / CI green with renderer limitation | Fictional plant-care commands, direct selection, feedback and persistence are covered. Four renderer-dependent browser cases were skipped when WebGL was unavailable; keep this limitation visible and improve deterministic WebGL coverage. |
| P2-001 | P2 | Facility, capacity, staffing and maintenance | Implemented / CI green | Invariants and browser scenarios pass. |
| P2-002 | P2 | Economy and progression | Blocked by missing authoritative balance | `sensor_pack_1` and `drying_rack_1` remain unavailable; no XP thresholds, prices, effects or unlock rules may be invented. |
| P2-003 | P2 | Content, tutorial and contextual guidance | Implemented / CI green | State-derived guidance/tutorial and compliance/QC/delivery states have unit and browser coverage. Editorial/content approval remains a release gate. |
| P3-001 | P3 | Final art/audio/asset pipeline | Blocked by approved final assets | Current procedural scene is a functional foundation, not final premium art. Final art/audio must have recorded provenance and compatible commercial-use rights; visual/performance evidence remains open. |
| P3-002 | P3 | Release candidate QA/security/rights | Engineering checks green; release review open | On the verified baseline: secret-pattern scan passed across 802 reachable text blobs; `npm audit` found 0 vulnerabilities; CycloneDX/license metadata, axe, tests and source-snapshot checks passed. Legal compatibility/notice review, privacy/security review and final asset rights remain open. |
| P4-001 | P4 | Release and post-launch operations | Pending | Define release artifact identity, rollback, production smoke and incident response; execute a rollback drill. |

## Hard gates

- Do not merge or modify `main` while P1 blockers and release rights gates remain open.
- Running, failed, cancelled or skipped workflow **jobs** are not passes. The current browser suite itself reported 4 skipped WebGL-dependent cases; they are explicitly not represented as passed tests.
- Do not invent prices, progression, legacy-save formats, incident workflows, licenses or owner approvals.
- Every code change needs exact-SHA App CI and Master Pack Validation, reviewed diff, tests and updated evidence.
