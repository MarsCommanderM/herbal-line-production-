# Dr. Green Dump / DopeFarm — Prioritized Backlog

| ID | Priority | Work package | Depends on | Acceptance evidence | Status |
|---|---|---|---|---|---|
| P0-001 | P0 | Repository truth audit | — | Baseline report, exact commands/results, risks | Complete — audit and current CI evidence recorded |
| P0-002 | P0 | Canonical scope/contract reconciliation | P0-001 | Decision log; consistent domain and persistence contracts | Complete — policy and validator pass |
| P0-003 | P0 | Reproducible TypeScript/CI baseline | P0-002 | Clean install, lint, typecheck, unit tests and build observed green | Complete — DopeFarm CI 38417104774 SUCCESS on exact head 41ff3d43f01da61fa54a645e685a3361c685cab6; companion Master Pack Validation 38417104628 SUCCESS on same SHA |
| P1-001 | P1 | Intake-to-pharmacy vertical slice | P0-003 | End-to-end scenario and transition/traceability tests | Complete — domain and full browser loop tests pass |
| P1-002 | P1 | Save/load, validation and recovery | P0-003 | Migration, corrupt-save, quota and retry tests | In progress — v1 recovery/fault tests pass; legacy migration awaits a defined source schema |
| P1-003 | P1 | Operational dashboard and queue UX | P1-001 | Keyboard-accessible core flow with explicit errors/empty states | Complete — keyboard, mobile, status and error-path E2E pass |
| P1-004 | P1 | Quality, audit and incident systems | P1-001 | Hold/release gates, audit trail and corrective action tests | In progress — browser E2E covers suspended-license care/dispatch, held inventory and QC rejection; formal incident/corrective-action lifecycle lacks an authoritative product contract |
| P1-005 | P1 | Visible cannabis plant care and 3D feedback | P0-003 | Care commands, selected plant UI/3D feedback, saved state, invalid-action and reload tests | Complete — full CI 38417104774 SUCCESS on exact head 41ff3d43f01da61fa54a645e685a3361c685cab6; explicit WebGL failure-injection E2E included; renderer-dependent tests may skip only when browser WebGL is unavailable |
| P2-001 | P2 | Facility, capacity, staffing and maintenance | P1-001 | Capacity/assignment invariants and scenario tests | Complete — invariants and browser scenario tests pass |
| P2-002 | P2 | Economy and progression | P2-001 | Ledger invariants and multi-stage balancing simulation | Blocked — authoritative fictional prices, effects, XP/level and unlock rules are not defined; values must not be invented |
| P2-003 | P2 | Content, tutorial and contextual research notices | P1-003 | Content review, source register, UX tests | Complete — state-derived contextual guidance/tutorial, empty-entity safe states, compliance/QC/delivery paths and UI E2E assertions pass on exact head 41ff3d43f01da61fa54a645e685a3361c685cab6 (CI 38417104774) |
| P3-001 | P3 | Visual/audio polish and asset pipeline | P1-003 | Asset/license manifest, visual QA, performance evidence | Blocked — final art/audio sources and commercial-use licenses are not yet approved |
| P3-002 | P3 | Release candidate QA/security/rights | P2-* | CI evidence, dependency/secret scan, accessibility and rights review | In progress — dependency audit reported 0 vulnerabilities and CycloneDX license metadata is inventoried/validated; secret scanning, accessibility, legal compatibility/required license texts, privacy/security review and release artifact/rollback evidence remain open |
| P4-001 | P4 | Release and post-launch operations | P3-* | Artifact identity, rollback plan, smoke tests, incident runbook | Pending |

Priorities describe order, not permission to bypass dependencies. No task is complete merely because its files exist.
