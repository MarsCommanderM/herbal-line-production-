# 12 — Subagenten-Grenzen und Parallelisierung

## Agent A — Architecture & Quality Contracts
**Owner:** Architektur, Contracts, Save-Schema, Dependency-Regeln, Migrationen, Teststrategie und technische ADRs.  
**Scope:** `contracts/`, `schemas/`, `docs/05*`, `docs/06*`, `docs/08*`, Architektur-Test-Utilities nur nach Zuteilung.  
**Verboten:** UI-Implementation, Spielbalancing ohne Domain-Review, direkte Änderungen an Bereichen anderer Agenten.  
**Output:** freigegebene API/Typen, Invarianten, Migrationsplan, Modulgrenzen, Contract-Tests, genaue Änderungsliste.

## Agent B — Simulation & Domain Systems
**Owner:** deterministische Spielregeln, State-Machines, Facility-/Bestands-/Batch-/QC-/Compliance-/Order-/Economy-/Staff-Logik.  
**Scope:** `src/domain/`, `src/simulation/`, reine Domain-Tests und zugewiesene Content-/Balance-Dateien.  
**Verboten:** DOM, Three.js/PixiJS/Rapier-Objekte in Fachlogik, Speicherzugriff, UI-Design, echte Anbau-/Verarbeitungsrezepte.  
**Output:** pure/isolierte Systeme, stabile Event-Ausgänge, positive/negative Tests, Datenvalidierung, Replay-/Determinism-Beweise.

## Agent C — World, UI & Integration
**Owner:** Three.js-Welt, PixiJS-UI, Input, Camera, Sound, Asset-Integration, Accessibility, visueller Qualitätsbeweis.  
**Scope:** `src/engine/`, `src/ui/`, zugewiesene `public/assets/` und visuelle Integrationstests.  
**Verboten:** Domain-Regeln oder Kontostände selbst berechnen, Persistenz-Schema ohne Freigabe ändern, Platzhalter als finale Assets ausgeben.  
**Output:** funktionale Screens/Interaktionen gegen echte Store-Selectoren, responsive Layouts, dispose/resize, Screenshot-/Performance-Belege, Asset-Registereinträge.

## Hauptagent / Integrator

- Liest Repo- und Taskstatus, teilt Verantwortlichkeiten aus, entscheidet Abhängigkeiten, schützt die Contracts.
- Arbeitet an zentralen Änderungen und Integrationsflächen, die nicht unabhängig sind.
- Überprüft Ergebnisse auf Scope-Leakage, Typecheck, Tests, Dependency-/License-Sicherheit, UX und Integration.
- Löst Konflikte durch Review/Decision Record, nicht durch stilles Überschreiben.
- Ist alleiniger Freigabepunkt für den Wechsel eines Meilensteins.

## Parallelisierungsregeln

- Maximal drei aktive Schreibagenten einschließlich Hauptagent nur dann, wenn die Plattform das sauber unterstützt; standardmäßig entstehen A/B/C als drei klar getrennte Subrollen, der Hauptagent bleibt Integrator.
- Parallele Schreibarbeit beginnt erst nach Contract-Freeze und vereinbarten Pfaden. Contracts, Lockfiles, globale Config, Reducer-Root, Save-Migrationskette und Release-Workflow sind Shared-Integrationflächen.
- Gleiche Datei darf nicht gleichzeitig von zwei Agenten bearbeitet werden. Bei echter Kollisionsgefahr zuerst eine Person als Owner bestimmen.
- Jeder Agent erstellt branch-/diff-basierten Output oder eine exakt begrenzte Änderung. Keine `git add .`, keine fremden Änderungen committen, keine destructive clean/reset/rebase/force-push während paralleler Arbeit.
- Wenn Task-Host separate Worktrees nicht unterstützt oder Änderungen nicht in gemeinsamer Checkout-Realität sichtbar sind, parallele Autoren stoppen und serialisieren.
- Parallelität wird nur gewählt, wenn sie Zeit einspart; kleine Änderungen, QA-Nacharbeiten und gemeinsame Integrationsdateien verbleiben beim Hauptagenten.

## Handoff Gate

Jede Übergabe muss den Agentenabschlussbericht aus `docs/11_AUTONOMOUS_AGENT_PLAYBOOK.md` enthalten. Eine Antwort „fertig“ ohne Diff, Tests und Rest-Risiken wird als `PARTIAL` bewertet. Merge-/Integrationsentscheid trifft nur der Hauptagent nach erneutem Lesen des tatsächlichen Repositories.
