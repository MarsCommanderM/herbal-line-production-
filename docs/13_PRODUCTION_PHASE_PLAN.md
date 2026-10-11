# 13 — Master-Produktionsphasenplan: Gedanke bis Release

**Ziel:** Jede Phase hat einen Eingang, umsetzbare Aufgaben, greifbare Artefakte, Abhängigkeiten, Beweise und ein hartes Gate. Ein Übergang ohne erfüllte Kriterien ist gesperrt. Kalenderdauern sind keine Qualitätskriterien; Umfang und Gates bestimmen den tatsächlichen Fortschritt.

## Phase 0 — Repository Truth Audit
**Ziel:** feststellen, was real existiert, bevor etwas geändert wird.  
**Inputs:** aktueller Checkout, Arbeitsbaum, Git-Metadaten, Builds, Tests, vorhandene Assets/Dokumentation.  
**Aufgaben:** Root/Branch/HEAD/Remote prüfen; Dirty-State aufnehmen; Worktree prüfen; Package-Manager/Lockfile erkennen; Install-/Build-/Test-Baseline ausführen; alte, unvollständige, doppelte oder widersprüchliche Dateien inventarisieren; unbekannte Assets und Secrets suchen, ohne Secrets auszugeben.  
**Outputs:** `docs/audits/BASELINE.md`, Datei-/Modulkarte, Testbaseline, offene Risikoliste.  
**Gate:** Pfad/Branch/HEAD sind belegt; Nutzeränderungen gesichert; Baseline-Fehler klassifiziert. Kein Blind-Overwrite.  
**Rollback:** keine Codeänderungen; falls Audit-Script neue Outputs erstellt, diese auf auditierte Verzeichnisse begrenzen.

## Phase 1 — Produktidentität und Scope Lock
**Ziel:** Produkt, Rechte-Metadaten, Ziele/Nichtziele sowie Zielplattform einfrieren.  
**Aufgaben:** Vision, Zielgruppe, Core-Promise, Genre, Spielmodi, Zielgeräte/Browsersupport, Zielqualitätsniveau, Nichtziele, Title/Brand/Metadata festlegen; funktionale und nichtfunktionale Anforderungen nummerieren; offene Entscheidungen im Decision Log.  
**Outputs:** Vision/GDD, Scope-Register, Release-Pflichtenheft, Risiko-/Entscheidungslog.  
**Gate:** jede Release-Funktion ist als Requirement identifiziert; Produktdefinition widerspruchsfrei.  
**Abhängigkeit:** Phase 0.

## Phase 2 — Vollständiges Gameplay- und UX-Design
**Aufgaben:** Session-, Day-, Core-, Meta-, Reward-, Fail- und Recovery-Loops; User-Flows; Spielregeln; Onboarding; Anforderungen an Warnungen, Reports, Accessibility und Fehlersituationen; Feature-Akzeptanzkriterien.  
**Outputs:** GDD, Flowdiagramme, Feature-Spezifikation, Game-Terminologie und Text-Glossar.  
**Gate:** alle Spieleraktionen haben Vorbedingungen, Ergebnis, Feedback, Folgen und Error-State.

## Phase 3 — Domain-Modell und State-Machines
**Aufgaben:** Entitäten, IDs, Relationen, State-Machines, invariants, Commands, Events, Traceability, Ledger, RNG, Zeiteinheiten, Status-/Error-Codes und Save-Revisions spezifizieren.  
**Outputs:** `contracts/`, `schemas/`, Domain-Diagramme, Transition-Tabellen, Contract-Tests.  
**Gate:** kein fachlicher State ohne Eigentümer; keine unbestimmten Übergänge; negative Pfade festgelegt.

## Phase 4 — Technisches Fundament und CI
**Aufgaben:** Vite/TS-Strict/Lockfile, modulare Imports, Lint/Format/Typecheck/Test/Build, CI-Checks, Content-Schemas, Logging, Error Boundary, Dev-Tooling, deterministischer RNG, Fixed-Step-Clock.  
**Outputs:** reproducible build, CI Workflow, package scripts, developer docs, test harness.  
**Gate:** frischer Checkout installiert mit gepinntem Lockfile; typecheck/lint/tests/build reproduzierbar grün; keine leeren Kern-Scripts.

## Phase 5 — Production-Quality Vertical Slice
**Ziel:** vollständige erste Spielschleife auf finalem Qualitätsniveau, kein Graukasten.  
**Aufgaben:** ein vollständig gestalteter Raum; echte/interne freigegebene Assets, Licht/Materialien; Startmaterial-Annahme im Spiel, abstrakter Simulationszyklus, Batch, QC, Auftrag, Lieferung, Auszahlung, Audit-Trace, Save/Load und fertiges UI für diesen Slice.  
**Outputs:** spielbarer Slice, Replay-Szenario, Screenshot-/Video-Proof, E2E-Test.  
**Gate:** neuer Spielstand bis Lieferung und Neustart/Wiederherstellung erfolgreich ohne manuelle Dev-Hacks.  
**Explizit nicht erlaubt:** unansehnliche Platzhalterwelt als angebliche finale Optik; „fertig“-Labels für nicht funktionierende Features.

## Phase 6 — Facility- und Welt-System
**Aufgaben:** Räume, Kapazität, Platzierung, Navigation, Kamera, Maschinen, Ressourcen und Wartung; Three.js Objekt-/Asset-Lifecycle; Rapier nur für benötigte Kollision/Interaktion.  
**Gate:** gültige Platzierung, Kapazitätsgrenzen, Raumwechsel, resize/dispose und Performance bestehen Tests.

## Phase 7 — Abstrakte Pflanzen-/Einheiten-Simulation
**Aufgaben:** Profile, Fortschritt, Health/Vitality, Stress/Qualitätspotenzial, Umgebungs-Stabilitätsindex, Zustandswechsel, Ablehnung und Wiedergutmachung als fiktionale Regeln.  
**Gate:** deterministische Simulation mit reproduzierbaren Tests; keine realen Produktionsparameter oder realen Rezepturen; alle Übergänge/Bounds geprüft.

## Phase 8 — Batch, Verarbeitung und Inventar
**Aufgaben:** Eingangsmaterial-Lose, Batchbildung, Prozesswarteschlangen, Zimmer-/Maschinenkapazität, Inventarlots, Reservierung, Sperr-/Freigabe-/Ablehnungszustände, trace events.  
**Gate:** Mengenbilanz stimmt, keine doppelten/weder-noch Bestände, Trace-Kette komplett, sämtliche Fehlerpfade getestet.

## Phase 9 — Qualität und Compliance
**Aufgaben:** spielinternes QC-Regelset/Version, Assessments, Freigabe/Rejection, Audits, Lizenzwarnung/-sperre, Verstoßregistrierung und Recovery Review.  
**Gate:** kein Versand vorbei am QC-/Lizenz-Gate; Audit kann jeden relevanten Schritt rekonstruieren; Ergebnisse reproduzierbar.

## Phase 10 — Orders, Lieferung und Apotheker-Kundenfluss
**Aufgaben:** Kundenprofile, Bestellung, Annahme, Allokation, Deadline, Kommissionierung, Route, Auslieferung, Zustellnachweis, Ausnahmefall, Wiederholungs-/Idempotenzregeln.  
**Gate:** keine Überallokation, keine Doppelzustellung/-abrechnung, lückenlose Verknüpfung Auftrag → Lots → Lieferung.

## Phase 11 — Wirtschaft, Personal, Erweiterung
**Aufgaben:** Cent-basierter Ledger, Einnahmen/Kosten, Strom-/Betriebskosten, Löhne, Wartung, Investitionen, Skills/Energie, Aufgabenplanung, Upgrades, Reputation, Expansion, Progression und Endgame-Sinks.  
**Gate:** Ledger-Summen stimmen; keine unerklärten Geldquellen/-senken; alle Ressourcen/Skills sind spielrelevant; Balancing-Simulationen dokumentiert.

## Phase 12 — Vollständiges UI/UX
**Aufgaben:** alle definierten Screens, Panel-Navigation, Inspector, Charts, Notifications, Modals, Settings, Rebinding/Steuerung, Fokus, Texte, Erklärung blockierter Aktionen, Tastatur-/Mausfluss, Responsive/Layout und Reduced Motion.  
**Gate:** kein Core-Command ohne passenden Bedienpfad; keine Darstellung von spekulativem State; Tastaturzugang für Kernoperationen; kritische Meldung nicht nur über Farbe.

## Phase 13 — Persistence und Recovery
**Aufgaben:** IndexedDB Slots, Save Envelope, Schema validation, Migrationen, Snapshotting, Write serialization, Integrity/checksum, import/export, corruption recovery, autosave, manual save, save error/retry, recovery UI.  
**Gate:** Restart, Migration, corrupter Save, quota/write failure, doppelter Save-Request und parallele Save-Anforderung getestet. Es gibt immer einen erklärten sicheren Fehlerzustand.

## Phase 14 — Finale Kunst, Animation und Audio
**Aufgaben:** alle Asset-IDs mit finalen freigegebenen Assets besetzen, PBR/material consistency, Licht, Shadow, VFX, UI-Microinteractions, Audio mix, accessibility, Zielgerätoptimierung.  
**Gate:** keine Platzhalter; Asset-/Lizenzmanifest vollständig; echte Build-Screenshots, Performance- und Visual-QA-Protokoll vorhanden.

## Phase 15 — Content, Tutorial und Balancing-Freeze
**Aufgaben:** gesamte freigegebene Content-Menge, Kunden, Aufträge, Räume, Upgrades, Incident Events, Tutorials, UX-Texte, Hilfen, Credits, Localization; Economy-Simulation über frühe, mittlere und späte Spielphase.  
**Gate:** alle IDs/Referenzen/Übersetzungskeys korrekt; keine unzugänglichen Unlocks, Deadlocks oder unendlichen Exploits in getesteten Szenarien.

## Phase 16 — Release-Candidate QA, Security und Rights Audit
**Aufgaben:** Unit/Integration/E2E/Regression, Accessibility, performance, save compatibility, Dependency Audit, Secret Scan, source/license inventory, brand/IP risk review, privacy/data review, error monitoring and installation tests on clean devices.  
**Outputs:** Release Candidate, SBOM/dependency inventory, QA evidence, rights register, blocker report.  
**Gate:** null P0/P1; null unbekannte Assets/Lizenzen; null kritische Sicherheitsprobleme; alle required checks grün; Testergebnisse frisch vom finalen Commit.

## Phase 17 — Release Build und Rollout-Vorbereitung
**Aufgaben:** Version/Changelog, clean install/build, artifact hash, deployment configuration, content/signature integrity, rollback plan, support/incident owner, release notes and legal credits.  
**Gate:** Release-Artefakt identisch mit getesteter Revision, reproduzierbarer Build wo technisch möglich, Rollback geprüft, keine versehentlichen Debug-/Testdaten.

## Phase 18 — Launch, Beobachtung und Betrieb
**Aufgaben:** kontrollierter Rollout, Smoke-Test live, Fehler-/Crash-/Save-Fehler prüfen, Incident-Prozess, Release-Kommunikation, Hotfix-Verifikation.  
**Gate:** Hauptloop, Speicherung, Wiederherstellung und Kernbedienung auf veröffentlichtem Artefakt verifiziert.

## Phase 19 — Post-Launch und nachhaltige Pflege
**Aufgaben:** Bug-Triage, Daten-/Performance-Reviews, Balance-Patches, kompatible Save-Migrationen, Security-/Dependency-Updates, Communityfeedback, Roadmap und Postmortems.  
**Gate:** jede Veröffentlichung durchläuft die gleichen obligatorischen Qualitäts-, Lizenz- und Save-Kompatibilitätschecks; kein unversioniertes Live-Balancing.

## Globales Gate für jede Phase

Eine Phase ist nur dann abgeschlossen, wenn: Outputs vorhanden, Akzeptanzkriterien automatisiert oder mit reproduzierbarem manuellen Protokoll geprüft, keine unaufgelösten P0/P1, Doku/Taskstatus aktualisiert, Diff überprüft und der Hauptagent schriftlich freigegeben hat. „Alle Dateien angelegt“ und „Typecheck grün“ allein genügen nicht.
