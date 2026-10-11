# Herbal Line — Prioritized Backlog

| ID | Priority | Work package | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|---|
| P0-001 | P0 | Repository truth audit | — | `docs/audits/BASELINE.md`; remote HEAD/path evidence; ZIP SHA-256 and archive validation | Audit recorded |
| P0-002 | P0 | Exact Master Pack parity | P0-001 | Reproducible expected-vs-actual Git blob comparison for all 42 files; exact sync baseline | OPEN — 4/42 exact blobs, 38 mismatches, 33 extra paths at revision 24a0f650 |
| P0-003 | P0 | Reproducible TypeScript/CI baseline | P0-002 | Install, lint, format, typecheck, unit tests, build, browser E2E, preview smoke, pack validator and diff check | VERIFIED on 24a0f650; run 38182607944 green |
| P1-001 | P1 | Botanical operations vertical slice | P0-003 | Positive/negative transition tests; released inventory gate; terminal rejection; delivery idempotency | Functional baseline; 27 unit tests and 4 Chromium E2E tests green |
| P1-002 | P1 | Save/load, validation and recovery | P0-003 | SHA-256 envelope, IndexedDB tests, reload, backup recovery, export/import E2E | Functional baseline verified; migration/quota/cross-browser hardening open |
| P1-003 | P1 | Operational dashboard and queue UX | P1-001 | Keyboard-accessible core flow, explicit blocked-action reasons and tested empty/error states | Next after P0 parity |
| P1-004 | P1 | Quality, audit and incident systems | P1-001 | Hold/release gates, audit trail, terminal rejection and corrective-action tests | Partial; terminal rejection covered, expand evidence |
| P2-001 | P2 | Facility, capacity, staffing and maintenance | P1-001 | Capacity/assignment invariants and scenario tests | Pending |
| P2-002 | P2 | Economy and progression | P2-001 | Ledger invariants and multi-stage balancing simulation | Ledger selectors implemented; balancing pending |
| P2-003 | P2 | Content, tutorial and contextual notices | P1-003 | Content review, source register, UX tests | Pending |
| P3-001 | P3 | Visual/audio polish and asset pipeline | P1-003 | Asset/license manifest, visual QA, performance evidence | Pending; current facility is foundation art |
| P3-002 | P3 | Release candidate QA/security/rights | P2-* | CI evidence, dependency/secret scan, accessibility and rights review | Pending |
| P4-001 | P4 | Release and post-launch operations | P3-* | Artifact identity, rollback plan, release smoke tests, incident runbook | Pending |

Priorities describe order, not permission to bypass dependencies. No task is complete merely because its files exist.
