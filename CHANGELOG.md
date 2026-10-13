# Changelog

## [1.0.0] — 2026-10-11

- Widersprüchliche Konzept-, State-, Architektur- und Produktionspläne in ein kanonisches Masterpaket konsolidiert.
- Medizinische Cannabis-Spielwelt mit ausschließlich fiktionaler, abstrahierter Simulationslogik festgelegt.
- Agentenrollen, Parallelitätsgrenzen, Repository-Audit, DoD und Release-Gates verbindlich gemacht.
- Namens-/Copyright-Metadaten für Michael Braunschweig als Auftraggeber-Vorgabe gesetzt; Rechtekette und Markenfreigabe bleiben beweispflichtige Gates.
- Taskboard, kanonische TypeScript-Verträge, JSON-Schemas, Risiko-, Test-, Sicherheits- und Release-Dokumente aufgenommen.


## [Unreleased] — 2026-10-12

- Verbindliche Produktidentität auf **Dr. Green Dump / DopeFarm** festgelegt; ältere „Herbal Line“-/„Botanical Operations“-/Kräuter-Scope-Texte sind keine aktuelle Produktdefinition.
- Cannabis-Pflanzen, professionelle Indoor-Anlage und direkt sichtbare Pflanzenpflege als Release-Anforderung festgeschrieben.
- Pflegeinteraktionen müssen echte simulierte State-Änderungen, sichtbares Feedback, Audit-/Logeinträge und Save/Load-Verhalten besitzen; alle Werte bleiben fiktive Spiel-Balancewerte.
- Direkte Pflanzenpflege als Runtime-Commands mit UI-/3D-Feedback, fiktiven Care-Stufen und Save-/Reload-Regressionsprüfung ergänzt.
- Nicht autorisierte Energieeffizienz-Upgrades aus dem aktiven Balance-Katalog entfernt; `sensor_pack_1` und `drying_rack_1` bleiben unkonfiguriert, bis Preise/Effekte autorisiert definiert sind.
- Produktidentitäts-/Care-Contract-Validator in die verpflichtende PR-CI aufgenommen.
- CI-Namen und Trigger werden so korrigiert, dass Feature-Branch-Pushes nicht zusätzlich einen zweiten vollständigen App-CI-Lauf starten.


## CI and contract reconciliation — 2026-10-13

- The restoration branch is validated by its open pull request only; branch pushes no longer start a duplicate second full run. Production `main` pushes continue to run both workflows. Concurrency groups are keyed by PR number/ref rather than event type so superseded runs for the same target cancel consistently.
- The specification references `src/data/balance.json`, but that file is absent and runtime values are not yet centrally loaded from it. The missing source is now explicitly recorded as an implementation gap; no unsupported prices, progression thresholds or upgrade effects were added.
