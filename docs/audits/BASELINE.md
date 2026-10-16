# Repository Truth Audit — 2026-10-12

## Scope and evidence

This is a read-only baseline report prepared from GitHub repository metadata and the supplied Master Pack archive. No local clone of the GitHub repository was available in this execution environment, so local shell commands such as `git status`, package installation, typecheck, tests, and build were **not run against the target checkout**. No result below should be interpreted as a green build.

- Repository: `MarsCommanderM/herbal-line-production-`
- Default branch: `main`
- Observed `main` HEAD: `5b49d50ee34609d95bb97b763e0b0886c2cad64d`
- Observed `main` tree: 58 tracked files
- Master Pack: `Herbal-Line-Production-Master-Pack.zip`
- Master Pack SHA-256: `4e783542951f573ed7412444e9e2ed00c490a9b7919f67c30399b86297a4b8972`
- Master Pack file count: 42
- Existing open PR at audit time: [#1](https://github.com/MarsCommanderM/herbal-line-production-/pull/1), head `e5f19e968b7b60c3c93e9052c4cb13921c81571e), state open, not merged.
- Existing branch at audit time: `ci/verify-engineering-baseline` at `e5f19e968b7b60c3c93e9052c4cb13921c81571e`.

## Observed drift

The current `main` tree contains 16 paths not present in the supplied archive, including:

- `.github/workflows/app-ci.yml`
- `.github/workflows/validate-masterpack.yml`
- `docs/audits/BASELINE.md`
- `docs/audits/CONTRACT_RECONCILIATION.md`
- `index.html`
- `package.json`
- `package-lock.json`
- `src/**`
- `tsconfig.json`
- `vite.config.ts`
- `vitest.config.ts`

The application shell and CI additions were not verified by a clean target checkout in this audit. The repository's current tree is therefore not a byte-for-byte mirror of the supplied Master Pack.

A separate working branch, `production/herbal-line-baseline-20261012`, was created from the historical 42-file pack-shaped snapshot `c558ab073cd09ed58232d0c2453020ddd92e48b4`, rather than writing directly to `main`. That snapshot has the same set of 42 paths as the archive, but the contents of some files differ from the archive; it is a recovery baseline, **not yet a verified 1:1 synchronization**. Exact content parity remains a blocking item and must be checked file-by-file against the archive before claiming sync completion.

## Verification status

| Check | Result | Evidence |
|---|---|---|
| GitHub default branch and HEAD | Observed | GitHub repository API |
| Full recursive `main` tree | Observed | GitHub Git Trees API; 58 blobs, not truncated |
| Master Pack SHA-256 | Passed | Local `sha256sum` |
| Master Pack archive integrity | Passed | Local `unzip -l` parsed 49 archive entries, 42 files |
| Master Pack validator | Not yet recorded here | Must run from the extracted archive and record its exit code |
| Local Git status / working tree | Not run | No target checkout available locally |
| Dependency installation | Not run | No target checkout install executed |
| Typecheck / tests / build / browser E2E | Not run | No execution evidence |
| CI result for existing PR | Unverified | No successful workflow result was confirmed during this audit |

## Risks and next actions

1. Restore and verify exact archive-to-branch file content parity; do not label the current recovery branch as synchronized until every path and blob is compared.
2. Preserve `main` and the existing PR branch while recovery work proceeds.
3. Reconcile contracts only against the supplied canonical documents; do not rewrite the product scope.
4. Establish the pinned package manager, lockfile, typecheck, lint, unit tests, production build, and CI from a clean checkout.
5. Begin the first complete end-to-end game loop only after the engineering baseline has actual test evidence.
6. Keep the product's medical-cannabis context intact; gameplay values must remain fictional abstractions and must not become real-world production instructions.

## Audit conclusion

**Baseline status: PARTIAL / NOT GREEN.** Repository metadata and drift are documented. Exact archive synchronization, build/test verification, and implementation acceptance remain open.


## Post-implementation verification — 2026-10-12

The first verified application baseline was merged to `main` via PR [#4](https://github.com/MarsCommanderM/herbal-line-production-/pull/4).

- Current main commit: `5b5f770f90956660c3860467ee02f4bbcf31ebd0`
- Application CI: **PASS** — [run 38181538851](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38181538851)
- Master Pack validation workflow: **PASS** — [run 38181538905](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38181538905)
- Verified gates: `npm ci`, source lint, format check, strict TypeScript typecheck, unit tests, production build, master-pack validation, and `git diff --check`.
- The historical implementation at that revision contained a generic-botanical operations loop. That was an unapproved scope drift, not the accepted product definition; this historical note must not be used to justify generic plants or a generic product identity in current builds.

### Remaining blockers

- Exact byte-for-byte parity with the supplied 42-file Master Pack remains unverified.
- Versioned save codec, checksum verification, IndexedDB repository and manual save/load controls are implemented. Real-browser IndexedDB verification, a forward migration chain and quota/interrupted-write recovery remain open.
- Browser E2E, accessibility automation, and cross-browser verification have not been run.
- Asset provenance/licensing review and release-candidate acceptance remain open.

**Updated baseline status: ENGINEERING FOUNDATION GREEN; PRODUCT NOT RELEASE-READY.**


## Persistence milestone — 2026-10-12

The initial save/load implementation was merged via [PR #5](https://github.com/MarsCommanderM/herbal-line-production-/pull/5).

- Current main commit: `2f1d21587d4b7802d4bfa021b30fc22ddfbbf479`
- Application CI: **PASS** — [run 38181929805](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38181929805)
- Master Pack validation workflow: **PASS** — [run 38181929917](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38181929917)
- Added: stable JSON serialization, SHA-256 save checksums, envelope validation, IndexedDB save/load/list/delete/export/import, transient UI reconstruction, manual save/load controls, and tests for checksum corruption and repository lifecycle.

**Remaining persistence acceptance:** real-browser IndexedDB round-trip, schema migration beyond v1, quota exhaustion, interrupted transaction recovery, and browser E2E.


## Current owner-approved production directive — 2026-10-12

The current game title is **Dr. Green Dump / DopeFarm**. It is a high-quality web management game about the legal and controlled operation of a strictly regulated medical-cannabis plant production facility. Recognizable cannabis plants and directly visible care actions are required: fictional in-game watering, lighting, climate/humidity control, nutrient care, pruning and cutting placement. All numeric values and effects are invented balance data, not real-world cultivation instructions. The game ends its customer workflow at recorded delivery to pharmacies; internal pharmacy operations are out of scope. This owner directive supersedes prior generic-botanical descriptions in historical baseline notes.


## Reproducible verification refresh — 2026-10-13

The former statements that no clean build or browser E2E had been run are historical and superseded for the current restoration branch. On commit 22e60941981bc168c020ae55213b7eab61a486aa, the complete application CI passed, including npm ci, source lint, format check, strict TypeScript typecheck, domain unit tests, production build, Chromium/Firefox/WebKit browser E2E, production preview smoke, master-pack validation, product-policy validation and whitespace checks:
https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38324074349

The separate Master Pack validation workflow also passed on the same commit:
https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38324074372

The exact active-root comparison at that commit is 20/42 original blob matches, 22/42 classified differences, and 53 application-specific additional paths. The original 42 file blobs are being preserved under masterpack/source/ and verified against docs/audits/MASTERPACK_EXPECTED_BLOBS.json by a dedicated CI gate. The active project root remains intentionally distinct from the historical archive. The ZIP SHA-256 above is recorded provenance; the archive binary is not currently in the repository, so this refresh does not independently recompute the ZIP container hash.

The current branch incorporates the latest main commit as a merge parent; main itself remains unchanged. The final source-snapshot commit still requires its own complete CI run before its status can be reported green.
