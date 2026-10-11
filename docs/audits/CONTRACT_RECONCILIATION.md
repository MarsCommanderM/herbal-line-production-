# Contract Reconciliation — 2026-10-12

## Authority and scope

The supplied Herbal Line Master Pack remains the product and contract reference. The implementation uses fictional, abstract game values only; it does not provide real-world cultivation, processing, medicine manufacturing or distribution instructions.

## Decisions recorded

| Contract | Conflict | Resolution |
|---|---|---|
| Compliance state | Domain status union omitted `recovery_review`. | Added `recovery_review` to the compliance state union. |
| Quality assessment | `passed: boolean` duplicated `decision: pass/fail/review`. | Use the decision union as the canonical assessment outcome. |
| Inventory reservation | Quantity reservation and a `reserved` disposition duplicated state. | Reservation is represented by reserved quantity; lot disposition remains independent. |
| Economy | Parallel balance and summary totals duplicated the ledger. | Finance selectors derive balances and totals from opening balance plus ledger. |
| Persistence | UI state was mixed into the save payload. | Persisted payload omits transient UI; UI is reconstructed on restore. |
| Commands | Domain, UI and persistence commands shared one undifferentiated union. | Separate command categories and retain a composed public union. |
| QC rejection | QC review/fail had no terminal path in the initial UI vertical slice. | Added `BATCH/REJECT`; terminal batches cannot be released; room/machine occupancy is released; order acceptance is gated on released inventory. |

## Verification evidence

Current verified code revision: `24a0f650d9a118fa32e13a2d0abe36229f0f0036`.

[GitHub Actions run 38182607944](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38182607944) passed all gates on that revision:

- Locked dependency install.
- Source policy lint (11 TypeScript files) and format check (28 source/config files).
- Strict TypeScript typecheck.
- 27 unit tests across 5 files.
- Production build.
- 4 Chromium E2E tests, including autosave/reload, corrupt-primary backup recovery, export/import round-trip and QC rejection.
- Production preview smoke.
- Master-pack validator and `git diff --check`.

## Persistence behavior implemented

- Canonical JSON serialization and SHA-256 integrity check.
- Version-1 save envelope with UI excluded.
- IndexedDB repository validates envelopes before persistence and restore.
- Manual save/load plus autosave after successful domain commands.
- Last-known-good backup before replacing a valid primary save.
- Fallback to backup if the primary save fails validation.
- JSON export and validated import.

## Master Pack parity — measured, not assumed

- Archive: `Herbal-Line-Production-Master-Pack.zip`
- SHA-256: `4e783542951f573ed7412444e9e2ed00c490a9b7919f67c30399b86297a4b8972`
- Expected files: 42.
- At revision `24a0f650d9a118fa32e13a2d0abe36229f0f0036`: 42/42 paths present, 4/42 exact Git blob matches, 38/42 content mismatches, 33 extra implementation/tooling paths.
- Expected blob hashes are recorded in `docs/audits/MASTERPACK_EXPECTED_BLOBS.json`; `python scripts/verify_masterpack_parity.py` prints every mismatch and exits non-zero until exact parity is achieved.

This means the implementation branch is **not** a 1:1 mirror of the ZIP. The next P0 task is to establish a dedicated exact-pack baseline, then reapply only reviewed implementation deltas in separate commits.

## Remaining release blockers

1. Exact Master Pack synchronization.
2. Explicit migration chain beyond v1, quota exhaustion and interrupted-write recovery tests.
3. Cross-browser E2E beyond Chromium.
4. Broader negative-path coverage, dashboard UX/accessibility, final licensed assets, visual/performance QA, security review and release acceptance.

No release-ready claim is made.
