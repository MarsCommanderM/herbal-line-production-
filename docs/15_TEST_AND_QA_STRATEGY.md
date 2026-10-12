# 15 — Test-, QA- und Abnahmestrategie

## 1. Testpyramide

- **Unit/Domain:** reine Regeln, Grenzwerte, Zustandsmaschinen, Preise, Ressourcen, Command-Validierung, Ledger, deterministic RNG.
- **Property-based:** Mengen bleiben nichtnegativ; Scores innerhalb Grenzen; Geldbuchungen sind idempotent; Reihenfolge von unabhängigen Entities bleibt stabil; keine unzulässigen Zustände.
- **Contract:** Commands/Events/Save-Schemas/Content-Schemas sowie Modulgrenzen.
- **Integration:** Domain→Store→UI; Domain→Save/Load; Asset-loader→Renderer; Physics adapter→interaction commands.
- **E2E:** neue Partie, Auftragsfolge, Batch, QC pass/fail, Lieferung, Finance, Audit, Save, vollständiger Reload.
- **Visual regression:** Zielauflösungen, Zoomstufen, helle/dunkle Räume, Warning/Critical/Empty/Error-Zustände, lange Zahlen/Texte.
- **Performance/reliability:** fixed-step determinism, lange Session, viele Entities, Speichergrenzen, Offline-/Tab-Wechsel, Resize, Geräteeinschränkung.

## 2. Pflichtfälle

1. ungültiger Command ändert weder State noch Ledger.
2. veraltete Revision wird abgelehnt.
3. doppelte Command-ID ist idempotent bzw. eindeutig abgelehnt.
4. Quarantäne/Ablehnung kann nie still freigegeben werden.
5. fehlender Batch-Ursprung blockiert QC/Release/Delivery.
6. Qualität unter Spielschwelle blockiert Release.
7. Lizenz `suspended` blockiert kritische Prozess- und Lieferbefehle.
8. Reservierung über Bestand schlägt atomar fehl.
9. parallele Allokation konkurrierender Aufträge kann denselben Bestand nicht doppelt reservieren.
10. doppelte Delivery-Confirmation bucht weder doppelt Bestand noch Umsatz.
11. über Mitternacht laufende Simulation erhöht den Tag korrekt, auch bei mehreren Tagen dt-Überlauf.
12. pausierte Uhr verändert keine Spielsysteme außer ausdrücklich pausierbaren UI-Einstellungen.
13. Save-Schema unbekannt oder Checksum invalid wird nicht in aktive Partie geladen.
14. Migration bricht bei ungültiger Quelle ohne den letzten gültigen Slot zu überschreiben.
15. IndexedDB `error`, `abort`, Quota und blocked upgrade werden korrekt gemeldet.
16. Renderer resize/dispose erzeugt keine Listener-/GPU-Ressourcen-Leaks.
17. fehlendes oder defektes Asset führt zu beobachtbarem Contentfehler, nicht zu falschem stillen Platzhalter als finale Darstellung.
18. alle kritischen Screens per Tastatur erreichbar, Fokus sichtbar, Status nicht nur Farbe.
19. Release Build enthält keinen Dev-Overlay, Testcontent, lokale Secrets oder ungeprüfte Source Maps.
20. frischer Checkout reproduziert Build- und Tests aus Lockfile.

## 3. Coverage und Qualität

Für Domain-Logik: mindestens 90 % Statement-Coverage als Mindestsignal und 100 % der kritischen State-Machine-Übergänge/Fehlerpfade als inhaltliche Pflicht. Coverage ersetzt keine Tests. Für Renderer/UI ist Coverage allein ungeeignet; Visual-/E2E-Proofs sind erforderlich.

## 4. Evidence Bundle

Jeder Meilenstein speichert: Commit/Revision, exakte Befehle, Exitcodes, Testreports, Screenshots/Video bei optischen Änderungen, Performance-Trace, Asset-/Rights-Gate, Fehlerliste und verantwortlichen Reviewer in `docs/evidence/<milestone>/`. Keine Zugangstoken und keine privaten Nutzerinformationen.

## 5. Release-Blocker

P0/P1 Bug; Saveverlust/Korruption; ungültige Traceability/Freigabe; Doppelbuchung; kritische Compliance-Bypass; reproducible crash; Security-/Secret-Fund; unknown rights; kaputter E2E Kernloop; falsche oder irreführende UI-Status; Build nicht aus sauberem Checkout reproduzierbar.

## 6. QA Triage

P0: Datenverlust, Sicherheits-/Rechtsblocker, Kernspiel nicht nutzbar. P1: kritischer Workflow/Integrität gebrochen. P2: bedeutsamer Funktions- oder UX-Fehler ohne Datenkorruption. P3: kleiner optischer/komfortbezogener Fehler. Jeder Eintrag enthält Repro-Schritte, erwartetes/aktuelles Verhalten, Version, Impact, Belege, Owner und Retest.
