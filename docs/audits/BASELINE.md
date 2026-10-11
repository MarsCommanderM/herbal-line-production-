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
- Existing open PR at audit time: [#1](https://github.com/MarsCommanderM/herbal-line-production-/pull/1), head `e5f19e968b7b60c3c93e9052c4cb13921c81571e`, state open, not merged.
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

A separate working branch, `production/herbal-line-baseline-20261012`, was created from the historical 42-file pack-shaped snapshot `c558ab073cd09ed58232d0c2453020ddd92e48b4`, rather than writing directly to `main`. That snapshot has the same set of 42 paths as the archive, but a blob-hash comparison found **36 of the 42 file blobs differ** from the supplied archive; it is a recovery baseline, **not a verified 1:1 synchronization**. Exact content parity remains a blocking item and must be checked file-by-file against the archive before claiming sync completion.

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


## Integration branch status

- Clean integration branch: `production/herbal-line-clean-baseline-20261012`.
- Initial integration tree commit: `bbac611ddd3588112f2001b817a20bfc720ae2d5`, based directly on the observed `main` head.
- CI-verified integration code commit: `9ae1426a23ca3cf3b453e4991a3c40b3794f5eee`; [run 38181308979](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38181308979) passed all configured checks.
- It restores the 42 paths from the historical pack-shaped snapshot, carries the reconciled contracts and the application foundation, and removes the unneeded `validate-masterpack.yml` workflow.
- It does **not** restore the archive's exact file contents. Exact 1:1 synchronization remains blocking. The original `main` branch was not changed by this work.
