# 08 — Modulverträge und Eigentümerschaft

## 1. Regeln

Jedes Modul hat genau einen fachlichen Eigentümer, benannte Inputs, Outputs, Fehlercodes, Tests und Persistenzverantwortung. Dateien dürfen nicht parallel von mehreren Agenten geschrieben werden, sofern der Coordinator das exakte Shared-File-Handoff nicht ausdrücklich vorgibt. Layer-Importe laufen nur in Richtung Domain-Abhängigkeiten; die Domäne importiert nie UI/Engine/Storage.

## 2. Module

| Modul | Verantwortet | Darf nicht | Öffentliche Oberfläche |
|---|---|---|---|
| `app/runtime` | Boot, Lifecycle, Clock Accumulator, Shutdown | fachliche Spielregeln duplizieren | `createRuntime`, `start`, `stop`, `dispose` |
| `domain/commands` | Command-Prüfung und atomare Transitionen | DOM/Storage/Renderer importieren | `executeCommand(state, command, deps)` |
| `domain/simulation` | fester Tick und Systemreihenfolge | UI rendern/Save schreiben | `stepSimulation(state, inputs, balance)` |
| `domain/production` | SourceLot, Plant, Batch, Verarbeitung | QC umgehen | typisierte Transitionen |
| `domain/quality` | spielinterne Assessments | Ergebnisse verändern, um QC zu erzwingen | `assessBatch` |
| `domain/compliance` | Risiko, Audit, Blocks, Violations | stillschweigend State reparieren | `evaluateCompliance`, `authorizeOperation` |
| `domain/logistics` | Aufträge, Reservierungen, Versand, Empfang | Bestand doppelt abbuchen | idempotente Transaktionen |
| `domain/economy` | Ledger, Preise, Ausgaben | Kontostand neben Ledger führen | `postLedgerEntry`, Selector-Funktionen |
| `state/store` | State-Revision, Subscriber, Command Dispatch | eigene Fachregeln erfinden | `getState`, `dispatch`, `subscribe` |
| `persistence/indexeddb` | Transaktionen, Slots, Backups, Migrationen | Save als gültig annehmen, ohne Prüfung | `SaveRepository` |
| `engine/three` | Scene, Asset-Instanzen, Kamera, Licht | Domain-Status speichern | `createWorldView`, `syncWorldView` |
| `engine/rapier` | erforderliche Kollisionen/Interaktionsabfragen | Pflanz-/Qualitätsmechanik simulieren | `PhysicsAdapter` |
| `ui/pixi` | HUD, Panels, Charts, Alerts, Commands | fachliche Werte autonom berechnen | `mountUI`, `disposeUI` |
| `content` | Content-Lader/Schemas/Referenzprüfung | ungültigen Content überspringen | validierte versionierte Kataloge |
| `telemetry/dev` | strukturierte lokale Diagnosen und Dev-Overlay | unnötige persönliche Daten sammeln | `Logger`, `PerfSnapshot` |

## 3. Fehlercode-Katalog

Commands liefern einen geschlossenen Code aus dem Contract oder einen ergänzten, dokumentierten Code: `INVALID_PAYLOAD`, `STALE_REVISION`, `NOT_FOUND`, `INVALID_TRANSITION`, `INSUFFICIENT_FUNDS`, `INSUFFICIENT_STOCK`, `CAPACITY_EXCEEDED`, `QUALITY_GATE_FAILED`, `COMPLIANCE_BLOCKED`, `TRACEABILITY_INCOMPLETE`, `DUPLICATE_COMMAND`, `PRECONDITION_FAILED`. Jeder Code muss eine sichtbare Nutzerreaktion oder einen eindeutig dokumentierten internen Behandlungspfad haben.

## 4. UI-Vertrag

UI darf Commands auslösen, aber erhält nach erfolgreichem Dispatch nur die neue Revision und bestätigte Events zurück. Optimistische UI-Änderungen dürfen nie als persistierter Domain-Status ausgegeben werden. Selektoren sind reine Funktionen und enthalten keine Nebenwirkungen. Eine Panelansicht darf nie selbst Bestandsmenge, Score, Risiko oder Erlös mit abweichender Formel berechnen.

## 5. Persistence-Vertrag

Repository arbeitet mit Slot-ID und validiertem Save-Envelope. Write-Serialisierung und Revision verhindern Rennen. IndexedDB-TX wird anhand `oncomplete`, `onerror` und `onabort` abgeschlossen. Ein Transaktionsobjekt besitzt keine erfundene `done`-Property. Slot-Import wird zunächst in Quarantäne geschrieben, validiert und erst dann in einen aktiven Slot übernommen.

## 6. Engine-Vertrag

Three.js und PixiJS bekommen ihre eigenen Canvas-/DOM-Hosts mit expliziter Z-Order, DPR-/Resize-Regelung und Dispose. Rapier wird lazy initialisiert und nur für notwendige Weltinteraktionen genutzt. Ein fehlerhafter 3D-Asset-Load darf keine Domain-State-Änderung auslösen.