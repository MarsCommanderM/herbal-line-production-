# Dr. Green Dump / DopeFarm — Wiederherstellungs- und Produktionsstatus

**Stand:** 2026-10-12  
**Arbeitsbranch:** `restore/original-masterpack-product-scope-20261012`  
**Produktname:** Dr. Green Dump / DopeFarm  
**Produktumfang:** legales, kontrolliertes Management einer streng regulierten medizinischen Cannabis-Pflanzenproduktion mit sichtbaren Pflegeaktionen.

## Verbindliche Scope-Entscheidung

Die aktuelle ausdrückliche Produktvorgabe des Auftraggebers hat Vorrang vor älteren Chat-/Dokumentfassungen und dem historischen Archivnamen. Das Spiel heißt **Dr. Green Dump / DopeFarm**, nicht Herbal Line, Botanical Operations oder Kräuterlinienproduktion.

Der Spieler steuert Anbau, direkte und sichtbare Pflanzenpflege (Bewässerung, Licht, fiktive Temperatur-/Luftfeuchtigkeitssteuerung, Nährstoffpflege, Beschneiden sowie Stecklinge schneiden/setzen), simulierte Verarbeitung, Qualitätssicherung, Lager, Logistik und Auslieferung an Apotheken. Die Apotheken selbst werden nicht betrieben oder simuliert. Alle Werte und Effekte sind erfundene Spiel-Balancewerte; keine realen Kultivierungs-Sollwerte oder Anleitungen.

## Archiv-Provenienz und korrekte Paritätsaussage

- Geliefertes historisches ZIP: `Herbal-Line-Production-Master-Pack.zip`.
- Dokumentierter SHA-256: `4e783542951f573ed7412444e9e2ed00c490a9b7919f67c30399b86297a4b8972`.
- Ursprüngliche Datei-/ZIP-Prüfung: 42 Dateien; ZIP-Integrität bestand.
- Der Archivname und ältere Archivtexte werden als Provenienz dokumentiert, nicht als aktueller Spieltitel.
- Eine 42/42 Blob-Übereinstimmung wurde auf einem früheren Branch-Zwischenstand gemeldet. **Sie gilt nicht als Paritätsaussage für den aktuellen Branch**, weil spätere, ausdrücklich bestätigte Produktnamen- und Inhaltskorrekturen Inhalte geändert haben.
- Aktuelle volle Archivparität wird nicht behauptet. Das Archiv bleibt über den dokumentierten Hash identifizierbar; ein Paritätsreport muss absichtliche, vom Auftraggeber bestätigte Abweichungen klar von ungeklärten Abweichungen trennen.

## Tatsächlich überprüfter Ausgangsstand

Ausgangsrevision vor dem nächsten gebündelten Richtlinien-/E2E-Patch: `c9116b8b65f4ce9d59b8f1dc54cfabe3c8bc3f38`.

Beobachtete Aktionen in GitHub Actions auf diesem Ausgangsstand:
- [Master-Pack-Validierung 38305545140](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38305545140): **PASS**.
- [App-CI 38305545109](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38305545109): Install, Lint, Formatcheck, Strict Typecheck, Domain-Tests und Produktionsbuild waren erfolgreich; Browser-E2E war bei der letzten Abfrage noch aktiv.
- [Zweiter App-CI-Lauf 38305540569](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38305540569): gleicher Zwischenstand, Browser-E2E war ebenfalls noch aktiv.

Das ist **kein** bestätigtes Gesamt-CI-PASS. Frühere rote Typecheck-Läufe gehören zu älteren Commits und sind historische Befunde, keine Aussage über die letzten abgeschlossenen Schritte.

## Korrekturen im gebündelten Richtlinien-Patch

- CI-Workflow-Namen auf Dr. Green Dump / DopeFarm umgestellt.
- App-CI löst nicht mehr zusätzlich auf jedem Feature-Branch-Push aus; verbindliche Ausführung erfolgt für PRs gegen `main`, auf `main` und manuell.
- E2E-Heading-Erwartung auf den aktuellen Spielnamen ausgerichtet.
- README, Manifest, AGENTS, Rechtehinweis, Content-Register und UI-Bezeichnungen auf eine gemeinsame Produktdefinition ausgerichtet.
- Generische Profil-/Auftragsbezeichner in der sichtbaren Produktstrecke bereinigt.
- Überholte CI-/Paritätsaussagen in Auditdokumenten werden als historisch gekennzeichnet, nicht als aktueller Status ausgegeben.

## Noch offene Release-Gates

1. Den gebündelten Commit durchlaufen lassen: Source-Lint, Format, Typecheck, Unit-Tests, Produktionsbuild, Browser-E2E, Preview-Smoke, Pack-Validierung und Whitespace-Check.
2. Die E2E-Ergebnisse untersuchen und alle neuen Fehler auf demselben Branch korrigieren.
3. Sichtbare Pflegeaktionen vollständig im Domain-State, in UI/3D-Feedback, Logs, Save/Load und Tests integrieren; reine Dokumentation zählt nicht als Implementierung.
4. Economy-/Progression-Regeln nur anhand der autorisierten Anforderungen betreiben; nicht belegte Preise, Upgradeeffekte und XP-/Levelregeln dürfen nicht als genehmigt gelten.
5. Auf dem finalen Commit Produktnamen-/Scope-Suche, Asset-/Rechtecheck, Save-Recovery und Regressionen durchführen.
6. `main` bleibt bis Review und durchgehend grünen Pflichtgates unverändert.

## Statusregel

Ein Task gilt nur als DONE, wenn die Implementierung existiert, Tests ausgeführt wurden, das Ergebnis auf den exakten Commit verweist und keine offenen P0/P1-Fehler verbleiben. Laufende, abgebrochene oder übersprungene Jobs sind nicht bestanden.
