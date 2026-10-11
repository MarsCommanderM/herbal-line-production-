# Contract Reconciliation — 2026-10-12

## Authority

The source of truth is the supplied Herbal Line Master Pack: `AGENTS.md`, `PROJECT_MANIFEST.json`, `docs/00_MASTER_PRODUCTION_DOCUMENT.md`, `docs/04_DOMAIN_MODEL_AND_STATE_MACHINES.md`, `docs/05_TECH_ARCHITECTURE.md`, `docs/06_CANONICAL_CONTRACTS.md`, `contracts/*.ts`, and `schemas/*.schema.json`. The implementation branch uses the safe generic botanical-operations scope: fictional plants, abstract QC/inventory/compliance, and generic customer orders. No real-world production or controlled-substance distribution guidance is implemented.

## Conflicts found and reconciled on this branch

| Contract | Conflict | Resolution |
|---|---|---|
| Compliance state | The domain union omitted `recovery_review`, while the canonical state machine explicitly requires it. | Added `recovery_review` to `LicenseStatus`. |
| Quality assessment | `QualityAssessment` stored both `passed: boolean` and `decision: pass/fail/review`; the event contract stored only `passed`. These can disagree. | The assessment and `quality.assessed` event use the single canonical decision union. |
| Inventory reservation | `quantityReserved` and a `reserved` disposition could encode overlapping state; the pure reservation function preserves lot disposition. | Removed `reserved` from the lot disposition union; reservation remains quantity-based and atomic. |
| Economy | `GameState.moneyCents` duplicated a balance derivable from `EconomyState.openingBalanceCents + ledger`; mutable daily/lifetime summary totals duplicated ledger-derived data. | Removed the parallel balance and summary fields. Finance selectors derive balance and totals from the ledger. |
| Persistence | The save payload included transient UI state, contrary to the canonical distinction between game state and UI state. | Save payload type is `Omit<GameState, 'ui'>`; the v1 JSON schema no longer requires `ui` or `moneyCents`. |
| Commands | One union mixed domain mutations, UI navigation/selection, and persistence requests. | Split into `DomainCommand`, `UICommand`, and `PersistenceCommand`, with `GameCommand` as the aggregate union. |

## Validation evidence

- The supplied archive validator ran locally and passed: 20 required paths checked, exit status 0.
- All 6 JSON files in the archive parsed successfully, exit status 0.
- ZIP integrity check passed with no archive errors.
- GitHub Actions initially executed typecheck on the recovery branch and found two defects in the carried-over app foundation: branded money arithmetic inferred an overly narrow type, and a Three.js geometry spread failed strict TypeScript. Both were corrected in commits on this branch.
- A subsequent CI run is required to establish whether typecheck, source lint, format check, tests, build, and master-pack validation pass together. No all-green claim is made yet.

## Remaining blockers

1. Exact byte-for-byte synchronization with the supplied archive is still not verified. The historical 42-path snapshot used as the recovery base has content differences in some files; this must be reconciled before calling the repository a 1:1 copy.
2. Save/load storage, migration, and recovery are not implemented.
3. The full intake → fictional production stages → QA → inventory → pharmacy order → dispatch loop is not implemented.
4. CI must pass on the current head before P0-003 can be accepted.
