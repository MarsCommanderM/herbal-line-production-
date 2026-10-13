# Next Task — Authoritative Queue

## Latest verified baseline

Exact source revision: `341344b8f29be93f8f979056ed33b55c7bb9a1c6`.

- [Full DopeFarm CI, run 38405281308](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38405281308): **SUCCESS** on this exact SHA.
- [Master Pack Validation, run 38405263958](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38405263958): **SUCCESS** on the same SHA.
- The full CI passed locked install, source lint, format, strict TypeScript, unit tests, production build, Chromium/Firefox/WebKit browser E2E, production preview smoke, master-pack and preserved-source verification, product-policy validation, and whitespace.
- Browser coverage includes third-person movement and direct plant selection, visible-care state and persistence, Save/Load/recovery, compliance blocks, held inventory, QC rejection, keyboard/mobile/reduced-motion paths, maintenance, settlement/delivery, state-derived guidance/tutorial, and explicit WebGL initialization failure injection.
- Renderer-dependent world-interaction tests may skip when a browser exposes no WebGL canvas; that limitation is documented and does not replace the explicit graphics-failure fallback test.
- `main` remains at `2b2dd96ed1739f4395ff02ac6a9cd399e940be94`; no merge is authorized by this CI result alone.

## Completed with evidence

- **P0-001 — Repository truth audit:** baseline, branch truth, source manifest, original-pack provenance and classified differences are recorded.
- **P0-002 — Contract reconciliation:** original canonical contracts remain separate from tested runtime extensions.
- **P0-003 — Reproducible engineering baseline:** both mandatory workflows pass on exact SHA `341344b8f29be93f8f979056ed33b55c7bb9a1c6`.
- **P1-001 — Vertical slice:** intake, production, QC, inventory, order, delivery and transition tests are implemented.
- **P1-003 — Core operational UX:** keyboard navigation, mobile layout, status semantics and error paths have E2E coverage.
- **P1-005 — Visible cannabis care and third-person interaction:** keyboard movement, following camera, collision/range, direct plant selection, care controls, pruning, cutting/setting, visual feedback and persistence have automated coverage.
- **P2-001 — Facility/capacity/staffing/maintenance core:** invariants and browser scenarios pass.
- **P2-003 — Content/tutorial/source notices:** state-derived campaign guidance and tutorial, safe empty-entity behavior, compliance/QC/delivery states, non-mutation unit tests, UI rendering and transitions are covered by unit/E2E acceptance on the verified head.
- **WebGL fallback acceptance:** explicit renderer-failure test passes in the full CI suite; management controls and a care action remain usable.

## Remaining work, ordered by dependency

1. **P1-002 — Persistence evolution/recovery:** current v1 validation, corruption handling, backup recovery, quota/transaction fault tests and import/export are covered. Keep legacy migration open until an actual legacy schema is identified and evidenced; do not invent one.
2. **P1-004 — Quality/compliance incidents:** current tests cover suspended-license actions, held inventory and terminal QC rejection. A formal incident/corrective-action lifecycle requires an authoritative product contract before implementation.
3. **P2-002 — Economy/progression:** source-listed upgrades remain unavailable until authoritative fictional prices, effects, XP/level thresholds and unlock rules are documented. Do not invent balance values.
4. **P3-001 — Final art/audio/asset pipeline:** replace procedural placeholders only with assets whose provenance and commercial-use rights are verified; add animation, visual QA and performance evidence.
5. **P3-002 — Release candidate QA/security/rights:** complete dependency and secret review, accessibility, privacy/security, IP/license review and release artifact verification.
6. **P4-001 — Release/operations:** document artifact identity, rollback, production smoke and incident response; run a rollback drill.

## Operating rules

- Work only on `restore/original-masterpack-product-scope-20261012`; preserve `main` until all release blockers are resolved and review is complete.
- All plant-care and production parameters are fictional game abstractions only.
- Do not invent prices, progression, legacy-save formats, incident workflows, asset licenses or owner approvals.
- Every task requires implementation evidence, tests, reviewed diff and updated documentation.
- Running, cancelled, skipped or failed workflow jobs are not passes. Evidence belongs only to the exact SHA tested.
