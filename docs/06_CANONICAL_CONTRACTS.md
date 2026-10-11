# 06 — Kanonische Contracts

Dieses Dokument und `contracts/*.ts` bilden den einzigen kanonischen TypeScript-Vertrag. Alte Chat-Snippets und frühere Skeletons sind nicht autoritativ. Bei Widerspruch gilt diese Reihenfolge: Rechts-/Sicherheitsgrenzen → diese Contracts → Architektur → GDD → Tasks → alte Implementierung.

## 1. ID- und Zahlenregeln

IDs sind opake Strings mit Präfix und generiertem Suffix. IDs werden an der App-Grenze erzeugt und als Command-Payload übergeben, nie innerhalb reiner Reducer. Domain-Werte sind validierte, endliche Zahlen. Geld = ganzzahlige Cent. Zeit = nichtnegative ganzzahlige Simulationsminuten. Score = ganzzahlige Punkte 0–100. Risiko = 0–100. Reputation = 0–1000.

## 2. GameState als Snapshot

`GameState` muss vollständig serialisierbar sein: keine `Map`, `Set`, `Date`, Funktionen, DOM-/Three-/Pixi-/Rapier-Objekte oder Klasseninstanzen. Indexierung erfolgt intern über Dictionaries oder geordnete Arrays mit explizit dokumentierter deterministischer Iteration. UI-Fokus und Fensterposition können getrennt persistiert oder bewusst nicht persistiert werden.

## 3. Command-Vertrag

Ein Command ist eine Absicht, kein beliebiger State-Patch. Jeder Command enthält eine eindeutige `commandId`, `actorId`, den erwarteten Save-/State-Revision-Kontext soweit erforderlich und einen typisierten Payload. Der Handler gibt entweder `{ ok: true, state, events }` oder `{ ok: false, error }` zurück. Ein ungültiger Command verändert keinerlei Zustand.

## 4. Event-Vertrag

Domain-Events sind typisiert, nur nach erfolgreichem Commit publiziert und nach stabiler Ordnung verarbeitet. Jeder Event enthält `eventId`, `simulationMinute`, `schemaVersion`, `type`, `entityId` und minimale typisierte Nutzdaten. Events sind ein Integrations-/Audit-Mechanismus; sie ersetzen nicht den State.

## 5. Save-Vertrag

Envelope: `format`, `schemaVersion`, `gameVersion`, `savedAtRealTime` (nur Metadatum), `revision`, `rngState`, `payload`, `checksum`. Vor dem Laden: Envelope validieren → kompatible Migration anwenden → gesamten Domain-State validieren → nur bei Erfolg atomar als aktiven State übernehmen. Fehlerhafte Saves werden nicht stillschweigend mit Defaults überschrieben.

## 6. Öffentliche Schnittstellen

Alle Systeme exportieren explizite Ein-/Ausgabetypen. Keine `any`, keine offenen `Record<string, any>`-Patches, keine UI-Strings als Domain-Zustände. Jede Contract-Änderung braucht Migrationsplan, Tests und Änderungseintrag im Decision Log. Das Erweitern einer Union ist ein Breaking Change, wenn es bestehende Save-Daten/Consumers ungültig machen kann.

## 7. Pflichtdateien

- `contracts/domain.ts` — State- und Entitätstypen.
- `contracts/commands.ts` — erlaubte State-Änderungsabsichten.
- `contracts/events.ts` — publizierte Domain-Events.
- `contracts/persistence.ts` — Save-Envelope/Repository-Interfaces.
- `schemas/*.schema.json` — maschinenlesbare Validierung statischer Daten/Saves.

## 8. Abnahme

Typecheck mit `strict` muss null Fehler melden. Contract-Test muss ungültige Payloads zurückweisen. Domain-Tests müssen beweisen, dass ungültige Commands Zustand und Ledger unverändert lassen. Ein Agent darf nicht ersatzweise einen schwächeren Paralleltyp definieren.