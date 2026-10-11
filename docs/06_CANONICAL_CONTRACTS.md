# 06 — Kanonische Contracts

Dieses Dokument und `contracts/*.ts` bilden die einzige kanonische TypeScript-Referenz. Bei Widerspruch gilt: Sicherheits-/Rechtsgrenzen → diese Contracts → Architektur → GDD → Tasks → alte Implementierung.

## 1. ID- und Zahlenregeln

IDs sind opake Strings, erzeugt an der App-Grenze. Simulationszeit sind nichtnegative ganzzahlige Simulationsminuten. Geld sind Integer-Cents. Score: 0–100; Risiko: 0–100; Reputation: 0–1000. TypeScript-Brands helfen zur Compile-Zeit; jede externe Eingabe benötigt Runtime-Validierung.

## 2. Single Source of Truth

- `GameState` ist der serialisierbare Runtime-State, enthält aber den flüchtigen `ui`-Teil nur zur Laufzeit.
- Geldbestand wird **nicht separat gespeichert**. Der Kontostand ist `openingBalanceCents` plus/minus Ledger-Einträge. Umsatz-/Kosten-Summen sind Selectors über das Ledger, keine parallel gepflegten Wahrheiten.
- Reservierte Menge ist ein eigener Zähler. `InventoryLotState.status` beschreibt die Disposition (held/released/depleted/expired/rejected), nicht den Reservierungszustand.
- Ein QC-Datensatz hat genau eine Entscheidung (`pass | fail | review`); ein zweites boolesches `passed` wird nicht geführt.
- `LicenseStatus` enthält `recovery_review`; während dieser Phase bleiben kritische Vorgänge gesperrt, bis ein expliziter Audit-/Freigabe-Command den Status ändert.

## 3. Commands

`DomainCommand` ändert fachlichen Spielzustand. `UICommand` steuert nur Auswahl/Screen. `PersistenceCommand` startet Save-Aktionen. Alle können über eine typisierte App-Gateway-Fassade laufen, dürfen aber nicht denselben fachlichen Reducer ohne Dispatch-Grenze erreichen. Jeder Command enthält eindeutige `commandId`, `actorId` und erwartete Revision. Fehlerhafte Domain-Commands verändern weder State noch Ledger.

## 4. Events

Domain-Events werden nur nach erfolgreichem Commit publiziert und stabil sortiert. Sie enthalten Event-ID, Simulationszeit, Schema-Version, Typ und minimale typisierte Nutzdaten. QC-Events verwenden dieselbe `decision`-Union wie der Assessment-Datensatz.

## 5. Save-Vertrag

SaveEnvelope enthält `format`, `schemaVersion`, `gameVersion`, `savedAtRealTime` als Metadatum, `revision`, `rngState`, `payload` und `checksum`. `payload` ist `Omit<GameState, 'ui'>`: UI-Auswahl und Notifications werden nicht persistiert und beim Laden aus sicheren Defaults neu erzeugt. Fachzustand und RNG werden vollständig gespeichert. Laden: Envelope validieren → Checksum prüfen → unterstützte Migration → vollständige semantische Prüfung aller IDs, Referenzen, Zahlen, Ledger- und Mengeninvarianten → atomare Übernahme. Fehlerhafte Saves überschreiben nie den letzten gültigen Slot.

## 6. Abnahme

Jede Contract-Änderung braucht Migrationsnotiz und Tests. Typecheck mit `strict` muss null Fehler melden. Tests müssen ungültige Payloads, illegale Übergänge, idempotente Wiederholungen und unveränderten State bei Fehlern beweisen. JSON-Syntax allein ist keine vollständige JSON-Schema-Validierung.
