# Contract Reconciliation — 2026-10-12

## Authority

The supplied Herbal Line Master Pack is the binding reference for product requirements, domain concepts, schemas and production gates. The agreed product is a fictional, strictly regulated medical-cannabis production management simulation. Current implementation details must be reconciled against the canonical archive; a generic botanical rescope is not an approved product decision. The simulation remains fictional and must not provide real-world controlled-substance production or distribution instructions.

## Canonical contract facts restored from the archive

The canonical `contracts/*.ts` files now match the original archive's Git blob hashes exactly. They are not the same as the previously modified implementation contracts.

- `LicenseStatus` is `valid | warning | suspended`; `recovery_review` is not a canonical license status.
- `QualityAssessment` requires both `passed: boolean` and `decision: pass | fail | review`.
- `GameState` does not declare a top-level `qualityAssessments` array.
- `EconomyState` includes revenue/expense summaries as fields in addition to the ledger.
- Canonical ledger accounts are `revenue | expense | penalty | investment | refund`; `grant` is not included.
- The canonical public command type is `GameCommand`, not `DomainCommand`.
- Canonical events do not include several event strings currently emitted by the implementation, including `upgrade.purchased`, `time.day_ended`, and several facility/machine events.
- The canonical save payload is `GameState`, including its `ui` field.

These facts are source-contract evidence, not a statement that the implementation has already been reconciled.

## Current CI evidence after canonical contract restoration

The GitHub Actions run on the restoration branch, [Herbal Line CI run 38290153329](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38290153329), **failed at strict TypeScript typecheck**. Domain tests, production build and browser E2E were skipped because typecheck failed.

Reported error groups include:

- missing canonical `EconomyState` summary fields in initial state and finance fixtures;
- unsupported `grant` ledger account;
- implementation-only `recovery_review` status;
- references to undeclared `GameState.qualityAssessments`;
- import of missing `DomainCommand`;
- implementation-only event types;
- missing `QualityAssessment.passed`;
- mismatch between `InventoryLotState` and the implementation's `InventoryReservation` shape;
- save codec payload missing canonical `ui`.

The separate [Master Pack Validation run 38290153248](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38290153248) passed. That workflow validates required pack files/basic metadata; it does not establish that the game typechecks or builds.

A previous green CI run on revision `bce2a0bd0edda036032be03e8dfea3033057ea52` is historical and predates restoration of the exact canonical contracts. It must not be used as evidence that the current restoration branch passes.
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


## Product-scope correction and restoration authority

The original `Herbal-Line-Production-Master-Pack.zip` is the binding source of truth, not merely historical input. Herbal Line is the originally agreed fictional, strictly regulated medical-cannabis production management simulation. The generic botanical/herbal rescoping documented in earlier repository versions was not owner-approved and is not accepted as a valid product decision.

Restore the canonical Master-Pack documents exactly from the ZIP on the dedicated restoration branch, verify every path/content hash, and retain reproducible evidence. Then reconcile code, domain contracts, economy/progression, UI and content against the canonical documents without discarding compatible implementation work. Keep `main` untouched until the reviewed restoration and mandatory checks pass. Do not claim 1:1 parity until the current branch has passed the per-path comparison.

The implementation has also closed the QC review/failure dead end with a terminal `BATCH/REJECT` command. It requires a documented reason, releases room occupancy, clears any active machine assignment, removes the batch from the active queue, and prevents later release. The management UI exposes this action only when a stored QC decision is `fail` or `review`; domain guards remain authoritative.
