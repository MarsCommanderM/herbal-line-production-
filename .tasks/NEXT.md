# Next Task — Authoritative Queue

## Verified baseline — 2026-10-12

- Working branch: `production/herbal-line-baseline-20261012`
- Historical verified baseline: `a9ff0d8cf481529baab73b62d1d1526402cfa169` (full CI run #38210853633).
- Latest accepted revision: `a0325cf5a941dabbc0c4683919e7c0bca5ca860f` — [Run #38257706542 succeeded](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38257706542) across every workflow step, including browser E2E, production smoke, document/JSON validation and whitespace.
- CI evidence: [Run #38210853633 — success](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38210853633). This exact revision passed locked install, lint, format, strict typecheck, domain tests, production build, Playwright browser E2E, production-preview smoke, Master-Pack document/JSON validation, and whitespace checks.
- Default branch observed during this update: `main@4a1e2724dcce32d4b5a2516bb5a3df651884fc37`, 98 tracked paths. Recovery-branch commits in this task were not pushed to `main`.
- **Still blocked:** byte-for-byte comparison with `Herbal-Line-Production-Master-Pack.zip`. The archive bytes are not available in the current working surface, so the historical path/hash record is not a fresh parity proof.

## P0-001 — Repository truth audit (PARTIAL; PARITY BLOCKED)

The truth audit and branch separation are documented in `docs/audits/BASELINE.md`. Current remote heads and the recovery branch CI are recorded. Do not call this a 1:1 Master-Pack sync until every archive path and content hash has been compared against the actual archive.

## P0-002 — Canonical scope/contract reconciliation (SOURCE-LEVEL COMPLETE; REVIEW OPEN)

Contract conflicts are catalogued in `docs/audits/CONTRACT_RECONCILIATION.md`. Final review remains blocked on P0-001 exact archive parity.

## P0-003 — Reproducible engineering baseline (VERIFIED)

The exact revision above passed the full CI workflow: clean `npm ci`, lint, format, strict TypeScript, unit tests, production build, browser tests, preview smoke, Master-Pack document/JSON validation and `git diff --check`.

## P1-001 — Botanical operations vertical slice (VERIFIED)

Vitest covers successful intake-to-delivery domain flow, transition guards, QC hold/release, insufficient-stock rejection, stale-command rejection and idempotent revenue confirmation. Playwright drove the UI through 12 actions, asserted delivered order and shipment state plus one revenue ledger entry, then reloaded and verified the persisted delivered campaign.

## P1-002 — Save/load, validation and recovery (CORE VERIFIED; SCHEMA MIGRATION SUBGATE OPEN)

Verified capabilities: versioned v1 envelope validation, SHA-256 checksum vectors, legacy FNV-1a checksum compatibility, explicit rejection of unsupported schema versions, autosave/manual save, load/reload, export/import validation, corrupt-primary backup recovery, safe startup when no valid backup exists, and failed-write/retry coverage. A migration from a pre-v1 schema is not claimed: the current canonical contract specifies v1 and supplies no older schema to migrate.

## P1-003 — Operational dashboard and queue UX (VERIFIED)

The dashboard exposes process batches, room occupancy/capacity meters, machine status, and order/delivery state. Playwright checks the queue semantics and activates manual save with Enter from keyboard focus.

## P1-004 — Quality, audit and incident systems (VERIFIED)

Accepted at `cc730e9fdca65d7c3bb1912faf1dbd053f047daf`; [full CI run #38251987389 passed](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38251987389). Fictional incident capture, operation-specific blocking, corrective-action completion, audit-derived license/risk state, audit and license-change events, and the management queue are covered by domain and browser tests. High/critical incidents suspend operations; corrective action alone cannot restore the license. The browser suite also confirms the campaign-completion message remains visible alongside the compliance action after delivery.

## P2-001 — Facility, capacity, staffing and maintenance (VERIFIED)

Accepted at `a0325cf5a941dabbc0c4683919e7c0bca5ca860f`; [full CI run #38257706542 passed](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38257706542). Review confirmed room capacity checks, occupancy transfer/release accounting, exclusive staff assignment, role compatibility, machine-room consistency, and the maintenance lifecycle. A degraded active machine can no longer receive a maintenance assignment that cannot start. New domain tests cover occupancy across queue → QC → storage → delivery, mismatched machine/room rejection, and rejection of the active-machine maintenance dead end. Existing browser E2E verifies facility purchase, capacity display, maintenance assignment/start/completion, condition restoration, ledger entry and save persistence. Save schema v1 is unchanged.

## P2-002 — Economy and progression (IN PROGRESS — IMPLEMENTATION)

Audit confirmed that balances/totals are ledger-derived, room investments and delivery revenue are posted, and duplicate room purchases and revenue settlement are guarded. The existing order contract also carries `dueAt` and `latePenaltyCents`, but those fields were unused; late delivery now posts one penalty ledger entry atomically with revenue and stock settlement, with an explicit idempotency key and event. New tests cover penalty amount, derived balance, event, and repeated confirmation. Remaining audited gaps: `UPGRADE/PURCHASE` is declared but has no domain handler; player experience/level never advance; no canonical upgrade catalog or versioned `src/data/balance.json` exists despite the domain spec referencing one. Do not invent progression costs/effects; establish those rules from the authoritative Master Pack before implementing those subgates. Save schema v1 remains unchanged.

## Operating rule

Do not mark a task complete without implementation evidence, relevant tests, reviewed diff and updated documentation. Continue to the next unblocked task after acceptance. Paid or irreversible external actions require existing explicit authorization.
