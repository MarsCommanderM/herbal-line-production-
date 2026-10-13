# Next Task — Authoritative Queue

## Verified baseline

Exact verified source revision: `4c4c77ff4f4d969009e9354d32f6292256c745e1`.

- [Full DopeFarm CI](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38354410131): **SUCCESS** on that exact SHA.
- [Master Pack Validation](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38354410210): **SUCCESS** on the same SHA.
- All workflow gates passed: locked install, lint, format, strict TypeScript, unit tests, production build, Chromium/Firefox/WebKit E2E, preview smoke, Master-Pack/source-snapshot validation, product-policy validation and whitespace.
- Browser E2E reported **53 passed, 4 skipped**. Four WebGL-dependent checks are skipped in Firefox when the runner exposes no WebGL canvas. The current follow-up adds a dedicated WebGL-failure test that verifies the management UI and a care action still work without the 3D renderer; this new commit must receive its own full CI run.

## Completed

- **P0-001 — Repository truth audit:** baseline, branch truth, source manifest, original-pack provenance and classified differences are recorded in `docs/audits/BASELINE.md`.
- **P0-002 — Contract reconciliation:** runtime/source contract ownership and product scope are documented in `docs/audits/CONTRACT_RECONCILIATION.md`.
- **P0-003 — Reproducible engineering baseline:** full exact-commit CI passed on `4c4c77ff4f4d969009e9354d32f6292256c745e1`.
- **P1-001 — Vertical-slice domain:** intake/production/QC/inventory/order/delivery loop and negative transition tests are implemented and green.
- **P1-003 — Core operational UX:** keyboard navigation, mobile layout, status semantics, error states and core queue flows are covered by browser acceptance.
- **P1-005 — Visible cannabis care and third-person interaction:** movement, camera follow, collision/range, care controls, pruning, cutting/setting, material/light feedback and autosave/reload passed on the verified revision.
- **P2-001 — Facility/capacity/staffing/maintenance core:** invariants and the browser scenario passed on the verified revision.

## Remaining work, ordered by dependency

1. **WebGL fallback acceptance:** verify the new explicit failure-injection test on the current commit; rerun every CI gate on its exact SHA.
2. **P1-002 — Persistence evolution/recovery:** quota exhaustion, aborted writes, checksum validation, corrupt-save handling, backup recovery, import/export and autosave/reload are covered. A migration chain remains open only for a real, evidenced legacy schema; do not invent one.
3. **P1-004 — Quality/compliance incidents:** browser E2E covers suspended-license care/dispatch, held inventory and QC terminal rejection. Formal incident/corrective-action lifecycle still lacks an authoritative product contract; keep that decision open rather than inventing a new workflow.
4. **P2-002 — Economy/progression:** blocked until authoritative fictional upgrade prices/effects, XP/level thresholds and unlock rules are recorded. Unconfigured upgrades remain unavailable.
5. **P2-003 — Content/tutorial/source notices:** complete contextual guidance and evidence-based content review.
6. **P3-001 — Final art/audio/asset pipeline:** procedural avatar and geometry remain placeholders. Final character/environment art, animation, audio, asset hashes, provenance, licenses and visual/performance QA remain open.
7. **P3-002 / P4 — Release gates and operations:** security/privacy/accessibility/rights review, artifact identity, rollback and incident runbook remain open.

## Operating rules

- Work only on `restore/original-masterpack-product-scope-20261012`; keep `main` unchanged until review and release gates are complete.
- Plant-care and production parameters are fictional game values only; do not add real-world cultivation instructions.
- Do not invent balance values, asset licenses, legacy-save formats or unapproved incident workflows.
- A task is complete only with implementation evidence, tests, reviewed diff and updated documentation.
- Running, cancelled, skipped or failed workflow jobs are not passes. Parent-commit results never transfer to a newer SHA.
