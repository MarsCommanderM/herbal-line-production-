# Herbal Line — Final Production Master Pack

**Dokumentstand:** 11. Oktober 2026  
**Projekt-/Spielname:** Herbal Line  
**Vom Projektauftrag benannter Projektverantwortlicher:** Michael Braunschweig  
**Plattform:** Browser/Web  
**Status:** verbindliche Produktionsspezifikation und agentenfähiges Arbeitsbriefing — kein bereits fertig implementierter oder veröffentlichter Spiel-Build.

## Produktdefinition

Herbal Line ist ein hochwertiges Web-Managementspiel über den Betrieb einer fiktiven, streng regulierten botanischen Anlage. Im Mittelpunkt stehen Planung, Qualitätssicherung, Chargenrückverfolgbarkeit, Lager, generische Kundenaufträge, Personal, Ressourcen, Compliance und nachhaltige Expansion.

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

The repository now contains a pinned Vite/TypeScript toolchain and lockfile, a Three.js facility view, a PixiJS management interface, deterministic initial campaign state, typed domain commands, an abstract botanical operations flow, ledger-derived finance, QC/traceability gates, and vertical-slice tests.

GitHub Actions has verified one earlier revision with source lint, format check, strict TypeScript typecheck, unit tests, production build, master-pack validation, and whitespace checks. The current branch has since been updated to keep user-facing gameplay in a generic botanical scope; the latest revision must pass the same workflow before it can be called green. Browser E2E, durable save/load and migration, asset licensing inventory, accessibility review, and release acceptance remain open.

The supplied master pack is not yet proven byte-for-byte identical to the GitHub repository. See [the baseline audit](docs/audits/BASELINE.md) and [contract reconciliation](docs/audits/CONTRACT_RECONCILIATION.md).
