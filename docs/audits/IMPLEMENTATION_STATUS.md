# Implementation Status and Evidence Ledger

**Snapshot revision:** `bce2a0bd0edda036032be03e8dfea3033057ea52`  
**Branch:** `production/browser-e2e-20261012`  
**Verification:** PASS on the snapshot revision — [GitHub Actions run 38182289439](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38182289439).

## Same-revision verification

| Gate | Result | Evidence |
|---|---|---|
| Locked dependency install | PASS | `npm ci --no-audit --no-fund` |
| Source policy lint | PASS | 11 TypeScript files checked |
| Format check | PASS | 28 source/config files checked |
| Strict TypeScript typecheck | PASS | CI step succeeded |
| Unit tests | PASS | 26 tests across 5 files |
| Production build | PASS | CI step succeeded |
| Chromium browser acceptance | PASS | 3 Playwright tests passed |
| Production preview smoke | PASS | HTML, JS bundle, persistence controls and CSS returned successfully |
| Master-pack validator | PASS | 39 required paths; 6 JSON documents parsed |
| Whitespace / diff check | PASS | `git diff --check` |

## Implemented persistence baseline

- SHA-256 integrity checks over deterministic, key-sorted JSON.
- Version-1 save envelope with transient UI excluded.
- IndexedDB repository validates envelopes before persistence and restore.
- Manual save and load; autosave after successful commands.
- Last-known-good backup before primary replacement.
- Fallback recovery when the primary envelope fails validation.
- JSON export and validated import.
- Unit coverage for stable serialization, corrupt payloads and IndexedDB lifecycle.
- Browser E2E coverage for save/load, autosave across reload, corrupt-primary backup recovery, and export/import round-trip.

The checksum is an integrity check for the save format, not an authentication mechanism. No claim of tamper-proof storage is made.

## Open acceptance criteria

### P0 — Master Pack parity

- Supplied archive SHA-256: `4e783542951f573ed7412444e9e2ed00c490a9b7919f67c30399b86297a4b8972`.
- Archive file count: 42.
- A previous pack-shaped recovery snapshot matched all 42 paths but had 36 blob-content mismatches.
- The active root is intentionally not byte-identical to the historical archive: the recorded comparison is 20/42 exact matches, 22/42 classified intentional/content differences, plus 53 application-specific paths. The exact original 42 source files are preserved under `masterpack/source/` and their expected Git blob IDs are verified by CI. This resolves provenance/classification; it does **not** claim 1:1 active-root parity.

### P1 — Persistence hardening

- Explicit migration chain for a future schema version.
- Quota exhaustion and interrupted/aborted transaction tests are implemented and passed in the verified suite.
- Cross-browser save/load, corrupt-save handling, backup recovery and import/export are exercised in the three-browser E2E suite; the full run reported 44 passed and 4 graphics-dependent skips.
- Recovery when both primary and backup are invalid is explicitly tested; invalid state is not loaded.
- Remaining persistence item: a migration chain for a specifically defined legacy schema. Unsupported versions are rejected safely; no fictional legacy schema will be invented.

### P1 — Gameplay and UX

- Expand negative-path browser acceptance for held inventory, compliance blocks and duplicate delivery/finance events; QC terminal rejection is already covered by E2E.
- Improve queue/dashboard UX, keyboard navigation, empty/error states and accessibility.
- The current facility rendering is a functional foundation, not final production art.

### Release gates

Final asset licensing inventory, visual regression/performance proof, security/privacy review, clean release artifact verification and rollback drill are not complete. No release-ready claim is made.

## Next action

Continue P1-004 with a formal compliance incident/corrective-action lifecycle and browser negative-path tests for compliance blocks, held inventory and duplicate financial/delivery events. Keep P1-002's migration-chain item blocked until a concrete legacy schema exists. Economy/progression balance values and final art/audio/licensing remain explicit release blockers.


## Status interpretation — current production branch

The PASS entries above are evidence for their explicitly named historical snapshots/runs only. The old `c9116b8b65f4ce9d59b8f1dc54cfabe3c8bc3f38` paragraph is historical and superseded by the verified restoration baseline below. For the current branch state, use the exact SHA and linked CI runs in the latest verification section; a parent commit's green result never proves a newer commit.


## Latest exact-commit verification — 2026-10-13

Verified code revision: `41ae376e527a79d28ff1692fd19d6db2a4052631`.

- [Full DopeFarm CI, run 38355313631](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38355313631): **SUCCESS** on the exact SHA.
- [Master Pack Validation, run 38355313567](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38355313567): **SUCCESS** on the same SHA.
- All configured gates passed: locked install, source lint, format, strict TypeScript, domain tests, production build, browser E2E, preview smoke, master-pack and preserved-source verification, product-policy validation and whitespace.
- The E2E suite includes third-person movement/direct plant selection, plant-care state and visual feedback, save/load/recovery, compliance holds, held inventory, QC rejection, keyboard/mobile/accessibility paths, maintenance, settlement/delivery and an explicit WebGL initialization failure-injection test.
- WebGL-dependent world tests may be skipped in browser environments that expose no WebGL canvas; the explicit fallback test is the acceptance path for renderer failure. Skipped tests are not counted as passes.
- This is the latest verified engineering baseline, not a release-ready declaration. Product-contract, balance, final art/audio/licensing, security/rights and release-operations blockers remain open as recorded in `.tasks/NEXT.md`.


## Latest exact-commit verification — restoration branch head

Verified source revision: `341344b8f29be93f8f979056ed33b55c7bb9a1c6`.

- [Full DopeFarm CI, run 38405281308](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38405281308): **SUCCESS** on the exact SHA.
- [Master Pack Validation, run 38405263958](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38405263958): **SUCCESS** on the same SHA.
- Every configured job step completed successfully: locked install, source lint, format, strict TypeScript, unit tests, production build, browser E2E, preview smoke, master-pack validation, original source snapshot verification, product-policy validation and whitespace.
- The branch head is green for the configured engineering gates. This does not mean all release blockers are resolved or authorize a merge.
- Open blockers remain exactly as recorded in `.tasks/NEXT.md`: evidenced legacy-save schema, authoritative incident/corrective-action contract, approved fictional economy/progression table, final licensed art/audio, and security/privacy/rights/release-operation evidence.
- `main` remains unchanged at `2b2dd96ed1739f4395ff02ac6a9cd399e940be94`.
