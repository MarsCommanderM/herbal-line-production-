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

Verified code revision: `24a0f650d9a118fa32e13a2d0abe36229f0f0036`. [GitHub Actions run 38182607944](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38182607944) passed locked install, lint, format, typecheck, 27 unit tests, production build, 4 Chromium E2E tests, production preview smoke, master-pack validation and whitespace checks.

The fictional operations vertical slice has an explicit terminal QC rejection path. Persistence includes SHA-256 save validation, IndexedDB, autosave, last-known-good backup recovery, and JSON export/import. Migration beyond v1, quota/interrupted-write tests, cross-browser acceptance, dashboard/accessibility review, final licensed assets, performance and release acceptance remain open.

The supplied Master Pack is **not yet byte-for-byte identical** to the current implementation tree. The 42-file archive is identified by SHA-256 `4e783542951f573ed7412444e9e2ed00c490a9b7919f67c30399b86297a4b8972`. At the verified revision, 4 of 42 source blobs match and 38 differ; 33 additional implementation/tooling paths are present. See [the expected blob manifest](docs/audits/MASTERPACK_EXPECTED_BLOBS.json), [the parity checker](scripts/verify_masterpack_parity.py), [contract reconciliation](docs/audits/CONTRACT_RECONCILIATION.md), and [implementation status](docs/audits/IMPLEMENTATION_STATUS.md). Exact parity is the next P0 task.
