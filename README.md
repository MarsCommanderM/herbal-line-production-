# Dr. Green Dump / DopeFarm — Final Production Master Pack

**Dokumentstand:** 11. Oktober 2026  
**Projekt-/Spielname:** Dr. Green Dump / DopeFarm
**Vom Projektauftrag benannter Projektverantwortlicher:** Michael Braunschweig  
**Plattform:** Browser/Web  
**Status:** verbindliche Produktionsspezifikation und agentenfähiges Arbeitsbriefing — kein bereits fertig implementierter oder veröffentlichter Spiel-Build.

## Produktdefinition

Dr. Green Dump / DopeFarm : ist ein hochwertiges Web-Managementspiel über den legalen, kontrollierten Aufbau und Betrieb einer streng regulierten medizinischen Cannabis-Pflanzenproduktion. In dem der spieler die Leitung führt für einen legalen Produktions- und Lieferprozess für ein reguliertes medizinisches Cannabis Arznei-/Naturprodukt. Es simuliert — Cannabis-Anbau- und  Vertriebsanleitung. 
Spielwelt: klar erkennbare Cannabis-Pflanzen, professionelle Anbauräume, Lampen, Bewässerung, Klima- und Lüftungstechnik, Arbeitsbereiche, Lager und Verarbeitung.
Spieleraktionen: Pflege und Betreuung der Pflanzen müssen direkt sichtbar an den Pflanzen stattfinden – nicht nur als abstrakte Schaltflächen in einem Verwaltungsmenü.
Geschäftsablauf: Pflanzenpflege, simulierte Verarbeitung, Qualitätssicherung, Lager, Logistik und Auslieferung an Apotheken. Die internen Abläufe der Apotheken selbst gehören nicht zum Spielumfang.
Die Simulationswerte sind fiktive Spielwerte. Das schränkt die Cannabis-Thematik nicht ein: Die Pflanzen dürfen erkennbar sein und die Aktionen müssen visuell verständlich umgesetzt werden.

**Darstellungs- und Simulationsgrenze:** Pflanzen-, Qualitäts- und Prozesswerte sind abstrahierte, erfundene Spielmechaniken. Das Paket enthält keine realen Anbauparameter, Rezepturen, Extraktionsverfahren oder operativen Anleitungen zur Herstellung oder Distribution kontrollierter Substanzen.

## Inhalt

- `AGENTS.md`: verbindliche Direktive für den autonomen Hauptagenten und sein internes Team aus 2–3 Subagenten.
- `docs/`: konsolidiertes Masterdokument von Vision und GDD bis Architektur, Datenverträgen, Tests, Rechten, Risiko, Release und Live-Betrieb.
- `contracts/`: kanonische TypeScript-Domänenverträge als gemeinsame Referenz.
- `schemas/`: JSON-Schemas für Persistenz und datengetriebene Inhalte.
- `.tasks/`: priorisiertes, versionierbares Task-Board.
- `scripts/validate_masterpack.py`: Offline-Prüfung der Paketvollständigkeit und Konsistenz.
- `rights/`: initiales Rechte-/Lizenzregister mit expliziten Prüfbedingungen.

## Inbetriebnahme im Ziel-Repository

1. ZIP entpacken.
2. Den gesamten Inhalt in das bestehende Repository kopieren oder das Verzeichnis als neues Repository verwenden.
3. Vor Änderungen den tatsächlichen Repository-Status prüfen: Root, Branch, Working Tree, vorhandene Dateien und aktuelle Projektwahrheit.
4. `AGENTS.md` vollständig lesen; danach `docs/00_MASTER_PRODUCTION_DOCUMENT.md`, `docs/11_AUTONOMOUS_AGENT_PLAYBOOK.md` und `.tasks/NEXT.md` lesen.
5. `python scripts/validate_masterpack.py` ausführen.
6. Erst nach dem Repository-Audit die erste Task abarbeiten. Vorhandene wertvolle Arbeit wird niemals blind überschrieben.

## Autoritative Quellenreihenfolge

Bei Konflikten gilt: (1) bestätigte Benutzerentscheidung, (2) `AGENTS.md` für Arbeitsregeln, (3) `docs/00_MASTER_PRODUCTION_DOCUMENT.md` für Produktwahrheit, (4) `contracts/` und `schemas/` für technische Verträge, (5) jeweilige Systemspezifikation, (6) `.tasks/` für Status und Reihenfolge, (7) Implementierung. Der Agent protokolliert Konflikte und korrigiert veraltete Dokumente; er führt keine zweite, abweichende Wahrheit ein.

## Qualitätsaussage

„Produktionsqualität“ ist eine Abnahmebedingung, kein Etikett. Ein System gilt erst dann als fertig, wenn es implementiert, integriert, automatisiert geprüft, nachvollziehbar dokumentiert und durch reproduzierbare Evidenz abgenommen wurde. Dieses Paket garantiert nicht, dass ein noch nicht gebautes Spiel bereits releasefähig ist.


## Schnellzugriff auf die verbindlichen Pläne

- [Master Production Document](docs/00_MASTER_PRODUCTION_DOCUMENT.md)
- [Vollständiger Phasenplan — Phase 0 bis 19](docs/13_PRODUCTION_PHASE_PLAN.md)
- [Priorisiertes Studio-Backlog](docs/14_BACKLOG.md)
- [Nächste autoritative Task](.tasks/NEXT.md)
- [Kanonische Domain-Verträge](contracts/domain.ts)
- [Offline-Paketvalidator](scripts/validate_masterpack.py)

Der Master-Pack-Inhalt wurde in dieses Repository expandiert. Der Repository-Stand ist weiterhin eine Produktionsspezifikation; ein ausführbarer Spiel-Build und erfolgreiche Projekt-CI sind noch nicht nachgewiesen.

## Current engineering status

The current integration branch contains a pinned Vite/TypeScript toolchain and lockfile, a Three.js facility view, a PixiJS management interface, deterministic domain state, typed commands, a fictional botanical operations vertical slice, ledger-derived finance, QC/traceability gates, and a versioned IndexedDB save system.

The latest verified revision is `bce2a0bd0edda036032be03e8dfea3033057ea52`. [GitHub Actions run 38182289439](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38182289439) passed install, source lint, format, strict typecheck, 26 unit tests, production build, three Chromium E2E tests, production preview smoke, master-pack validation and whitespace checks.

Persistence currently supports manual save/load, autosave after successful actions, last-known-good backup recovery, JSON export/import, and SHA-256 validation. Schema migration beyond v1, quota/interrupted-write recovery, cross-browser testing, accessibility review, final asset/license review and release acceptance remain open.

The supplied master pack is **not yet proven byte-for-byte identical** to the GitHub implementation tree. The 42-file archive is identified by SHA-256 `4e783542951f573ed7412444e9e2ed00c490a9b7919f67c30399b86297a4b8972`. Exact per-path parity remains a P0 task; see [the baseline audit](docs/audits/BASELINE.md), [contract reconciliation](docs/audits/CONTRACT_RECONCILIATION.md), and [implementation status](docs/audits/IMPLEMENTATION_STATUS.md).


The management panel provides state-derived campaign guidance, including quality/compliance holds and a recommended next step. This is UI guidance only; domain transition guards remain authoritative.
