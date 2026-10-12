# Dr. Green Dump / DopeFarm — Verbindliche Produktionsrichtlinie

**Status:** verbindliche Produkt- und Abnahmerichtlinie  
**Gültig ab:** 12. Oktober 2026  
**Geltungsbereich:** Repository, Spielinhalte, Code, UI, 3D-Welt, Saves, Tests, CI, Agenten und Release-Abnahme.

## 1. Unveränderliche Produktidentität

Das Spiel heißt **Dr. Green Dump / DopeFarm**. „Herbal Line“, „Botanical Operations“, „Kräuterlinienproduktion“ und eine generische botanische Betriebs-Simulation sind keine zulässigen aktuellen Produktnamen oder Ersatzvisionen. Der historische Name des gelieferten Master-Pack-ZIP bleibt ausschließlich als Dateiprovenienz erhalten.

**Verbindliche Beschreibung:**

> Ein hochwertiges Web-Managementspiel über den legalen und kontrollierten Aufbau und Betrieb einer streng regulierten medizinischen Cannabis-Pflanzenproduktion. Der Spieler steuert Anbau, ausführliche Pflege direkt an erkennbaren Cannabis-Pflanzen, simulierte Verarbeitung, Qualitätssicherung, Lager, Logistik und Auslieferung an Apotheken. Apothekeninterne Abläufe gehören nicht zum Spielumfang.

Diese Beschreibung ist als Produktwahrheit für README, Manifest, Startscreen, GDD, UX-Texte, Produktionsaufträge, Agentenbriefings und Abnahmeentscheidungen zu verwenden. Keine Agentin und kein Agent darf den Produktumfang eigenmächtig umdeuten oder Cannabis durch generische Kräuter, Rundblatt-Pflanzen oder neutrale Hallenmodelle ersetzen.

## 2. Visuelle Produktanforderungen

Die 3D-Welt muss die medizinische Cannabis-Pflanzenproduktion klar erkennbar darstellen: sichtbare Cannabis-Pflanzen in einer professionellen Indoor-Anlage, Pflanzenreihen, Beleuchtung, Bewässerungsinfrastruktur, Klima-/Lüftungstechnik und funktionale Arbeitsbereiche. Ein neutraler Raum mit nicht identifizierbaren Pflanzen erfüllt die Produktanforderung nicht.

Pflanzen sind interaktive Spielobjekte, nicht nur Dekoration. Die aktuelle Auswahl muss zwischen 3D-Welt und Managementoberfläche konsistent bleiben. Eine erfolgreiche Pflegeaktion muss den Zustand der ausgewählten Pflanze verändern und eine sichtbare Reaktion am passenden Objekt zeigen. Ein Textlog oder Toast allein ersetzt die visuelle Reaktion nicht.

## 3. Direkte Pflanzenpflege — verbindlicher Gameplayumfang

Spielerhandlungen, State-Übergänge, sichtbares Feedback, Protokoll und Save-Verhalten müssen zusammenpassen. Zum Pflegeumfang gehören:

- Bewässerung;
- Beleuchtungsstufe einstellen;
- fiktive Temperatur- und Luftfeuchtigkeits-Einstellungen;
- simulierte Nährstoffversorgung;
- Beschneiden;
- Steckling schneiden;
- einen verfügbaren Steckling setzen und als neues, rückverfolgbares Pflanzenobjekt sichtbar machen.

Diese Vorgänge werden ausschließlich mit erfundenen, dimensionslosen Spielstufen und fiktiven Balanceeffekten dargestellt. Der Code und die UI dürfen keine realen Sollwerte, Mischverhältnisse, Anbaupläne, Klimasollwerte, Nährstoffrezepte, Ertragsoptimierungsanweisungen oder sonstigen realen Kultivierungsanleitungen enthalten. Das Verbot realer Parameter ist **kein** Grund, Cannabis als Thema oder visuelles Objekt zu entfernen.

## 4. Umfangsgrenze der Lieferkette

Der vom Spieler verwaltete Ablauf endet bei Auftrag, Freigabe, Bestand, Versand und dokumentierter Auslieferung an eine fiktive Apotheke. Der Spieler betreibt keine Apotheke und simuliert nicht deren interne Prozesse, Patientenverwaltung, Verschreibung, Dosierung oder Arzneimittelabgabe.

## 5. Quellenrangfolge und Umgang mit Konflikten

Bei widersprüchlichen Informationen gilt in dieser Reihenfolge:

1. die neueste ausdrückliche Produktentscheidung des Auftraggebers;
2. diese Produktionsrichtlinie als Produkt-/Abnahmevorgabe;
3. AGENTS.md für Agenten- und Arbeitsregeln;
4. das Master Production Document, GDD und Feature Scope;
5. aktive Runtime-Contracts, Schemas und bestätigte Decision Records;
6. konkrete Systemspezifikation und Taskboard;
7. existierende Implementierung und historische Dokumente.

Das ursprüngliche ZIP und sein dokumentierter Hash bleiben wichtig für Provenienz und unveränderte Quellartefakte. Sie überstimmen jedoch nicht die spätere ausdrückliche Produktnamens-/Scope-Entscheidung. Originalverträge, die als Quelle erhalten werden müssen, liegen unter masterpack/canonical/contracts/; Runtime-Erweiterungen werden in den aktiven contracts/ dokumentiert und getestet. Niemals Originalquellen stillschweigend umschreiben oder Runtime-Verträge als unverändert identisch ausgeben, wenn sie fachlich erweitert wurden.

## 6. Technische Regeln für Pflegeaktionen

Jede Pflegeaktion ist ein typisierter Domain-Command. Der Domain-Handler prüft: Existenz der Pflanze, zulässigen Pflanzenstatus, erlaubte Spielstufe, Compliance-Status, Kapazität und alle weiteren Vorbedingungen. Ein ungültiger Command verändert weder State noch Log noch Ledger.

Eine gültige Pflegeaktion muss:

1. den Care-State und die erlaubten Pflanzenkennzahlen deterministisch aktualisieren;
2. die Pflanze in der 3D-Welt visuell aktualisieren;
3. einen klaren Domain-Logeintrag und ein typisiertes Event erzeugen;
4. beim Stecklingssetzen Elternreferenz, Pflanzen-ID und Raumkapazität korrekt behandeln;
5. nach Save/Load den gleichen fachlichen Zustand erhalten;
6. positive, negative, Grenzwert-, Wiederholungs-, Kapazitäts- und Reload-Fälle testen.

Alle neuen optionalen State-Felder benötigen eine definierte Rückwärtskompatibilität für bestehende Version-1-Saves. Alte Saves ohne optionale Care-Felder dürfen weiterhin lesbar sein. Die UI-Auswahl darf keinen versteckten fachlichen Zustand verändern.

## 7. Engineering- und Agentenregeln

- Lies vor dem Schreiben AGENTS.md, diese Richtlinie, das GDD, die betroffenen Contracts, Tasks und die aktuelle CI-Baseline.
- Bewahre vorhandene Arbeit. Keine blinden Rollbacks, breitflächigen Überschreibungen, destruktiven Git-Aktionen oder Änderungen auf main während der Restoration.
- Bündele voneinander abhängige Änderungen in überschaubaren, überprüfbaren Commits. Vermeide unnötige CI-Läufe, die durch Einzeldatei-Commits ausgelöst werden.
- Keine unbelegten Spielwerte erfinden. Das betrifft besonders Preise, Upgrades, XP, Levelschwellen und Unlocks.
- Kein Blockout, Fake-Button oder reines Textmockup als fertiges Feature deklarieren.
- Ein Task ist nicht fertig, wenn nur Dokumentation oder nur Handler-Code existiert; UI, Simulation, Persistenz, Fehlerpfade, Logs und Tests müssen gemäß Aufgabe integriert sein.

## 8. Verpflichtende CI- und Abnahmegates

Auf dem **exakt gleichen Commit** müssen alle folgenden Prüfungen ausgeführt und erfolgreich beendet werden:

1. Clean locked dependency install (npm ci --no-audit --no-fund);
2. Source policy lint;
3. Format-Check;
4. strikter TypeScript-Typecheck;
5. Domain-/Unit-/Contract-Tests;
6. Produktionsbuild;
7. Browser-E2E für Kampagne, Save/Load/Recovery und Pflanzenpflege;
8. Production-preview-Smoke-Test;
9. Master-Pack-Validator;
10. Produkt-Richtlinienvalidator;
11. Whitespace/Diff-Check.

Ein grüner Pack-Validator ersetzt keine App-CI. Ein erfolgreicher Typecheck ersetzt keine E2E-Prüfung. Laufende, übersprungene, abgebrochene oder von einem neueren Commit stornierte Jobs zählen nicht als bestanden. Screenshots und visuelle Tests müssen das echte Anwendungsergebnis prüfen, nicht nur, dass ein Control im DOM existiert.

## 9. Definition of Done und Merge-Grenze

Ein Produktions-Task gilt erst als **DONE**, wenn die akzeptierten Anforderungen umgesetzt, relevante Tests bestanden, der Diff geprüft, Dokumentation/Taskstatus aktualisiert und Risiken benannt sind. Ein Meilenstein gilt nur dann als **GRÜN**, wenn alle Pflichtgates für denselben finalen Commit grün sind und keine offenen P0/P1-Blocker bestehen.

Bis dahin bleibt PR #26 ein Draft. main darf nicht geändert werden. Ein Merge darf erst nach vollständigem grünen CI, Prüfung der Review-Diffs und bestätigter Produkt-/Scope-Parität erwogen werden. Niemand darf einen nicht bestandenen oder unvollständigen Status als abgenommen bezeichnen.

## 10. Pflichtprüfungen jeder Änderung

Bei jeder Änderung an Namen, Scope, UI, Pflanzenpflege, Visuals, Save-Schema, Balancing, Contracts oder Tests muss der Autor ausdrücklich prüfen:
- Passt die Änderung zu Dr. Green Dump / DopeFarm und erkennbaren medizinischen Cannabis-Pflanzen?
- Bleibt die Pflegeaktion an Pflanze, fachlichem State und gespeicherter Spielpartie konsistent?
- Bleiben Apotheken-interne Abläufe außerhalb des Scope?
- Werden keine realen Anbauparameter oder Herstellungsanleitungen eingeführt?
- Sind Akzeptanzkriterien und CI-Belege für den exakten Commit vorhanden?
