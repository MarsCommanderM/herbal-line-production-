## Unreleased

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
