# Master-Pack Restoration Progress — 2026-10-12

## Scope authority

The supplied `Herbal-Line-Production-Master-Pack.zip` was inspected directly.

- SHA-256: `4e783542951f573ed7412444e9e2ed00c490a9b7919f67c30399b86297a4b8972`
- ZIP integrity check: passed (`ZipFile.testzip()` returned no damaged member).
- Archive members: 49 total entries, including directories; 42 files.
- Canonical product statement in `PROJECT_MANIFEST.json`: a high-quality browser management game about a strictly regulated medical-cannabis plant production operation.
- Canonical phase plan: phases 0–19; the backlog explicitly includes economy/progression, final visual quality, QA/security/rights, release and post-launch operations.

The generic botanical rescope in the previous repository documentation was not owner-approved. This restoration branch is the work area; `main` has not been modified by the restoration edits recorded here.

## Exact archive checks completed

The archive's expected Git blob SHA-1s were calculated from the actual file bytes using Git's `blob <byte-length>\0<bytes>` definition.

| Path | Expected archive blob | Branch result |
|---|---|---|
| `.editorconfig` | `192c070cf03df5d7af0521a1073c0919cb46f742` | Exact match verified |
| `.gitignore` | `a0907890dae45d04d5a0af32fdbc01c6d0440cff` | Exact match verified |
| `.tasks/NEXT.md` | `816d1ffa7f4ee7a697aa8da7499870091fd86b71` | Exact match restored |
| `.tasks/BACKLOG.md` | `e002ab4884f12242916b15c193792b93e1e39cb0` | Exact match restored |
| `AGENTS.md` | `a20ef5de0f140885cd4838be62e667f0a5ebc126` | Scope wording restored, but blob hash does not match; exact parity remains open |

The current parity report preserves the earlier `4/42` comparison as historical evidence for `main@6ddb8849886f35ece5f3d784d06714b4054f5116` only. It is not being represented as a fresh comparison of this restoration branch.

## Current verified limitations

- The full 42-path comparison has **not** yet been rerun against the latest restoration-branch commit.
- Canonical restoration of all 42 archive files is **not complete**.
- The application HTML title/description, package description, and initial campaign's source/customer labels have been corrected toward the original medical-cannabis identity. These are implementation edits, not archive files.
- The current application implementation has not yet been reconciled end-to-end against the restored canonical docs.
- The latest queried GitHub combined-status endpoint returned no status entries for the restoration commit queried. This is not evidence that CI passed.
- No local clean checkout of the current GitHub branch was available in the container. The local repository ZIP is a separate snapshot and is not treated as the current GitHub checkout. Its dependency install, typecheck, tests and build were not run.

## Required next sequence

1. Restore every remaining canonical archive file byte-for-byte on this branch, verifying each resulting Git blob SHA against the archive manifest.
2. Run the parity verifier against the exact resulting commit and retain per-path output; do not call parity complete before this is reproduced.
3. Audit the current GitHub source tree and reconcile product identity, domain contracts, economy/progression, cannabis-specific world/content, UI and persistence against the canonical pack.
4. Implement only changes supported by canonical requirements and existing compatible code; do not invent upgrade costs/effects or progression rules.
5. Run fresh clean-install, lint/format, typecheck, unit, integration/E2E, production build and targeted regression gates. Record exact commit, commands, exit statuses and results.
6. Keep `main` untouched until the restoration diff and required gates have been reviewed.
