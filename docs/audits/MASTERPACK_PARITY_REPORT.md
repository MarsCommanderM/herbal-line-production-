# Master-Pack-Parität und Produkt-Scope-Entscheidung — 2026-10-12

## Verbindliche Produktwahrheit

Die aktuelle, ausdrücklich bestätigte Produktvorgabe des Auftraggebers lautet **Dr. Green Dump / DopeFarm**. Die Spielbeschreibung ist:

> Ein hochwertiges Web-Managementspiel über den legalen und kontrollierten Aufbau und Betrieb einer streng regulierten medizinischen Cannabis-Pflanzenproduktion. Der Spieler steuert Anbau, ausführliche und direkt an der Pflanze sichtbare Pflege, simulierte Verarbeitung, Qualitätssicherung, Lager, Logistik und Auslieferung an Apotheken. Apothekeninterne Abläufe gehören nicht zum Spielumfang.

Der Spieler muss erkennbare Cannabis-Pflanzen und tatsächlich ausgeführte Pflegeaktionen sehen. Eine generische Kräuter-/Botanikproduktion ist ausdrücklich keine zulässige Ersatzvision. Sämtliche Zahlen, Einstellungen und Effekte bleiben erfundene Spielwerte; es werden keine realen Anbausollwerte oder Produktionsanleitungen eingebaut.

## Quelle und unveränderliche Provenienz

- Ursprüngliches Archiv: `Herbal-Line-Production-Master-Pack.zip` — dies ist der historische Dateiname des gelieferten Archivs, **nicht der aktuelle Spielname**.
- Dokumentierter Archiv-SHA-256: `4e783542951f573ed7412444e9e2ed00c490a9b7919f67c30399b86297a4b8972`.
- Archivstatus bei der ursprünglichen Prüfung: 42 Dateien; ZIP-Integritätsprüfung erfolgreich.
- Der später bestätigte Spielname Dr. Green Dump / DopeFarm hat Vorrang vor älteren Titeln oder Metadaten im gelieferten Material. Diese Nutzerentscheidung ist als autorisierte Scope-/Brand-Änderung zu protokollieren und nicht als heimliche Archiv-Parität auszugeben.

## Paritätsstatus

Ein früherer Vergleich meldete 4/42 exakte Blob-Treffer für `main@6ddb8849886f35ece5f3d784d06714b4054f5116`. Eine spätere 42/42-Prüfung galt nur für einen Zwischenstand vor den anschließenden, autorisierten Produktnamen- und Inhaltsänderungen.

**Für den aktuellen Branch wird keine 1:1-Archivparität behauptet.** Änderungen an Spielname, Produkttext, UI und Produktionsrichtlinie weichen bewusst vom historischen Archivnamen ab. Ein künftiger Bericht muss für jeden Pfad unterscheiden zwischen:
1. unverändertem Originalinhalt;
2. vom Auftraggeber ausdrücklich geänderter Produktidentität;
3. anwendungsspezifischer Implementierung;
4. ungeklärter Abweichung.

Die historische ZIP-Prüfung und ihr Hash bleiben Provenienznachweis. Sie sind kein Beleg dafür, dass der aktuelle Branch unverändert identisch ist. Validator-Erfolg beweist Dateivollständigkeit/Metadaten, nicht den Produkt-Scope und nicht einen erfolgreichen App-Build.

## Arbeits- und Branch-Grenze

- Alle Wiederherstellungs- und Produktionsänderungen laufen auf `restore/original-masterpack-product-scope-20261012`.
- `main` bleibt unangetastet, bis Review und alle erforderlichen Gates erfolgreich sind.
- Keine blinden Rollbacks, Merges oder großflächigen Überschreibungen.
- Produktanforderungen gehen vor Altcode. Kompatible Implementierung bleibt erhalten; unbelegte Balancewerte, Upgradeeffekte oder Progressionsregeln werden nicht erfunden.
- CI-Ergebnisse werden stets dem exakten getesteten Commit zugeordnet.

## Aktueller technischer Prüfstatus

Die verbindliche operative Richtlinie liegt in docs/PRODUCTION_POLICY.md. Sie verlangt direkte, sichtbare Pflanzenpflege in 3D/UI einschließlich typisierter Commands, Logs/Events, Persistenz und E2E-Belegen. Pflegewerte bleiben erfundene Spielstufen.

Auf dem vorherigen Integrationsstand `c9116b8b65f4ce9d59b8f1dc54cfabe3c8bc3f38` wurden in GitHub Actions Install, Source-Lint, Formatprüfung, TypeScript-Typecheck, Domain-Unit-Tests und Produktionsbuild erfolgreich gemeldet. Die Browser-E2E-Prüfung lief bei der letzten Beobachtung noch; daraus folgt **kein** Gesamt-CI-PASS. Die separate Master-Pack-Validierung lief erfolgreich, prüft aber nicht die vollständige Spielabnahme.

## Abnahmebedingungen

1. User-facing Namens-/Scope-Prüfung zeigt ausschließlich Dr. Green Dump / DopeFarm als aktiven Produktnamen; historische Archivdateinamen und alte Persistenz-IDs sind nur Provenienz-/Kompatibilitätshinweise, keine UI-Produktlabels.
2. Cannabis-Pflanzen sind visuell eindeutig; Pflegeaktionen sind mit echtem State-Update, sichtbarer Reaktion, Log und Speicherverhalten verbunden.
3. Wirtschaft, Progression, Save-/Load und Compliance stimmen mit dokumentierten, belegbaren Spielregeln überein.
4. Frischer PR-Workflow besteht Typecheck, Unit-Tests, Build, Browser-E2E, Preview-Smoke, Pack-Validation und Whitespace-Check auf demselben Commit.
5. Erst nach Review und durchgehend grünen Pflichtgates darf ein Merge erwogen werden.
