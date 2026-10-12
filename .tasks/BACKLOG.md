# Herbal Line — Prioritized Backlog

| ID | Priority | Work package | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|---|
| P0-001 | P0 | Repository truth audit | — | `docs/audits/BASELINE.md`; remote head/path checks; archive-to-branch path and content-hash comparison | Audit documented; exact archive bytes/parity unavailable, remains blocked |
| P0-002 | P0 | Canonical scope/contract reconciliation | P0-001 | Decision log; consistent domain and persistence contracts; final parity review | Source-level reconciled; final review open pending P0-001 |
| P0-003 | P0 | Reproducible TypeScript/CI baseline | P0-002 | Clean locked install, lint, format, typecheck, tests, build, E2E, smoke and document validation on one SHA | Verified green at `a9ff0d8cf481529baab73b62d1d1526402cfa169`; run #38210853633 |
| P1-001 | P1 | Botanical operations vertical slice | P0-003 | Positive/negative state transition tests, QC release guard, traceability, order→delivery→single ledger posting, browser end-to-end | Verified green at `a9ff0d8cf481529baab73b62d1d1526402cfa169`; domain and browser acceptance pass |
| P1-002 | P1 | Save/load, validation and recovery | P0-003 | V1 envelope, checksum validation, legacy checksum compatibility, corrupt-save recovery, failed-write/retry tests; migration policy | Core validation/recovery verified; pre-v1 schema migration remains open because no canonical legacy schema is supplied |
| P1-003 | P1 | Operational dashboard and queue UX | P1-001 | Accessible process, room-capacity, machine, order/delivery queues; error/empty states; keyboard core flow | Verified green at `a9ff0d8cf481529baab73b62d1d1526402cfa169`; Playwright dashboard and keyboard test pass |
| P1-004 | P1 | Quality, audit and incident systems | P1-001 | Hold/release gates, durable audit trail, incident and corrective-action transition tests | Implementation added; acceptance pending CI run |
| P2-001 | P2 | Facility, capacity, staffing and maintenance | P1-001 | Capacity/assignment invariants and scenario tests | Pending |
| P2-002 | P2 | Economy and progression | P2-001 | Ledger invariants and multi-stage balancing simulation | Pending on this branch |
| P2-003 | P2 | Content, tutorial and contextual research notices | P1-003 | Content review, source register, UX tests | Pending |
| P3-001 | P3 | Visual/audio polish and asset pipeline | P1-003 | Asset/license manifest, visual QA, performance evidence | Pending |
| P3-002 | P3 | Release candidate QA/security/rights | P2-* | CI evidence, dependency/secret scan, accessibility and rights review | Pending |
| P4-001 | P4 | Release and post-launch operations | P3-* | Artifact identity, rollback plan, smoke tests, incident runbook | Pending |

Priorities describe order, not permission to bypass dependencies. No task is complete merely because its files exist.
