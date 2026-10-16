# Contribution & Change-Control Policy

1. Alle Änderungen müssen zu `AGENTS.md`, dem Master Production Document und den kanonischen Contracts passen.
2. Jede Funktion gehört genau einem Domain Owner; UI und Renderer besitzen keine fachlichen Regeln.
3. Contract-Änderungen erfolgen zuerst in `contracts/` und `schemas/`, danach in Implementierung und Migrationen. Abhängige Agents werden im Taskboard koordiniert.
4. Ein Task enthält konkrete Veränderung, Dateien/Pfade, Abhängigkeiten, Tests und Akzeptanzkriterien.
5. Änderungen mit negativer Kompatibilitätswirkung benötigen Migration, Recovery-Plan und Regressionstests.
6. Commit-Nachrichten sind sachlich, enthalten einen Task-Bezug und behaupten keine nicht ausgeführten Tests.
7. Keine Assets oder Abhängigkeiten ohne Lizenznachweis einführen. Rechte-Register aktualisieren.
8. Keine personenbezogenen oder geheimen Daten in Spielstände, Telemetrie, Issue-Text oder Logs aufnehmen.
9. Integration erfolgt gegen den echten gemeinsamen Stand. Ein grüner Teiltest ist kein Beweis für einen grünen Gesamtbuild.
10. Ein Review beantwortet: Verhalten, Datenfluss, Invarianten, Fehlerfälle, Testbelege, Rechte, Risiken und Rollback.
