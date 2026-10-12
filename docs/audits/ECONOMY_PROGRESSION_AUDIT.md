# Dr. Green Dump / DopeFarm — Economy and Progression Contract Audit — 2026-10-12

## Authority inspected

- Original archive: `Herbal-Line-Production-Master-Pack.zip`, SHA-256 `4e783542951f573ed7412444e9e2ed00c490a9b7919f67c30399b86297a4b8972`.
- Canonical `docs/07_DATA_AND_RULES_CATALOG.md`: exact archive blob `35b2f9611f47489cea1c2c50e3dab1c4d2e36ddb`.
- Original runtime-source contracts are preserved under `masterpack/canonical/contracts/`. Active contracts intentionally include runtime extensions for saved quality assessments, compliance recovery and visible plant care; those extensions must remain explicit and tested.

## Findings

### HL-019 / Economy, ledger, rooms, staff and upgrades

**Canonical evidence**
- The data catalog names two upgrade IDs: `sensor_pack_1` and `drying_rack_1`.
- It says they are fictional in-game improvements and prohibits real-world cultivation, processing or extraction instructions.
- The pack does **not** specify purchase prices, exact effects, prerequisite order, or unlock thresholds for those two upgrades.
- The canonical command contract includes `UPGRADE/PURCHASE`; the canonical state contract models `UpgradeState` as `id`, `unlocked`, and `purchasedAt`.
- The canonical economy rules require cent-based accounting, one idempotent ledger entry per booking, sufficient-funds checks, revenue only on successful delivery, and ledger-derived totals.

**Previous implementation finding and current disposition**
- The previous implementation had `energy-efficiency-1/2`, prices of 250,000/150,000 cents, 20%/10% cost reductions and a prerequisite not supported by the canonical pack.
- Those active definitions have now been removed from the upgrade catalog. The catalog is intentionally empty; source-listed `sensor_pack_1` and `drying_rack_1` IDs remain locked and unbuyable until their fictional prices/effects/unlocks receive an authoritative balance definition.
- Domain tests now require unconfigured/legacy upgrade purchase attempts to fail atomically without adding a ledger entry. The full current-commit CI run is still required to accept this change.

**Disposition**
- Do not invent replacement prices, percentages, prerequisites or unlock conditions.
- Preserve the existing ledger/idempotency patterns where compatible.
- Keep the source-listed upgrade IDs unavailable until an approved balance table defines prices, effects, prerequisites and unlock criteria. Do not silently bring back the removed energy-efficiency prices or percentages.

### HL-024 / Economy and progression balancing

**Canonical evidence**
- The canonical player contract has `level` and `experience` fields.
- The pack calls for progression, unlocks, early/mid/late economy simulation, and a deterministic balance harness.
- The inspected pack does not define an XP award table, level thresholds, progression curve, upgrade prices/effects, or unlock schedule.

**Current implementation evidence**
- The inspected initial state starts the player at level 1 with 0 experience.
- The inspected vertical-slice command handler contains the upgrade purchase flow, but no level/experience advancement formula was identified in that handler.
- The implementation therefore does not yet provide evidence that progression is implemented end-to-end.

**Disposition**
- Do not invent XP rewards, level thresholds or unlock gates.
- Keep progression as an explicit open requirement until a canonical source or owner-approved balance decision provides the rules.
- Once rules are sourced, add deterministic tests for threshold boundaries, repeated commands, save/load persistence, and unlock prerequisites.

## Required acceptance evidence

1. Restore the four canonical `contracts/*.ts` files and all relevant source documents exactly from the archive.
2. Reconcile upgrade IDs and behavior against the restored contracts without deleting compatible ledger/audit logic.
3. Add data/schema validation for upgrade definitions and references.
4. Add tests proving insufficient funds, duplicate purchase prevention, one ledger posting per purchase, and effect application only after a valid purchase.
5. Add a deterministic economy/progression harness once the missing numeric rules have an authoritative source.
6. Re-run strict typecheck, unit/contract tests, production build and browser E2E on one identified commit. No result is claimed in this audit.


## Scope rule

The title and core product remain Dr. Green Dump / DopeFarm, a medical-cannabis production management game with fictional game-only process values. Economics and progression must not introduce real production instructions. Values without explicit source or owner confirmation remain an open balance decision, not an implicit design authorization.
