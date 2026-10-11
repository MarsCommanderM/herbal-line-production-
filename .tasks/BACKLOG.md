# Herbal Line — Prioritized Backlog

| ID | Priority | Work package | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|---|
| P0-001 | P0 | Repository truth audit | — | `docs/audits/BASELINE.md`; remote head and path checks; local package validator + ZIP integrity recorded; app build explicitly untested | Audit documented; checkout/CI evidence pending |
| P0-002 | P0 | Canonical scope/contract reconciliation | P0-001 | Decision log; consistent domain and persistence contracts | Source-level complete; parity/review open |
| P0-003 | P0 | Reproducible TypeScript/CI baseline | P0-002 | Clean install, lint, typecheck, unit tests and build observed green on current revision | Implemented; current revision verification pending |
| P1-001 | P1 | Botanical operations vertical slice | P0-003 | End-to-end scenario and transition/traceability tests | Domain/UI implemented; browser E2E and full acceptance open |
| P1-002 | P1 | Save/load, validation and recovery | P0-003 | Migration, corrupt-save, quota and retry tests | Pending |
| P1-003 | P1 | Operational dashboard and queue UX | P1-001 | Keyboard-accessible core flow with explicit errors/empty states | Pending |
| P1-004 | P1 | Quality, audit and incident systems | P1-001 | Hold/release gates, audit trail and corrective action tests | Pending |
| P2-001 | P2 | Facility, capacity, staffing and maintenance | P1-001 | Capacity/assignment invariants and scenario tests | Pending |
| P2-002 | P2 | Economy and progression | P2-001 | Ledger invariants and multi-stage balancing simulation | Pending |
| P2-003 | P2 | Content, tutorial and contextual research notices | P1-003 | Content review, source register, UX tests | Pending |
| P3-001 | P3 | Visual/audio polish and asset pipeline | P1-003 | Asset/license manifest, visual QA, performance evidence | Pending |
| P3-002 | P3 | Release candidate QA/security/rights | P2-* | CI evidence, dependency/secret scan, accessibility and rights review | Pending |
| P4-001 | P4 | Release and post-launch operations | P3-* | Artifact identity, rollback plan, smoke tests, incident runbook | Pending |

Priorities describe order, not permission to bypass dependencies. No task is complete merely because its files exist.
