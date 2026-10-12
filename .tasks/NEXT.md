# Next Task — Authoritative Queue

## Verified baseline — 2026-10-12

- Working branch: `production/herbal-line-baseline-20261012`
- Verified revision: `a9ff0d8cf481529baab73b62d1d1526402cfa169`
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

## Next unblocked task — P1-004: Quality, audit and incident systems

Close any remaining QA/audit gaps with evidence, focusing on traceable holds/releases, incident/corrective-action state transitions and negative-path tests. Do not downgrade acceptance requirements to make CI pass.

## Operating rule

Do not mark a task complete without implementation evidence, relevant tests, reviewed diff and updated documentation. Continue to the next unblocked task after acceptance. Paid or irreversible external actions require existing explicit authorization.
