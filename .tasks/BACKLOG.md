# Herbal Line — Prioritized Backlog

| ID | Priority | Work package | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|---|
| P0-001 | P0 | Repository truth audit | — | `docs/audits/BASELINE.md`; remote HEAD/path evidence; ZIP SHA-256 and archive validation | Audit documented; historical baseline complete |
| P0-002 | P0 | Canonical scope/contract reconciliation and source archive provenance | P0-001 | Contract decision log, archive SHA-256, per-path blob report and explicit scope decision | Scope fork documented in `docs/audits/MASTERPACK_PARITY_REPORT.md`; exact ZIP mirror intentionally not claimed |
| P0-003 | P0 | Reproducible TypeScript/CI baseline | P0-002 | Same-revision install, lint, format, typecheck, unit tests, build, browser E2E, preview smoke, pack validation and diff check | VERIFIED on feature revision `64e29a6fe0165075b61914f296114294c2d3e981`; run 38208111520 green |
| P1-001 | P1 | Medical cannabis operations vertical slice | P0-003 | Domain transition tests plus real Chromium interaction and WebGL canvas | Domain negative-path tests expanded; third-person interaction foundation present; full browser negative-path and CI on this branch pending |
| P1-002 | P1 | Save/load, validation and recovery | P0-003 | SHA-256 envelope, IndexedDB tests, reload round-trip, corrupt-primary fallback, import/export E2E | Migration chain, quota and interrupted-write recovery tests added; cross-browser coverage remains open |
| P1-003 | P1 | Operational dashboard and queue UX | P1-001 | State-derived guidance, blocked-action reasons, keyboard and viewport acceptance | Canvas description and focus notes added; real AT session and focus restoration still open |
| P1-004 | P1 | Quality, audit and incident systems | P1-001 | Hold/release gates, audit trail, rejected-batch terminal path and corrective-action tests | Corrective action command implemented with tests (recovery_review → valid, reason required, valid state rejected) |
| P2-001 | P2 | Facility, capacity, staffing and maintenance | P1-001 | Capacity/assignment invariants, maintenance lifecycle, role constraints, unit and Chromium E2E scenarios | Property-style command sequence test added; full property-based coverage and same-revision CI still pending |
| P2-002 | P2 | Economy and progression | P2-001 | Idempotent daily wages/utilities, multi-day projections, cash runway, tiered ledger-backed upgrades, one-time distress recovery, unit and Chromium E2E scenarios | Extended property-style tests added (repeated end-day, bad staff assignment); longer-horizon balancing and same-revision CI still open |
| P2-003 | P2 | Content, tutorial and contextual notices | P1-003 | Content review, source register, UX tests | State-derived six-step tutorial, source register and browser assertions added; exact-revision CI pending; contextual notices and accessibility review remain open |
| P3-001 | P3 | Visual/audio polish and asset pipeline | P1-003 | Asset/license manifest, visual QA, performance evidence | Current procedural assets documented as not release-cleared (`docs/ASSET_GATE_CURRENT.md`); final art pipeline still open |
| P3-002 | P3 | Release candidate QA/security/rights | P2-* | CI evidence, dependency/secret scan, accessibility and rights review | Release readiness checklist added (`docs/RELEASE_READINESS_P3_P4.md`); full WCAG/AT and cross-browser still open |
| P4-001 | P4 | Release and post-launch operations | P3-* | Artifact identity, rollback plan, release smoke tests, incident runbook | Evidence capture script added; signed artifact and owner sign-off still open |

Priorities describe order, not permission to bypass dependencies. No task is complete merely because its files exist.
