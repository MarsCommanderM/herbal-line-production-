# Next Task — Authoritative Queue

## Exact verified implementation baseline

Current verified implementation HEAD: `d0e88c1433967617b7d92b91ac6bc12891dc7a8d`.

- [Full DopeFarm CI, run 38564908633](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38564908633): **SUCCESS** on this exact SHA.
- [Master Pack Validation, run 38564908664](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38564908664): **SUCCESS** on the same SHA.
- App CI passed the locked install, credential-pattern scan, `npm audit` (**0 vulnerabilities**), CycloneDX SBOM/license metadata comparison, lint, format, strict TypeScript, unit tests, production build, browser E2E, preview smoke, master-pack validation, preserved-source verification, product-policy validation and whitespace.
- Unit tests: **11 test files passed**.
- Browser E2E: **71 passed, 4 skipped**. Four Firefox WebGL-dependent cases remain skipped: third-person movement/camera, direct plant selection, plant-care persistence/reload, and old-save visual cleanup. These are not passes; Chromium and WebKit passed those same scenarios. Chromium/SwiftShader world interaction is required; the graphics-fallback scenario is also tested.
- Original Master Pack snapshot: **42/42 files verified against recorded Git blob IDs**. The historical ZIP container is not stored in the repository, so its recorded archive digest is provenance, not a re-hash performed by this CI.
- Original-source/root parity remains **20/42 exact active-root matches and 22/42 classified active-root differences**; original source bytes remain preserved under `masterpack/source/`.
- Current `main`: `2b2dd96ed1739f4395ff02ac6a9cd399e940be94`. PR #26 remains open and unmerged.

## Remaining work, priority order

1. **P1-002 — Save migration:** historical Master Pack V1 and previous active-app V1 shapes are supported with strict checksum, payload, ledger and invariant checks. Conflicting ledger/balance snapshots or unreconstructable assessment references return `MIGRATION_FAILED` without overwriting the source save. Regression coverage exists; exact-HEAD CI above passed.
2. **P1-004 — Compliance lifecycle:** implemented in HEAD `c099d29…`: typed `ComplianceCase`/`AuditRun` state, incident/violation recording, corrective-action recording/submission/verification, audit start/completion, recovery-finalization gate, save validation, cross-entity invariants, domain events, visible management actions, unit tests and browser persistence coverage. Exact-HEAD CI above passed. **Still open:** no canonical rule authorizes numerical reduction of compliance risk; do not invent one. Further work needs an authoritative fictional balance decision.
3. **P1-005 — WebGL acceptance:** exact-HEAD E2E reports four renderer-dependent skips. Keep them visible; deterministic three-engine world-renderer parity remains unproven. Chromium/SwiftShader interaction acceptance is mandatory and passed in the current run.
4. **P2-002 — Economy/progression:** upgrades `sensor_pack_1` and `drying_rack_1` remain unavailable until authoritative fictional prices, effects, prerequisites, XP thresholds and unlock rules are approved. No values may be invented.
5. **P3-001 — Final art/audio and asset pipeline:** no standalone GLB/FBX/OBJ/Blender/texture/audio deliverables are present in the tracked tree; character, plant and facility visuals are procedural runtime placeholders. Replace them with original or properly licensed final assets, register source/hash/rights and retain target-resolution visual/performance evidence.
6. **P3-002 — Private-use security/privacy/rights scope:** exact-head CI verifies the dependency SBOM, SPDX metadata, generated third-party notices, local build and browser acceptance. Commercial trademark clearance, paid assets, public-release rights packaging, production-host hardening and formal legal sign-off are out of scope for the owner's stated private game shared with at most 2–3 friends. Keep `THIRD_PARTY_NOTICES.txt` with any shared build, do not add assets with unknown rights, and do not claim exclusive ownership of unverified contributions.
7. **P4-001 — Release operations:** produce a hash-identified release artifact, deployment smoke evidence, rollback/incident runbook and a recorded rollback drill.

## Operating constraints

- Work only on `restore/original-masterpack-product-scope-20261012`; keep `main` unchanged until every required acceptance and release gate is satisfied.
- Product scope is Dr. Green Dump / DopeFarm: recognizable medical-cannabis plants, directly visible plant-care gameplay and Third Person. No generic herb substitution.
- All cultivation/process values are fictional simulation abstractions, never real-world production parameters.
- Every code or workflow change must pass both full App CI and Master Pack Validation on its exact new SHA. Running/failed/cancelled/skipped checks are not passes.
- Do not generate or import assets with unknown or unapproved licenses. Paid Meshy submissions require a separately approved asset brief, declared spend and one-off authorization.
