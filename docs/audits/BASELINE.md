# P0-001 — Repository Truth Audit

**Audit date:** 2026-10-11  
**Repository:** https://github.com/MarsCommanderM/herbal-line-production-  
**Branch audited:** `main`  
**HEAD at audit start:** `f8fae19bd6d23d08174aa1fb136022d82e68c4ce`  
**Method:** GitHub repository/file/commit connector checks plus local validation of the available master-pack directory and ZIP.  
**Important limitation:** The target repository was not cloned into an executable checkout in this environment. No Git command, npm install, TypeScript compile, browser build, game test, or target-repository CI run has been executed here. Those outcomes are **not tested**, not passed.

## 1. Repository identity and access

| Check | Observed result | Evidence |
|---|---|---|
| Repository exists | Yes | GitHub `get_repo` response |
| Full name | `MarsCommanderM/herbal-line-production-` | Repository metadata |
| Default branch | `main` | Repository metadata |
| Visibility | Public | Repository metadata |
| Write permission | Admin/maintain/push present for linked GitHub identity | Repository metadata |
| Latest observed commit at audit start | `f8fae19bd6d23d08174aa1fb136022d82e68c4ce` | [Commit](https://github.com/MarsCommanderM/herbal-line-production-/commit/f8fae19bd6d23d08174aa1fb136022d82e68c4ce) |
| Metadata `size` | Reported as `0`, inconsistent with successful reads of files and commit history | Treat this metadata field as unreliable; do not infer an empty repository from it |

## 2. Remote path checks

Successfully fetched from `main`: `README.md`, `AGENTS.md`, `PROJECT_MANIFEST.json`, `.tasks/NEXT.md`, the four TypeScript contract files, the five JSON schemas, `scripts/validate_masterpack.py`, the rights register, and all numbered documents `docs/00_...` through `docs/19_...`.

The following exact paths returned GitHub API 404 at audit time:

- `package.json`
- `package-lock.json`
- `pnpm-lock.yaml`
- `yarn.lock`
- `tsconfig.json`
- `index.html`
- `src/main.ts`
- `vitest.config.ts`
- `.github/workflows/ci.yml`
- `.github/workflows/validate-masterpack.yml`

These are path-level observations, not a claim that every possible alternate implementation path was enumerated. A repository-wide tree/working-tree status cannot be truthfully reported without a checkout/tree listing.

## 3. Local master-pack checks actually executed

Working directory: `/mnt/data/Herbal-Line-Production-Master-Pack`

Commands executed:

```bash
git status --short --branch
```

Observed result: exit failure, `fatal: not a git repository`. This is an extracted package directory, not a Git checkout; no changes were made to it by this command.

```bash
python scripts/validate_masterpack.py
```

Observed result before this audit's validator extension:

```text
MASTER PACK VALIDATION: PASS (20 required files checked)
Scope: package completeness and basic metadata only; does not validate the future game implementation.
```

```bash
unzip -t /mnt/data/Herbal-Line-Production-Master-Pack.zip
```

Observed result: `No errors detected in compressed data`.

**Scope of those passes:** package completeness/metadata and ZIP archive integrity only. They do not establish that a web application builds or that any game feature works.

## 4. Confirmed gaps / risk classification

| ID | Gap | Severity | Required action |
|---|---|---|---|
| AUD-001 | No observed package manifest or dependency lockfile | P0 | Establish toolchain and pinned dependency graph before runtime implementation |
| AUD-002 | No observed app entry point, HTML shell or TypeScript config | P0 | Add a minimal real app shell after contract reconciliation |
| AUD-003 | No observed CI workflow | P0 | Add an honest master-pack validation workflow now; add build/test gates after executable scaffold exists |
| AUD-004 | Contracts/schemas/docs exist but are not proven consistent by TypeScript/schema test suites | P0 | Reconcile canonical domain and persistence contracts; add automated contract checks |
| AUD-005 | No target-repository build/test execution evidence | P0 | Run CI on a target-repository commit and record the run/commit link |
| AUD-006 | Rights register contains pending entries; title is not cleared | Release blocker | Keep final public/commercial release blocked until documented review |

## 5. Safe next actions

1. Keep all existing documentation and contracts; no deletion/reset was performed.
2. Make the package validator check every JSON schema parses and check canonical required paths.
3. Add GitHub Actions for package validation and whitespace checks. Do not call these a game build.
4. Update the task queue with this audit and proceed to P0-002 contract reconciliation.
5. Add the executable app scaffold only after the first contracts are reconciled, with pinned dependencies and a committed lockfile before claiming reproducibility.

## 6. Audit disposition

**P0-001: PARTIAL / evidence-based audit completed within available connector scope.** Repository identity, head, key paths, absent baseline files, local package validation and ZIP integrity were observed. Full checkout status, dependency installation, application build and game tests remain unexecuted because this environment did not expose an executable clone of the target repository.

This limitation must not be rewritten as a successful build/test result.
