# DopeFarm / Dr. Green Dump — Acceptance Evidence Ledger

**Evidence baseline:** `6d674e5d860993c6653c0703a5a9712e75b4fa5f`  
**Branch:** `restore/original-masterpack-product-scope-20261012`  
**Pull request:** [#26](https://github.com/MarsCommanderM/herbal-line-production-/pull/26) — open, unmerged  
**Base `main`:** `2b2dd96ed1739f4395ff02ac6a9cd399e940be94`

This ledger distinguishes successful checks from skipped tests and external release approvals. A result applies only to the exact commit named in its evidence.

## Exact-SHA engineering verification

| Gate | Result on `6d674e5d860993c6653c0703a5a9712e75b4fa5f` | Evidence / qualification |
|---|---|---|
| Full App CI | PASS | [Run #717](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38522655908) |
| Master Pack validation | PASS | [Run #272](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38522655944) |
| Dependency audit | PASS | `npm audit` passed in App CI; this is not a full legal review |
| Secret-pattern scan | PASS | Full reachable Git history scanned in App CI |
| SBOM/license metadata | PASS | CycloneDX inventory compared to the committed deterministic inventory |
| Unit tests / build / lint / typecheck / format | PASS | All corresponding steps passed in App CI |
| Browser E2E | PARTIAL | 71 passed, 4 skipped; skips are not passes |
| Production preview smoke | PASS | App CI post-build smoke step passed |
| Master Pack source snapshot | PASS | Source-snapshot verifier passed; it verifies recorded Git blob IDs, not a re-hash of the unavailable original ZIP container |
| Product policy / visible-care contract | PASS | App CI validation passed on the exact SHA |
| Whitespace | PASS | `git diff --check` passed |

## Renderer-dependent tests — explicitly open

The four skipped Firefox scenarios were:

1. Third-person avatar movement and camera target follow.
2. Direct selection of a nearby cannabis plant from the third-person world.
3. Visible plant-care actions persisting through autosave and reload.
4. Importing an older save removes stale propagated plant and cutting visuals.

The tests skip when the Firefox context exposes no WebGL canvas. Chromium/SwiftShader and WebKit passed the relevant scenarios on the baseline, but this does not establish three-engine parity. The next CI revision attempts to enable Firefox software WebGL; acceptance depends on its actual test results, not on configuration alone.

## Release and product gates

| Gate | Status | Required evidence |
|---|---|---|
| Original final art, animation and audio | OPEN | Final asset package, source/author provenance, hashes and visual/performance acceptance |
| Asset and contributor rights | OPEN | Asset-by-asset license/contract evidence and contributor-rights review |
| Dependency license clearance | OPEN | Human compatibility/notice review and required license texts; SPDX metadata alone is insufficient |
| Privacy and security release sign-off | OPEN | Documented data-flow/security review, findings and responsible approval |
| Trademark / working-title review | OPEN | Documented review of title and shipped marks |
| Economy and progression | BLOCKED | Owner-approved fictional prices, effects, prerequisites, XP thresholds and unlock rules; no values may be invented |
| Compliance risk balance | BLOCKED | Authoritative fictional rule for numerical risk changes; no values may be invented |
| Release artifact identity | IN PROGRESS | CI-uploaded production build plus SHA-256 manifest, verified on the new exact SHA |
| Rollback | OPEN | Runbook plus a witnessed rollback drill in a real deployment/test environment |
| Release authorization | NOT GRANTED | All mandatory technical and external gates must close first |

## Next exact-HEAD verification

The baseline above passed its configured workflow. The next commit introduces (a) E2E diagnostic artifact retention, (b) a hash-manifested production build artifact, and (c) Firefox software-WebGL preferences. These are pending until App CI and Master Pack Validation both succeed on that next SHA. If Firefox still skips any renderer-dependent tests, they remain open and must be reported as such.

## Operating constraints

- Keep `main` unchanged; do not merge PR #26 while required gates remain open.
- All process/balance values are fictional game values, not real-world production parameters.
- Do not mark skipped, failed, cancelled, unrun, or externally unapproved items as complete.
- No paid asset generation or unknown-license asset import without the required separate authorization.
