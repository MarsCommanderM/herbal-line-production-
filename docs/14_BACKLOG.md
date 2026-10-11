# 14 — Priorisiertes Studio-Backlog

Priorität: **P0** Release-kritisch/Blocker; **P1** Kernprodukt; **P2** deutlicher Qualitäts-/Inhaltsschub; **P3** optional nach Freigabe. Story-Points sind relative Schätzungen, keine Kalenderzusagen. Dependencies beziehen sich auf IDs.

| ID | Epic / Task | Prio | SP | Abhängigkeiten | Akzeptanzkriterium |
|---|---|---:|---:|---|---|
| HL-001 | Repository Truth Audit | P0 | 3 | — | Baseline, Git-Zustand, Build/Test-Ergebnisse und Risiken belegt |
| HL-002 | Vision/Scope/Non-Goals fixieren | P0 | 2 | HL-001 | Requirements und Non-Goals widerspruchsfrei |
| HL-003 | Canonical Contracts und State-Machines | P0 | 8 | HL-002 | Types, Schemas, Invariants, Transitionen und negative Contract-Tests bestehen |
| HL-004 | Modul-/Agenten-Grenzen fixieren | P0 | 3 | HL-003 | Kein Ownership-Overlap für alle aktiven Tasks |
| HL-005 | Vite/TypeScript/CI-Grundlage | P0 | 5 | HL-001, HL-003 | Fresh install + strict typecheck + lint + tests + build grün |
| HL-006 | Deterministischer RNG und Fixed-Step Runtime | P0 | 5 | HL-003, HL-005 | Replay erzeugt denselben Domain State |
| HL-007 | Content-Schemas und Load-Validator | P0 | 3 | HL-003, HL-005 | Defekte/duplizierte/unreferenzierte Daten stoppen Build/Boot mit Pfadangabe |
| HL-008 | Store, Command Gateway, Event Contracts | P0 | 5 | HL-003, HL-006 | Invalid command ist atomar; Revision und Events stimmen |
| HL-009 | Production-quality Vertical Slice | P0 | 13 | HL-005–HL-008 | Neue Partie bis vollständiger Lieferung spielbar und dokumentiert |
| HL-010 | Three.js Facility World + Camera | P1 | 8 | HL-009 | Finale Raumassets, resize/dispose, camera bounds, perf proof |
| HL-011 | PixiJS UI Shell und Navigation | P0 | 8 | HL-003, HL-009 | Alle Kernzustände lesbar, alle Hauptscreens navigierbar |
| HL-012 | Rapier Interaction Adapter | P1 | 3 | HL-010 | Nur benötigte Kollision/Trigger; Interaktionen reproduzierbar |
| HL-013 | Source Lot und Traceability Chain | P0 | 5 | HL-003, HL-008 | Jeder Batch/Liefervorgang rückverfolgbar |
| HL-014 | Abstract Plant Lifecycle | P1 | 5 | HL-006, HL-013 | Fiktive, deterministische Stages mit Negativtests |
| HL-015 | Batch Queue und Inventory Ledger | P0 | 8 | HL-013, HL-014 | Mengeninvarianten und atomare Reservierungen |
| HL-016 | QC Assessment und Release Gate | P0 | 5 | HL-015 | Versand nach fehlender/fehlgeschlagener QC unmöglich |
| HL-017 | Licensing/Compliance/Audit | P0 | 8 | HL-013, HL-016 | Sperre blockt kritische Commands; Auditbericht vollständig |
| HL-018 | Order/Delivery/Idempotency | P0 | 8 | HL-015–HL-017 | Keine Doppelbestände oder Doppelumsätze unter Retry |
| HL-019 | Economy/Ledger/Staff/Rooms/Upgrades | P1 | 13 | HL-018 | Ledger konsistent; alle ökonomischen Änderungen erklärbar |
| HL-020 | IndexedDB Save Slots + Migration | P0 | 8 | HL-003, HL-008 | Neustart, Recovery, Versionierung, Fehlerpfade bestehen |
| HL-021 | Autosave/Export/Import/Recovery UX | P1 | 5 | HL-020 | Save-Fehler sind sichtbar; Import validiert vor Übernahme |
| HL-022 | Final Art/Audio/Asset Pipeline | P0 | 13 | HL-010, HL-011 | Keine Platzhalter im Final Content; Manifest-/Lizenz-Gate PASS |
| HL-023 | Onboarding/Settings/Accessibility/Localization | P1 | 8 | HL-011 | Kernfluss bedienbar; Fokus/Reduced Motion/Translatable strings geprüft |
| HL-024 | Economy/Progression Balancing Harness | P1 | 5 | HL-019 | Mehrere deterministische Simulationen; Deadlock/Exploit Reports |
| HL-025 | Performance/Memory/Long-Session QA | P0 | 8 | HL-010, HL-011, HL-020 | Zielgeräte und Grenzwerte gemessen; Memory stabil |
| HL-026 | Dependency/Security/Privacy Audit | P0 | 5 | HL-005 | Audit-Report; keine hardcodierten Secrets; Risiken triagiert |
| HL-027 | Brand/IP/Third-Party Rights Gate | P0 | 5 | HL-022 | Namensprüfung, Rechtebelege, Notices und Register vollständig |
| HL-028 | Full Regression + RC Gate | P0 | 13 | HL-009–HL-027 | Null P0/P1, alle Gates frisch grün, Artefakt gehasht |
| HL-029 | Release/rollback/monitoring rehearsal | P0 | 5 | HL-028 | Rollback und Smoke-Test ausgeführt und dokumentiert |
| HL-030 | Post-release maintenance playbook | P1 | 3 | HL-029 | Zuständigkeit/Hotfix/Migration/Incident Ablauf definiert |

## Definition of Ready

Task enthält Ziel, Nichtziele, Pfade, Abhängigkeiten, Daten-/Contract-Auswirkungen, Acceptance Criteria, Testbefehle und Owner. Bei parallelisierten Aufgaben gibt es explizite Dateigrenzen.

## Definition of Done

Fachverhalten integriert; Typecheck/Lint/Test/Build nach letzter Änderung; relevante Edge Cases abgedeckt; Diff überprüft; Dokumentation und Taskstatus aktualisiert; keine unbelegten Erfolgsbehauptungen; keine Rechte-/Security-Blocker.
