# Herbal Line — Prioritized Backlog

| ID | Priority | Work package | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|---|
| P0-001 | P0 | Repository truth audit | — | `docs/audits/BASELINE.md`; remote HEAD/path evidence; ZIP SHA-256 and archive validation | Audit documented; historical baseline complete |
| P0-002 | P0 | Canonical scope/contract reconciliation and exact pack parity | P0-001 | Decision log; reproducible per-path comparison for all 42 ZIP files; all intentional deviations documented | Source-level decisions recorded; exact byte-for-byte parity OPEN |
| P0-003 | P0 | Reproducible TypeScript/CI baseline | P0-002 | Same-revision install, lint, format, typecheck, unit tests, build, browser E2E, preview smoke, pack validation and diff check | VERIFIED on `bce2a0bd0edda036032be03e8dfea3033057ea52`; run 38182289439 green |
| P1-001 | P1 | Botanical operations vertical slice | P0-003 | Domain transition tests plus real Chromium interaction and WebGL canvas | Functional baseline implemented; negative-path and accessibility acceptance continue |
| P1-002 | P1 | Save/load, validation and recovery | P0-003 | SHA-256 envelope, IndexedDB tests, reload round-trip, corrupt-primary fallback, import/export E2E | Functional baseline implemented; migration-chain, quota/interrupted-write and cross-browser hardening open |
| P1-003 | P1 | Operational dashboard and queue UX | P1-001 | State-derived guidance, blocked-action reasons, keyboard and viewport acceptance | Contextual live guidance implemented and CI-verified; full accessibility/responsive audit remains open |
| P1-004 | P1 | Quality, audit and incident systems | P1-001 | Hold/release gates, audit trail, rejected-batch terminal path and corrective-action tests | Partial; expand integration and E2E evidence |
| P2-001 | P2 | Facility, capacity, staffing and maintenance | P1-001 | Capacity/assignment invariants and scenario tests | Pending |
| P2-002 | P2 | Economy and progression | P2-001 | Ledger invariants and multi-stage balancing simulation | Partial finance selector; balancing pending |
| P2-003 | P2 | Content, tutorial and contextual notices | P1-003 | Content review, source register, UX tests | Pending |
| P3-001 | P3 | Visual/audio polish and asset pipeline | P1-003 | Asset/license manifest, visual QA, performance evidence | Pending; current facility view is a foundation, not final art |
| P3-002 | P3 | Release candidate QA/security/rights | P2-* | CI evidence, dependency/secret scan, accessibility and rights review | Pending |
| P4-001 | P4 | Release and post-launch operations | P3-* | Artifact identity, rollback plan, release smoke tests, incident runbook | Pending |

Priorities describe order, not permission to bypass dependencies. No task is complete merely because its files exist.
