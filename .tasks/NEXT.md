# Next Task — Authoritative Queue

## Latest verified baseline

Exact source revision: `41ae376e527a79d28ff1692fd19d6db2a4052631`.

- [Full DopeFarm CI, run 38355313631](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38355313631): **SUCCESS** on this exact SHA.
- [Master Pack Validation, run 38355313567](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38355313567): **SUCCESS** on the same SHA.
- Successful gates include locked install, lint, format, strict TypeScript, unit tests, production build, Chromium/Firefox/WebKit E2E, production preview smoke, master-pack and preserved-source verification, product-policy validation and whitespace.
- The E2E suite includes a WebGL initialization failure-injection case; the management UI and a care action remain testable without the renderer. WebGL-dependent world-interaction tests may be skipped in a browser environment that exposes no WebGL canvas; those skips are not counted as passes.
- `main` remains at `2b2dd96ed1739f4395ff02ac6a9cd399e940be94`; no merge is authorized by this CI result alone.

## Completed with evidence

- **P0-001 — Repository truth audit:** baseline, branch truth, source manifest, original-pack provenance and classified differences are recorded.
- **P0-002 — Contract reconciliation:** original canonical contracts remain separate from tested runtime extensions.
- **P0-003 — Reproducible engineering baseline:** both mandatory workflows pass on exact SHA `41ae376e527a79d28ff1692fd19d6db2a4052631`.
- **P1-001 — Vertical slice:** intake, production, QC, inventory, order, delivery and transition tests are implemented.
- **P1-003 — Core operational UX:** keyboard navigation, mobile layout, status semantics and error paths have E2E coverage.
- **P1-005 — Visible cannabis care and third-person interaction:** keyboard movement, following camera, collision/range, direct plant selection, care controls, pruning, cutting/setting, visual feedback and persistence have automated coverage.
- **P2-001 — Facility/capacity/staffing/maintenance core:** invariants and browser scenarios pass.
- **WebGL fallback acceptance:** explicit renderer-failure test is included in the E2E suite and the exact-SHA full CI passes.

## Remaining work, ordered by dependency

1. **P1-002 — Persistence evolution/recovery:** current v1 validation, corruption handling, backup recovery, quota/transaction fault tests and import/export are covered. Keep legacy migration open until an actual legacy schema is identified and evidenced; do not invent one.
2. **P1-004 — Quality/compliance incidents:** current tests cover suspended-license actions, held inventory and terminal QC rejection. A formal incident/corrective-action lifecycle requires an authoritative product contract before implementation.
3. **P2-002 — Economy/progression:** source-listed upgrades remain unavailable until authoritative fictional prices, effects, XP/level thresholds and unlock rules are documented. Do not invent balance values.
4. **P2-003 — Content/tutorial/source notices:** add contextual guidance and acceptance evidence without expanding product scope or making real-world cultivation claims.
5. **P3-001 — Final art/audio/asset pipeline:** replace procedural placeholders only with assets whose provenance and commercial-use rights are verified; add animation, visual QA and performance evidence.
6. **P3-002 — Release candidate QA/security/rights:** complete dependency and secret review, accessibility, privacy/security, IP/license review and release artifact verification.
7. **P4-001 — Release/operations:** document artifact identity, rollback, production smoke and incident response; run a rollback drill.

## Operating rules

- Work only on `restore/original-masterpack-product-scope-20261012`; preserve `main` until all release blockers are resolved and review is complete.
- All plant-care and production parameters are fictional game abstractions only.
- Do not invent prices, progression, legacy-save formats, incident workflows, asset licenses or owner approvals.
- Every task requires implementation evidence, tests, reviewed diff and updated documentation.
- Running, cancelled, skipped or failed workflow jobs are not passes. Evidence belongs only to the exact SHA tested.
