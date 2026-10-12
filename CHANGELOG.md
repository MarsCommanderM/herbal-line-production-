## Unreleased

- Fixed the browser export/import acceptance test to wait for manual-save completion, export status, completion of autosave after a later campaign action, and re-enabled import controls before continuing.
- Exact-head push CI [#38283055593](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38283055593) and PR CI [#38283061167](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38283061167) passed after the change, including cross-browser E2E.

- Added runtime validation for the versioned fictional balance config: exact field sets, safe integer bounds, value ranges, unique upgrade IDs, valid prerequisite references, and acyclic dependencies.
- Added CI validation of src/data/balance.json against schemas/balance.schema.json plus negative tests for missing/unknown fields, out-of-range and unsafe integers, duplicate IDs/items, missing prerequisites, dependency cycles, and inconsistent QC thresholds.
- Kept sensor_pack_1, drying_rack_1, and XP/level progression unresolved until authoritative design values are found; no costs, effects, or XP thresholds were invented.

- Added an accessible, state-derived campaign guidance panel with next-step recommendations and explanations for quality, compliance, and availability blockers.
- Added a terminal batch rejection path with documented reason codes, queue/room cleanup, and a UI recovery action for failed or unresolved quality checks.
- Documented measured source-archive drift and the intentional generic-botanical scope fork; no exact 1:1 ZIP parity claim is made.
- Added Chromium acceptance for keyboard tab order, visible focus, mobile viewport overflow, live status semantics, and reduced-motion support.
- Added cross-entity state invariant checks before committing domain commands, with tests for room capacity, inventory reservation, batch/plant links, machine/job consistency, QC state, rejection terminality, ledger idempotency, and invalid-command atomicity.
- Added a deterministic corruption matrix and 100 generated room-occupancy mutations to exercise the invariant validator.
- Added unit and Chromium E2E coverage for campaign guidance and progression.

# Changelog

## [1.0.0] — 2026-10-11

- Widersprüchliche Konzept-, State-, Architektur- und Produktionspläne in ein kanonisches Masterpaket konsolidiert.
- Medizinische Cannabis-Spielwelt mit ausschließlich fiktionaler, abstrahierter Simulationslogik festgelegt.
- Agentenrollen, Parallelitätsgrenzen, Repository-Audit, DoD und Release-Gates verbindlich gemacht.
- Namens-/Copyright-Metadaten für Michael Braunschweig als Auftraggeber-Vorgabe gesetzt; Rechtekette und Markenfreigabe bleiben beweispflichtige Gates.
- Taskboard, kanonische TypeScript-Verträge, JSON-Schemas, Risiko-, Test-, Sicherheits- und Release-Dokumente aufgenommen.

## Unreleased — Facility systems

- Added bidirectional staff/machine room assignment validation and role-to-room compatibility for the fictional facility.
- Added atomic staff reassignment/unassignment and machine movement commands, with guards against moving active machines.
- Added an abstract maintenance lifecycle with a fictional maintenance specialist, condition restoration, audit events, and live facility status cards.
- Added unit and Chromium E2E coverage; integration CI remains pending.

## Unreleased — Economy and progression

- Added deterministic fictional daily wage and utility cost calculation.
- Added an explicit campaign day-end command that advances the clock to the next 08:00 and posts idempotent expense entries to the canonical ledger.
- Added day-end and ledger events, a daily-cost dashboard metric, negative-balance warning, and unit/Chromium acceptance coverage.
- Utility pricing and wages are fictional balance constants; broader multi-day economy tuning remains open.

## Unreleased — Economy forecast

- Added pure multi-day balance projections with explicit daily-revenue assumptions and bounded forecast horizons.
- Added a cash-runway selector and dashboard metrics for a 30-day zero-revenue scenario; the UI labels the assumptions instead of presenting the projection as guaranteed income.
- Added deterministic tests for zero-revenue burn, revenue-offset scenarios, runway exhaustion and invalid forecast inputs. Same-revision CI is pending.

## Unreleased — Economy upgrades and distress indicator

- Added a one-time, ledger-backed energy-efficiency upgrade that reduces fictional utility expenses by 20 percent.
- Added duplicate-purchase and insufficient-funds guards, purchase audit events, and UI feedback; the purchase changes the derived balance through an `investment` ledger entry.
- Added a financial-health indicator based on current balance and zero-revenue runway, plus finance/domain and Chromium E2E coverage. Exact-revision CI pending.

## Unreleased — Economy distress recovery

- Added a one-time, ledger-backed fictional support grant available only when campaign funds are exhausted.
- The grant clears the current deficit and provides at least seven days of current operating costs, using a campaign-scoped idempotency key and explicit `grant` account.
- Added recovery event/notification and tests for premature use, recovery amount, balance derivation and duplicate-claim prevention. Exact-revision CI pending.

## Unreleased — Economy upgrade progression

- Added a second energy-efficiency tier, unlocked only after the first tier is purchased.
- The second tier applies an additional 10% reduction to remaining fictional utility costs and posts a separate investment ledger entry.
- Added prerequisite/duplicate guards, deterministic cent-rounding tests, and Chromium E2E coverage for unlocking, purchasing and compound savings. Exact-revision CI pending.


## Unreleased — Core-loop tutorial and browser acceptance

- Added a six-step state-derived tutorial for the core campaign loop, including explicit compliance and rejected-batch pauses.
- Added Playwright UI acceptance for the full 12-command path from simulation through delivery, single revenue posting, reload restoration, and tutorial completion.
- Added a content source register. Exact-revision cross-browser CI is pending; no release-readiness claim is made.
