# Herbal Line — Prioritized Backlog

| ID | Priority | Work package | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|---|
| P0-001 | P0 | Repository truth audit | — | `docs/audits/BASELINE.md`; remote HEAD/path evidence; ZIP SHA-256 and archive validation | Audit documented; historical baseline complete |
| P0-002 | P0 | Canonical scope/contract reconciliation and source archive provenance | P0-001 | Contract decision log, archive SHA-256, per-path blob report and explicit scope decision | Scope fork documented in `docs/audits/MASTERPACK_PARITY_REPORT.md`; exact ZIP mirror intentionally not claimed |
| P0-003 | P0 | Reproducible TypeScript/CI baseline | P0-002 | Same-revision install, lint, format, typecheck, unit tests, build, browser E2E, preview smoke, pack validation and diff check | VERIFIED on feature revision `64e29a6fe0165075b61914f296114294c2d3e981`; run 38208111520 green |
| P1-001 | P1 | Medical cannabis operations vertical slice | P0-003 | Domain transition tests plus real Chromium interaction and WebGL canvas | Full 12-command browser delivery path and reload/ledger assertions added; exact-revision CI pending; negative-path/accessibility acceptance remains open |
| P1-002 | P1 | Save/load, validation and recovery | P0-003 | SHA-256 envelope, IndexedDB tests, reload round-trip, corrupt-primary fallback, import/export E2E | Functional baseline implemented; migration-chain, quota/interrupted-write and cross-browser hardening open |
| P1-003 | P1 | Operational dashboard and queue UX | P1-001 | State-derived guidance, blocked-action reasons, keyboard and viewport acceptance | Keyboard order, mobile geometry, live regions and reduced motion covered by 7 Chromium E2E tests; full WCAG review open |
| P1-004 | P1 | Quality, audit and incident systems | P1-001 | Hold/release gates, audit trail, rejected-batch terminal path and corrective-action tests | Terminal rejection and UI recovery path merged and CI-verified; corrective-action/incident review remains open |
| P2-001 | P2 | Facility, capacity, staffing and maintenance | P1-001 | Capacity/assignment invariants, maintenance lifecycle, role constraints, unit and Chromium E2E scenarios | Staffing/maintenance implementation added on reconciled branch; same-revision CI verification pending |
| P2-002 | P2 | Economy and progression | P2-001 | Idempotent daily wages/utilities, multi-day projections, cash runway, tiered ledger-backed upgrades, one-time distress recovery, unit and Chromium E2E scenarios | Daily settlement, forecast/runway, one-time recovery and two prerequisite-gated efficiency tiers implemented on feature branch; exact-revision CI pending; longer-horizon balance tuning remains open |
| P2-003 | P2 | Content, tutorial and contextual notices | P1-003 | Content review, source register, UX tests | State-derived six-step tutorial, source register and browser assertions added; exact-revision CI pending; contextual notices and accessibility review remain open |
| P3-001 | P3 | Visual/audio polish and asset pipeline | P1-003 | Asset/license manifest, visual QA, performance evidence | Pending; current facility view is a foundation, not final art |
| P3-002 | P3 | Release candidate QA/security/rights | P2-* | CI evidence, dependency/secret scan, accessibility and rights review | Pending |
| P4-001 | P4 | Release and post-launch operations | P3-* | Artifact identity, rollback plan, release smoke tests, incident runbook | Pending |

Priorities describe order, not permission to bypass dependencies. No task is complete merely because its files exist.
