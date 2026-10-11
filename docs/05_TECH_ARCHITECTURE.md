# 05 — Technische Zielarchitektur

## 1. Architekturentscheidung

Das Produkt wird als browserbasiertes TypeScript-Spiel mit einem lokalen, geschichteten Runtime-Monolithen gebaut. Die Schichten sind entkoppelt, aber für das erste Release nicht in verteilte Dienste aufgeteilt. Clientseitige Speicherung ist für lokale Einzelspieler-Partien vorgesehen; Online-Konten, Cloud-Synchronisierung und Echtgeldfunktionen gehören nicht zur Release-Baseline.

**Stack-Kanon:** Vite, TypeScript im Strict-Modus, Three.js für Welt/3D, PixiJS für Management-UI, Rapier nur für erforderliche Kollisionen/Interaktionsabfragen, IndexedDB für versionierte Save-Slots. Der konkrete aufgelöste Dependency-Stand wird durch die Lockdatei festgeschrieben und vor Release auf Sicherheit, Lizenz und Browser-Kompatibilität geprüft.

## 2. Schichten und Regeln

1. **App/Runtime:** Bootstrap, Fehlergrenzen, Runtime-Lifecycle, feste Simulationsschritte, Screen-/Scene-Lifecycle.
2. **Domain/Simulation:** deterministische, überwiegend reine TypeScript-Funktionen. Keine DOM-, Renderer-, Netzwerk- oder Storage-Imports.
3. **State:** eine Quelle der Wahrheit; Commands/Reducer bzw. Domain-Service liefern validierte Folgezustände. Keine zweite Kopie von Geld, Bestand, Lizenz oder Auftragsstatus in UI-Objekten. Geldsaldo und Umsatz-/Kosten-Summen werden aus dem Ledger abgeleitet.
4. **Engine:** Three.js, Kamera, Input, Scene graph, Assets, Audio und Rapier. Engine-Objekte sind abgeleitete Laufzeitrepräsentationen.
5. **UI:** PixiJS liest State über Selectors und sendet Commands. Sie entscheidet nicht über QC, Bestände, Preise, Lizenz oder Produktion.
6. **Persistence:** IndexedDB-Repository mit Schema, Snapshot, Migration, Validierung, Backup/Recovery und Fehlerzuständen.
7. **Content/Data:** JSON/TypeScript-Content mit Schema-Validierung und Versionsnummern.
8. **Observability/Dev:** strukturierte Diagnose, Performance-Overlay nur in Dev-Builds, nachvollziehbare Fehler und reproduzierbare Test-Szenarien.

## 3. Tick- und Ereignisreihenfolge

Simulation läuft mit einem festen Schritt von 1/20 Sekunde (20 Hz) und einem begrenzten Accumulator. Rendering läuft nach eigener Frame-Frequenz. Lange Browserpausen werden nicht als unbegrenzter `dt`-Sprung simuliert; Hintergrundverhalten ist ausdrücklich definiert und getestet.

Kanonische Simulationstakt-Reihenfolge:
1. Simulationszeit und Tagesgrenzen fortschreiben.
2. Facility-Verfügbarkeit und Ressourcenbuchung aktualisieren.
3. Pflanzen-/Produktionseinheiten mit rein fiktionalen abstrakten Regeln aktualisieren.
4. Staff-Aufgaben und Arbeitsfortschritt auflösen.
5. Verarbeitungsaufträge und Batch-Übergänge ausführen.
6. QC-/Compliance-Regeln auswerten.
7. Bestandsreservierungen, Auftragsfristen und Lieferungen aktualisieren.
8. Ledger-Einträge und abgeleitete Wirtschaftswerte festschreiben.
9. deterministisch sortierte Domain-Events veröffentlichen.
10. UI-Selectoren invalidieren und Renderzustand aktualisieren.

Domänenreihenfolge und RNG-Aufrufe müssen fest sein. Ein Frame-Delta ändert niemals unmittelbar Fachzustände; es steuert nur den Fixed-Step-Accumulator.

## 4. Determinismus

- Domänenzeit statt `Date.now()`.
- Zufall nur über versionierten Seed/RNG.
- Keine `Math.random()` in fachlicher Logik.
- Sortierkriterien bei mehreren gleichzeitig fälligen Ereignissen sind stabil: Simulationszeit, Prioritätsklasse, Entity-ID, Event-ID.
- Geld intern in Integer-Cents; Qualität/Risiko in Integer-Punkten oder klar spezifizierten Fixpunktwerten.
- Speicher- und Replay-Tests müssen denselben Input-/Command-Stream zum identischen fachlichen State führen.

## 5. Fehlerbehandlung

- Fehler werden in Kategorien eingeteilt: Nutzungsfehler, ungültiger Domain-Command, persistenter Speicherfehler, Asset-/Renderer-Fehler, unerwarteter Runtime-Fehler.
- Domain-Commands schlagen atomar fehl: keine halben Buchungen.
- Renderfehler dürfen den persistenten Spielstand nicht korrumpieren.
- Save-Fehler zeigen sichtbaren Zustand, behalten den letzten gültigen Snapshot und bieten kontrollierten Retry/Export.
- Kein leeres `catch {}`. Jeder gefangene Fehler wird behandelt oder mit Kontext erneut geworfen.

## 6. Performance-Ziele (Release-Gates)

Zielgeräte und Browser werden in Phase 0 konkret aufgelistet und per CI/QA getestet. Als Standard-Ziele gelten auf dem vereinbarten Mindestgerät bei einer definierten mittleren Szene: 60 FPS als Ziel, 30 FPS als harte Mindestgrenze, p95 CPU-Framezeit unter 33,3 ms, UI-Interaktion p95 unter 100 ms, initiale komprimierte Downloadgröße mit Budget pro Asset-Kategorie. Keine behaupteten Werte ohne Messprotokoll. Schlechtes Gerät? Qualität dynamisch reduzieren, nicht Simulationsergebnisse ändern.

## 7. Nichtziele

Kein Multiplayer, kein Backend-Konto, kein Echtgeld-/Token-/Wallet-System, keine realen Produktionsrezepturen und keine reale Betriebssoftware für Arzneimittelherstellung. Diese Bereiche benötigen jeweils eigene Produktentscheidung, Rechtsprüfung und Architekturfreigabe; sie werden nicht stillschweigend ausgebaut.