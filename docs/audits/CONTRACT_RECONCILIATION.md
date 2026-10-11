# Contract Reconciliation — 2026-10-12

## Authority

The supplied Herbal Line Master Pack is the reference for product requirements, domain concepts, schemas and production gates. The implementation branch currently keeps the playable simulation fictional and generic: abstract botanical units, QC/inventory/compliance states and generic customer orders. No real-world controlled-substance production or distribution instructions are implemented.

## Decisions recorded

| Contract | Conflict | Resolution |
|---|---|---|
| Compliance state | Domain status union omitted `recovery_review`. | Added `recovery_review` to the compliance state union. |
| Quality assessment | `passed: boolean` duplicated `decision: pass/fail/review`. | Use the decision union as the canonical assessment outcome. |
| Inventory reservation | Quantity reservation and a `reserved` disposition duplicated state. | Reservation is represented by reserved quantity; lot disposition remains independent. |
| Economy | Parallel balance and summary totals duplicated the ledger. | Finance selectors derive balances and totals from opening balance plus ledger. |
| Persistence | UI state was mixed into the save payload. | Persisted payload omits transient UI; UI is reconstructed on restore. |
| Commands | Domain, UI and persistence commands shared one undifferentiated union. | Separate command categories and retain a composed public union. |

## Verified implementation and test evidence

Latest verified revision: `bce2a0bd0edda036032be03e8dfea3033057ea52`.

[GitHub Actions run 38182289439](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38182289439) passed all steps on that exact commit:

- `npm ci --no-audit --no-fund`
- Source policy lint: 11 TypeScript files checked
- Format check: 28 source/config files checked
- Strict TypeScript typecheck
- Unit tests: 26 passed across 5 test files
- Production build
- Chromium E2E: 3 passed
- Production preview smoke: HTML, JS bundle, save controls and CSS served successfully
- Master-pack validation: 39 required paths and 6 JSON documents checked
- `git diff --check`

## Persistence behavior now implemented

- Canonical JSON serialization and SHA-256 integrity check.
- Version-1 save envelope with UI excluded.
- IndexedDB save repository with validation before writes and reads.
- Manual save/load plus autosave after successful domain commands.
- Last-known-good backup written before replacing a valid primary save.
- Fallback to backup if the primary save fails validation.
- JSON export and validated import.
- Browser E2E coverage for reload persistence, corrupt-primary recovery and export/import round-trip.

## Remaining blockers

1. **Exact Master Pack parity remains unverified.** The ZIP SHA-256 is `4e783542951f573ed7412444e9e2ed00c490a9b7919f67c30399b86297a4b8972`; it contains 42 files. The historical pack-shaped recovery snapshot had 42 matching paths but 36 blob-content mismatches. The current implementation branch must not be called a 1:1 mirror until a reproducible per-path comparison proves it.
2. Save schema migration beyond v1, quota exhaustion, and interrupted-write recovery need explicit tests before release acceptance.
3. Chromium is the only automated browser target so far.
4. Full game-loop UX, comprehensive accessibility, final licensed assets, visual/performance QA, security review and release acceptance remain open.

## Decision rule

Do not rewrite canonical documents to fit the current implementation silently. Record any intentional deviation, explain why it is needed, add a migration or compatibility plan where applicable, and verify the resulting contract and implementation on the same commit.
