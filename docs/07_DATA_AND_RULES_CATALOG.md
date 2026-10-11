# 07 — Datenkatalog und verbindliche Startwerte

## 1. Prinzip

Inhalte sind datengetrieben. Definitionen (Content) sind unveränderliche Versionen; Laufzeit-Entitäten (State) enthalten nur veränderliche Partiedaten. Ein Content-Update darf laufende Saves nicht unkontrolliert umdeuten. Jeder Datenkatalog hat `id`, `version`, `schemaVersion` und wird beim Boot validiert.

## 2. Baseline-Spielwerte

| Parameter | Startwert | Regel |
|---|---:|---|
| Spieltag | 1 | 1.440 Simulationsminuten pro Tag |
| Startzeit | Minute 480 | Präsentation entspricht 08:00 Spielzeit |
| Zeitgeschwindigkeit | 1× | zusätzlich Pause, 2× und 4× |
| Spielgeld | 2.500.000 Cent | Präsentation als 25.000,00 EUR-Spielgeld |
| Reputation | 100/1000 | begrenzt 0–1000 |
| Compliance-Risiko | 0/100 | begrenzt 0–100 |
| Lizenzwarnung | ab Risiko 40 | konfigurierbar und versioniert |
| Lizenzsperre | ab Risiko 80 | kritische Aktionen blockieren |
| QC-Freigabe | Score mindestens 70/100 | nur Spielregel, keine reale Prüfnorm |
| Autosave | alle 30.000 ms | Schreibvorgänge werden serialisiert/coalesced |
| Domain-Tick | 20 Hz | Rendering unabhängig |
| Notification-Limit | 100 sichtbare Einträge | ältere Logs bleiben separat, UI kann filtern |

## 3. Ausgangs-Content (Spiel-Fiktion)

- `herb_alpha`: fiktives Pflanzenprofil; Spielzeitdauer 2.880 Game-Minuten; Basiswert 12.000 Cent; Qualitäts-Sensitivität 50; Modell-ID wird im Asset-Inventar hinterlegt.
- Räume: `production_room_small` (Kapazität 6; Preis 200.000 Cent; Power 12 Spiel-Energieeinheiten je Spielstunde), `processing_room_small` (Kapazität 4; Preis 250.000 Cent; Power 8), `quality_lab_small` (Kapazität 3; Preis 300.000 Cent; Power 6), `storage_small` (Kapazität 12; Preis 150.000 Cent; Power 3), `logistics_desk` (Kapazität 4 Auftragsplätze; Preis 100.000 Cent; Power 1).
- Kunden: `buyer_a` und `buyer_b`, mit ausschließlich abstrakten Zuverlässigkeits-/Qualitätsanforderungen und einer erforderlichen Reputation.
- Upgrades: `sensor_pack_1` und `drying_rack_1` sind Spielverbesserungen mit in-game Effekten. Sie dürfen keine realen Anleitungen zu Anbau, Verarbeitung kontrollierter Produkte oder Extraktion enthalten.

## 4. Wachstum/Qualität als abstraktes Simulationsmodell

Das Profil nutzt `baseDurationGameMinutes`, `stability`, `careScore`, `stressIndex`, `contaminationIndex` und `qualitySensitivity`. Zeitfortschritt entsteht aus einem vereinfachten Fortschrittswert pro Game-Tick, der aus fiktiven Modifikatoren bestimmt wird. Alle Werte werden vor Anwendung geklemmt und deterministisch berechnet. Es gibt keine realen Sollwerte zu Licht, Temperatur, Luftfeuchte, Substrat, Nährstoffen, Bewässerung, Schnitt, Ernte, Trocknung oder Inhaltsstoffausbeute.

Die Qualitätsbewertung ist ein transparentes Spielmodell: `rawScore = weighted(stability, careScore, cleanliness, timingScore) - fictionalPenalty(stressIndex, contaminationIndex)`; alle Gewichte sind in `balance.json` explizit, versioniert und per Tests abgesichert. QC-Schwelle ist eine Spielregel, keine klinische oder behördliche Empfehlung.

## 5. Wirtschaft

- Preise, Kosten und Strafen sind in Cent; Rundung erfolgt einmal am Buchungsrand.
- Kein Geld wird direkt durch UI verändert. Jede Buchung erzeugt genau einen Ledger-Eintrag mit idempotency key.
- Vertragserlös wird erst bei erfolgreicher Lieferung gebucht. Qualitäts-/Pünktlichkeitsboni sind explizite Ledger-Einträge.
- Jede Ausgabe muss den Kontostand vor Buchung prüfen. Kreditlinie ist standardmäßig 0; falls das Design später Kredite einführt, wird es als expliziter Contract ergänzt.
- Tagessummen sind aus Ledger-Einträgen abgeleitet und in Tests mit dem Ledger abgeglichen.

## 6. Ressourcen

Energie, Kapazität, Mitarbeitereffektivität, Wartung und Inventar sind abstrahierte Spielressourcen. Sie müssen zur Wirtschaft passen und können nicht unter Null fallen. Keine Systemkomponente darf unendlich Material, Kapazität oder Geld erzeugen.

## 7. Datenvalidierung

Beim Boot: JSON parse → Schema validieren → Referenzen/IDs auf Eindeutigkeit prüfen → Abhängigkeitsgraph validieren → Wertebereiche prüfen → erst dann Spiel starten. Ein ungültiger Content-Datensatz stoppt den Build oder zeigt beim Dev-Boot einen klaren Fehler mit Dateipfad und Feld. Keine stillen Defaults für fehlerhafte Produktionsdaten.