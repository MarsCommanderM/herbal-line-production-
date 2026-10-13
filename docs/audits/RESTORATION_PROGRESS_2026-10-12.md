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

## Verifizierter CI-Baseline-Stand

Commit `db6eb92e27f10177fad42d7e6597345a77a2f773`:
- [DopeFarm CI 38348389937](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38348389937): **SUCCESS**. Locked install, Source-Lint, Formatcheck, strikter TypeScript-Typecheck, Domain-Tests, Produktionsbuild, Chromium/Firefox/WebKit-E2E, Preview-Smoke, Master-Pack-Validierung, Source-Snapshot-Check, Produkt-Policy-Validierung und Whitespace-Check sind alle erfolgreich.
- [Master Pack Validation 38348394537](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38348394537): **SUCCESS** auf demselben SHA.
- [PR-getriggerter Duplikatlauf 38348394747](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38348394747): ebenfalls **SUCCESS** auf demselben SHA.
- Die Browser-E2E umfasst jetzt auch eine Regression, die nach Import eines älteren Spielstands verwaiste propagierte Pflanzen- und Stecklingsmeshes prüft.
- Frühere fehlgeschlagene/abgebrochene Läufe gehören zu älteren SHAs und werden nicht als Ergebnis des Baseline-SHA gezählt.

## Noch offene Release-Gates

1. Die nächste E2E-Erweiterung deckt alle fünf fiktiven Pflegeeinstellungen, Beschneiden, Stecklingschnitt, sichtbares Feedback und Save/Reload ab. Der dadurch entstehende neue Commit benötigt seine eigene vollständige grüne CI.
2. Nicht belegte Wirtschafts-/Progressionswerte bleiben offen; keine Upgradepreise, Effekte, XP-/Levelregeln oder Unlock-Schedules erfinden.
3. Finale Produktionskunst, Audio, Asset-Pipeline, Lizenz-/Provenienzregister und Rechteprüfung fehlen noch; der prozedurale Third-Person-Avatar ist ausdrücklich ein Platzhalter.
4. Persistenz-Fault-Injection (Quota, abgebrochene Transaktionen), Migration und browserübergreifende Recovery weiter ausbauen; negative Pfade für Compliance, gehaltene Bestände und doppelte Finanz-/Lieferereignisse ergänzen.
5. `main` bleibt unverändert, bis die aktuelle Revision vollständig grün ist und verbleibende Release-Blocker abgeschlossen oder ausdrücklich akzeptiert wurden. Die historischen Archivabweichungen sind klassifiziert; eine 1:1-Parität des aktiven Roots wird nicht behauptet.

## Statusregel

Ein Task gilt nur als DONE, wenn die Implementierung existiert, Tests ausgeführt wurden, das Ergebnis auf den exakten Commit verweist und keine offenen P0/P1-Fehler verbleiben. Laufende, abgebrochene oder übersprungene Jobs sind nicht bestanden.
