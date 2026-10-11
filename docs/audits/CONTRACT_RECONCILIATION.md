# P0-002 — Contract Reconciliation

**Date:** 2026-10-11  
**Scope:** Existing TypeScript contracts, save schema and linked architecture/state-machine docs.  
**Disposition:** Contract definitions reconciled at source level; full typecheck and runtime tests remain pending until P0-003 establishes the locked TypeScript toolchain.

## Conflicts found and canonical decisions

| ID | Prior conflict | Canonical decision | Changed artifact |
|---|---|---|---|
| CTR-001 | Runtime state held both `GameState.moneyCents` and economy ledger/balance summaries | Ledger is the financial source of truth. Opening balance plus signed-by-account ledger postings determine current balance; revenue/cost totals are derived selectors. Remove parallel mutable money/totals fields. | `contracts/domain.ts` |
| CTR-002 | Save payload included UI selection/notifications even though docs treated UI as transient | `SaveEnvelopeV1.payload` is `Omit<GameState, 'ui'>`. Load reconstructs UI defaults; domain state and RNG remain persisted. | `contracts/persistence.ts`, `schemas/save-envelope-v1.schema.json` |
| CTR-003 | QC assessment/event duplicated the same result as both `passed:boolean` and `decision` | `decision: 'pass' | 'fail' | 'review'` is canonical; event and assessment share it. | `contracts/domain.ts`, `contracts/events.ts` |
| CTR-004 | Inventory lot had both `quantityReserved` and a `reserved` status, creating ambiguous partial reservation semantics | Reservation is represented by quantity; status is disposition only. A partially reserved lot can remain `released`. | `contracts/domain.ts` |
| CTR-005 | State-machine documentation referenced `recovery_review` while type union could not represent it | Add `recovery_review` to `LicenseStatus`; critical operations stay blocked until explicit review outcome. | `contracts/domain.ts`, state-machine docs |
| CTR-006 | One command union mixed domain state transitions with UI navigation and persistence requests | Split into `DomainCommand`, `UICommand`, and `PersistenceCommand`, with `GameCommand` as the application-level union. Dispatch boundaries must remain explicit. | `contracts/commands.ts` |
| CTR-007 | Save schema required `moneyCents` and `ui`, contrary to canonical persisted projection | Remove both from required save payload. The schema remains structural/basic and must be strengthened alongside implementation and contract tests. | `schemas/save-envelope-v1.schema.json` |

## Files updated

- `contracts/domain.ts`
- `contracts/commands.ts`
- `contracts/events.ts`
- `contracts/persistence.ts`
- `schemas/save-envelope-v1.schema.json`
- `docs/04_DOMAIN_MODEL_AND_STATE_MACHINES.md`
- `docs/05_TECH_ARCHITECTURE.md`
- `docs/06_CANONICAL_CONTRACTS.md`

## Verification state

- JSON parse of the save schema: to be checked after commit through the master-pack validator/CI.
- TypeScript strict typecheck: **not run**; no package manifest, TypeScript config, dependency lockfile, or compiler currently exists in the target repository.
- Domain transition/property tests: **not run**; there is no executable domain implementation or test runner yet.
- This reconciliation is accepted as a documented source-level decision, not a claim of compiled correctness. P0-003 must compile these exact contracts and add tests before implementation work is treated as verified.
