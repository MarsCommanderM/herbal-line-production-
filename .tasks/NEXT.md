# Next Task — Authoritative Queue

## Current verified implementation baseline

Exact implementation revision: `1a2bd1779617f39d0f7d5a383a02f18f82c3ad3d`.

- [Full DopeFarm CI, run 38423858305](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38423858305): **SUCCESS** on the exact revision.
- [Master Pack Validation, run 38423858306](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38423858306): **SUCCESS** on the same revision.
- CI gates passed: full-history credential-pattern scan, locked install, `npm audit` (0 vulnerabilities), CycloneDX SBOM and dependency-license metadata comparison, source lint, format, strict TypeScript, 76 unit tests, production build, browser E2E, production preview smoke, master-pack validation, preserved-source verification, product-policy validation and whitespace.
- Browser E2E: **59 passed, 4 skipped**. The skipped cases are renderer-dependent; some hosted browser contexts expose no WebGL canvas. The explicit WebGL-initialization-failure fallback test passed in Chromium, Firefox and WebKit. Skipped cases are not claimed as passed.
- Credential-pattern scan: **802 reachable text blobs scanned**, no high-confidence findings.
- Master-pack source snapshot: all 42 preserved files are checked against recorded Git blob IDs. This does not re-hash the original ZIP container because the ZIP binary is not stored in the repository.
- Active root parity remains intentionally **20/42 exact matches, 22/42 classified differences**, plus application-specific files. The root is not claimed to be byte-identical to the historical archive.
- `main` remains at `2b2dd96ed1739f4395ff02ac6a9cd399e940be94`. PR #26 is open and ready for review, but is not authorized to merge while blockers below remain.
- A documentation/status refresh follows this implementation revision; the new head must receive its own green CI before the refreshed branch is called green.

## Remaining work, in priority order

1. **P1-002 — Save migration:** documented historical Master Pack V1 and prior active-app V1 shapes now migrate into active V2. Saves with unreconstructable assessment references or ledger/balance mismatch are rejected with `MIGRATION_FAILED` without overwriting source data. Exact-SHA CI is pending.
2. **P1-004 — Incident/corrective-action lifecycle:** reconcile the documented `ComplianceCase`, `AuditRun`, `Violation` and license recovery state machine with runtime contracts. Implement only transitions supported by the project contract, with typed commands/events, persistence, audit log, UI, invalid-transition tests and browser coverage. Do not add real-world operating procedures.
3. **P1-005 — WebGL acceptance:** eliminate or explicitly isolate the four renderer-dependent skipped E2E cases. Keep world interaction acceptance mandatory in at least the supported Chromium/SwiftShader path; retain fallback testing in all three engines. No skipped case is a pass.
4. **P2-002 — Economy/progression:** keep upgrades locked until an approved fictional balance table defines prices, effects, prerequisites, XP thresholds and unlock rules. No invented numbers.
5. **P3-001 — Visual quality:** replace the clearly temporary procedural avatar/facility assets with original or appropriately licensed final assets; record source, hashes, license/rights evidence, target-resolution screenshots and performance results.
6. **P3-002 — Release security/rights:** engineering automation is green on the verified baseline. Still require legal compatibility/notice review, privacy/security review, final asset rights and release-artifact/rollback evidence.
7. **P4-001 — Release operations:** define artifact identity, deployment smoke, rollback and incident-response runbook; run a rollback drill.

## Operating rules

- Work only on `restore/original-masterpack-product-scope-20261012`; keep `main` unchanged until the P1 blockers, product review and release gates are closed.
- The game is specifically Dr. Green Dump / DopeFarm: recognizable medical-cannabis plants, visible direct care and a Third-Person player perspective. Never substitute generic herbs.
- All cultivation/process values are fictional game abstractions; do not introduce real-world production parameters.
- Every code change requires exact-SHA App CI and Master Pack Validation. Cancelled/skipped/failed jobs do not count as green.
