# Dr. Green Dump / DopeFarm — Master Production Document

**Version:** 1.0.0 | **Stand:** 11.10.2026 | **Verantwortungsmetadaten:** Michael Braunschweig

## 1. Produktauftrag

Dr. Green Dump / DopeFarm ist ein hochwertiges Web-Managementspiel über den legalen und kontrollierten Aufbau und Betrieb einer streng regulierten medizinischen Cannabis-Pflanzenproduktion. Der Spieler steuert Anbau und ausführliche, direkt an den erkennbaren Cannabis-Pflanzen ausgeführte Pflege, simulierte Verarbeitung, Qualitätssicherung, Chargenrückverfolgbarkeit, Lager, Logistik und Auslieferung an Apotheken. Apothekeninterne Abläufe gehören nicht zum Spielumfang.

Die Welt zeigt eindeutig erkennbare Cannabis-Pflanzen in einer professionellen Indoor-Produktionsanlage mit Beleuchtung, Bewässerung, Klima-/Lüftungstechnik und sichtbaren Pflegeinteraktionen. Der Spieler kann Pflanzen im Spiel visuell kontrollieren und Pflegeaktionen auslösen, beispielsweise Bewässerung, Licht-/Klimaeinstellungen, Nährstoffversorgung, Beschneiden und Stecklingspflege. Diese Aktionen sind ausschließlich abstrahierte, erfundene Spielmechaniken; alle Zahlen, Grenzwerte und Effekte sind fiktive Balancewerte. Das Spiel enthält keine realen Kultivierungsrezepte, exakten Klimasollwerte, Nährstoffpläne, Ernte-/Aushärtungsprotokolle, Extraktionsmethoden, Herstellungsbedingungen oder realen Liefer-/Vertriebsverfahren.

## 2. Spielversprechen

- **Kontrollierbare Systemtiefe:** Jede wichtige Entscheidung hat sichtbaren Input, Effekt und Grund.
- **Qualität vor Volumen:** Überlastung kann Risiken erhöhen; Planung und Prozesskontrolle zahlen sich aus.
- **Traceability als Kernmechanik:** Jede freigegebene Charge besitzt eine nachvollziehbare Herkunfts- und Verarbeitungshistorie bis zum Kundenauftrag.
- **Regulierung mit Konsequenzen:** Dokumentationsmängel, QC-Fehler und Regelverletzungen beeinflussen fiktive Audits, Reputation und Lizenzstatus.
- **Premium-Präsentation:** 3D-Einrichtung und Managementoberfläche sind Teil der Abnahme, kein späterer Dekorationsschritt.
- **Langzeitplanung:** Raumkapazität, Bestand, Wartung, Cashflow, Schichten und Lieferfristen bilden ein zusammenhängendes Entscheidungssystem.

## 3. Verbindlicher Technikrahmen

- Vite + TypeScript Strict.
- Three.js für Welt, Räume, Anlagen, Kamera, Materialien, Licht und Rendering.
- PixiJS für HUD, Produktionsboard, Inventar, Detailpanels, Charts, Modals und Notifications.
- Rapier 3D für Kollisionen, Platzierungsvalidierung und Interaktionsabfragen; keine fachliche Simulationsquelle.
- Reine TypeScript-Domänenlogik für Simulation, Economy, Aufträge und Compliance.
- Zentraler typisierter Store mit Commands, Reducern/State transitions, Selectors und versionierten Domain-Events.
- IndexedDB als lokale Persistenz mit Save-Slots, Autosave-Queue, validierter Wiederherstellung und Migrationskette.
- Unit-, Invariant-, Integrations-, Save-/Load-, Browser-E2E-, Accessibility- und Performance-Tests.

Konkrete Versionsnummern werden anhand aktueller offizieller Releases geprüft, kompatibel festgelegt und in Lockfiles fixiert. Dieses Dokument behauptet keine erfolgte Installation oder Release-Verifikation.

## 4. Systemgrenzen

**World/Engine:** Darstellung und Bedienbarkeit, keine fachliche Wahrheit.  
**Simulation:** deterministische Regeln, Zustandsübergänge, Kosten, Bedingungen und Ereignisse.  
**Store:** einzige Runtime-Quelle für Game-State und typisierte Änderungen.  
**Content:** validierte, versionierte Konfigurationen.  
**Persistence:** serialisiert nur definierte fachliche Daten; UI-Auswahl und Renderobjekte werden nicht persistiert.  
**UI:** liest über Selectors/View Models und sendet nur zulässige Commands.  
**Audit/Trace:** persistente Ereignishistorie ist von kurzlebigen UI-Notifications getrennt.

## 5. Kernloop

1. Tages-/Schichtübersicht und Auftragstermine prüfen.
2. Räume, Kapazitäten, Personal und Betriebsmittel disponieren.
3. Eingehende Startmaterial-/Materiallose registrieren und validieren.
4. Fiktive Pflanzen- und Raumzustände überwachen und abstrakte Kontrollaufgaben ausführen.
5. Bereitschaft innerhalb der fiktiven Spielzustände prüfen und Übergabe/Ernte auslösen.
6. Verarbeitung, Verpackung und QC über Stations- und Chargenzustände führen.
7. Chargen freigeben, sperren oder verwerfen; Traceability prüfen.
8. Bestände für Kundenaufträge reservieren, Lieferfenster planen und Lieferung abschließen.
9. Erlöse, Betriebskosten, Reputation, Risiken und Tagesabschluss auswerten.
10. Gewinne in Personal, Räume, Technik, Wartung und Automatisierung investieren.

## 6. Produktabnahme

- Kernloop ist vom Spielstart bis zur Apothekenlieferung und zum nächsten Planungstag spielbar.
- Keine nicht freigegebene, nicht tracebare, zurückgerufene Charge oder Lieferung bei gesperrtem Lizenzstatus kann ausgeliefert werden.
- Gleicher Start-Save, RNG-Seed und dieselbe feste Tick-/Command-Sequenz erzeugen denselben fachlichen Endzustand.
- Save/Load erhält alle fachlich relevanten Zustände; Migrationen und Recovery sind getestet.
- Jede wesentliche UI-Aktion hat Feedback und klare Fehlerzustände.
- Keine Release-Szene enthält Blockout-Geometrie, unlizenzierte Assets, Dummy-Texte oder untätige Controls.
- 0 offene P0-/P1-Fehler; alle Pflichtgates sind belegt. P2/P3-Risiken werden dokumentiert und vom Release Owner bewertet.

## 7. Auslieferungsebenen

- **Production-quality Vertical Slice:** kompletter Gameplay-Loop mit finaler Architektur, finaler visueller Richtung, echter Speicherung und End-to-End-Tests.
- **Feature Complete:** alle verbindlichen Release-Systeme und Inhalte integriert.
- **Release Candidate:** Scope eingefroren, Build reproduzierbar, Regressionen grün, Rechte- und Sicherheitsprüfung bestanden.
- **Production Release:** veröffentlichter Build mit Deployment-/Rollbackplan, Monitoring, Supportzuständigkeit und Hotfixpfad.

Diese Labels dürfen nur nach Erfüllung ihrer Gates verwendet werden.

## 8. Feststehende Entscheidungen

- Spielname: Dr. Green Dump / DopeFarm; Plattform: Browser/Web.
- Stack: Vite, TypeScript, Three.js, PixiJS, Rapier 3D, IndexedDB.
- Projektverantwortungs-Metadaten und gewünschte Copyright-Zeile: Michael Braunschweig / Copyright © 2026.
- Welt: medizinische Cannabis-Pflanzenproduktion; Pflanzen- und Prozessmechaniken bleiben abstrahiert/fiktiv.
- Produktionsanspruch: keine Prototypen oder Blockouts als fertiges Produkt ausgeben.
- Agentenmodell: ein Lead-Agent mit 2–3 abgegrenzten Subagentenrollen.
- Externe Planungstools sind optionale Hilfsmittel, keine Laufzeitabhängigkeit des Spiels.

## 9. Beweispflichtige Punkte — keine Rückfrage

Der Agent stellt durch Audit und Prüfung fest: tatsächliche Repository-Wahrheit, Zielbrowser, Abhängigkeitsversionen, konkrete Asset-Rechte, Markenstatus von Dr. Green Dump / DopeFarm, Deploymentziel, Hardware-Baseline und Testergebnisse. Ungeklärte Rechte-/Markenfragen blockieren öffentliche kommerzielle Veröffentlichung, nicht die lokale Umsetzung abstrakter Spielsysteme.
