# Contract Reconciliation — 2026-10-12

## Authority

The intended authority is the supplied Herbal Line Master Pack: `AGENTS.md`, `PROJECT_MANIFEST.json`, `docs/00_MASTER_PRODUCTION_DOCUMENT.md`, `docs/04_DOMAIN_MODEL_AND_STATE_MACHINES.md`, `docs/05_TECH_ARCHITECTURE.md`, `docs/06_CANONICAL_CONTRACTS.md`, `contracts/*.ts`, and `schemas/*.schema.json`. The implementation branch uses the safe generic botanical-operations scope: fictional plants, abstract QC/inventory/compliance, and generic customer orders. No real-world production or controlled-substance distribution guidance is implemented.

## Conflicts found and reconciled on this branch

| Contract | Conflict | Resolution |
|---|---|---|
| Compliance state | The domain union omitted `recovery_review`, while the canonical state machine explicitly requires it. | Added `recovery_review` to `LicenseStatus`. |
| Quality assessment | `QualityAssessment` stored both `passed: boolean` and `decision: pass/fail/review`; the event contract stored only `passed`. These can disagree. | The assessment and `quality.assessed` event use the single canonical decision union. |
| Inventory reservation | `quantityReserved` and a `reserved` disposition could encode overlapping state; the pure reservation function preserves lot disposition. | Removed `reserved` from the lot disposition union; reservation remains quantity-based and atomic. |
| Economy | `GameState.moneyCents` duplicated a balance derivable from `EconomyState.openingBalanceCents + ledger`; mutable daily/lifetime summary totals duplicated ledger-derived data. | Removed the parallel balance and summary fields. Finance selectors derive balance and totals from the ledger. |
| Persistence | The save payload included transient UI state, contrary to the canonical distinction between game state and UI state. | Save payload type is `Omit<GameState, 'ui'>`; the v1 JSON schema no longer requires `ui` or `moneyCents`. |
| Commands | One union mixed domain mutations, UI navigation/selection, and persistence requests. | Split into `DomainCommand`, `UICommand`, and `PersistenceCommand`, with `GameCommand` as the aggregate union. |
| Save integrity | The save format previously used a weak non-cryptographic checksum only. | V1 writes canonical-JSON SHA-256; the reader retains explicit FNV-1a compatibility for existing v1 envelopes and rejects malformed checksum formats through the schema. |

## Validation evidence

- The historical Master-Pack validator run is recorded in the original baseline. The current branch's CI validator also passed on `a9ff0d8cf481529baab73b62d1d1526402cfa169`.
- Exact CI result: [Run #38210853633](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38210853633) — success for locked install, source-policy lint, format, strict typecheck, unit tests, production build, browser E2E, served preview smoke, document/JSON validation, and whitespace.
- Domain tests cover the fictional intake/stage → batch → QC → released inventory → order allocation → dispatch → delivery loop; reject stale commands, failed QC release and insufficient allocation; confirm revenue idempotency.
- Browser E2E completed the 12-command workflow, verified a delivered order and delivery, one matching revenue ledger entry, SHA-256 checksum, and persistence after a full reload.
- Persistence E2E covers corruption with a valid backup, corruption without a valid backup, export/import, invalid import, and manual save/load.
- Dashboard E2E checks process queue, room capacity, machine status, order/delivery status and keyboard activation of manual save.
- The Master-Pack document/JSON validator passed in CI. This is **not** proof of exact ZIP-to-branch content parity.

## Remaining blockers

1. Exact byte-for-byte synchronization with the supplied archive is not verified; the archive bytes are not available in the current working surface. P0-001 and final P0-002 review remain open.
2. Save schema v1 and recovery are verified. A schema migration from pre-v1 is not claimed: the current canonical contract specifies v1 but does not provide a pre-v1 envelope to migrate. Unsupported versions are explicitly rejected until an authoritative legacy schema exists.
3. P1-004 corrective-action workflow and end-to-end acceptance remain open. The next implementation task is quality, audit and incident hardening.
4. The later P2/P3/P4 backlogs remain open; the project is not a release candidate.


## P1-004 implementation — compliance incident, corrective action and audit

- Compliance violations optionally carry operation codes, preserving compatibility with existing v1 save records that omit the field.
- `COMPLIANCE/RECORD_VIOLATION` records a fictional incident and immediately suspends the license for high/critical severity, adding operation-specific blocks.
- `COMPLIANCE/RESOLVE_VIOLATION` records a corrective-action code and timestamp; it deliberately does not clear a suspension.
- `COMPLIANCE/START_AUDIT` derives license status, risk and blocked operation codes from unresolved incidents, records audit timestamps and emits audit/license-change events.
- Acceptance tests cover severe violation → suspension/block, corrective action alone not restoring the license, a clean audit restoring valid status, unresolved severe findings remaining suspended, invalid corrective codes being rejected, and state persistence after reload.
- This is an in-game simulation audit trail, not a claim of regulatory compliance for a real facility.
