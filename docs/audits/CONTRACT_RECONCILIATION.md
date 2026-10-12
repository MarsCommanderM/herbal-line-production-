# Contract Reconciliation — Dr. Green Dump / DopeFarm — 2026-10-12

## Aktuelle Produkt- und Quellenautorität

Der Spielname lautet **Dr. Green Dump / DopeFarm**. Das gelieferte Archiv trägt noch den historischen Namen `Herbal-Line-Production-Master-Pack.zip`; dieser Dateiname ist nicht der Produktname. Die verbindliche Spielvision ist eine legale, kontrollierte, streng regulierte medizinische Cannabis-Pflanzenproduktion mit erkennbaren Pflanzen und direkt sichtbarer Pflege. Allgemeine Kräuter-/Botanikdarstellung ist nicht zulässig. Pflege-, Klima-, Nährstoff- und Prozesswerte sind erfundene Spielwerte; reale Produktionsanleitungen sind nicht Teil des Spiels. Apothekeninterne Abläufe sind außerhalb des Scope.

## Vertragseigentümerschaft

- Laufzeitverträge unter `contracts/` müssen mit der laufenden Domain-Implementierung, Save-Formaten, UI und Tests konsistent sein.
- Source-Pack-Verträge, die vom Runtime-Vertrag abweichen, dürfen nicht unbemerkt überschrieben oder als identisch ausgegeben werden.
- Jede beabsichtigte Abweichung erhält einen Decision-Log-Eintrag mit Quelle, Grund, Migrationsauswirkung und Tests.
- Kein Balancewert, Preis, Upgradeeffekt, XP-Gewinn, Levelschwellenwert oder Unlock wird ohne belegbare Anforderung oder bestätigte Produktentscheidung ergänzt.
- State-Mutationen passieren über typisierte Commands; abgeleitete Sicht-/UI-Daten bleiben fachlich nicht autoritativ. Neue Pflegeaktionen müssen in Contracts, Reducer/Handler, UI, Persistenz und Tests gemeinsam integriert werden.

## Historische CI-Fehler — nicht mehr als aktueller Status ausgeben

Der frühere Lauf [38290153329](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38290153329) scheiterte beim Typecheck unmittelbar nach dem Einspielen der Originalverträge. Er berichtete unter anderem fehlende Economy-Summaryfelder, `grant`, `recovery_review`, fehlendes `qualityAssessments`, unvereinbare Event-Varianten und Save-Payload-Unterschiede. Dieser Lauf dokumentiert den damaligen Vertragsbruch; er ist kein aktueller Statusbericht für spätere Commits.

Auf dem Integrationsstand `c9116b8b65f4ce9d59b8f1dc54cfabe3c8bc3f38` liefen Install, Lint, Formatcheck, Strict Typecheck, Unit-Tests und Produktionsbuild erfolgreich. Browser-E2E war bei der letzten Abfrage noch aktiv. Eine abgeschlossene, vollständig grüne Gesamtpipeline ist für diesen Stand daraus noch nicht belegt. [App-CI-Lauf](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38305545109) · [Master-Pack-Validierung](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38305545140).

## Aktuelle offene Integrationspunkte

1. Alle Browser-E2E-Tests müssen gegen den aktuellen Produktnamen laufen; veraltete Erwartungen wie `Botanical Operations` sind zu beseitigen.
2. Sichtbare Cannabis-Pflegeaktionen müssen echte Fachzustände ändern, sichtbare Reaktionen auslösen, protokolliert und nach Reload wiederherstellbar sein.
3. Save-Migration, beschädigte Daten, Export/Import und Recovery müssen für den aktuellen State geprüft werden.
4. Economy/Progression benötigt belegte Regeln und deterministische Grenzfalltests; nicht autorisierte Upgrade-Preise/-Effekte sind kein kanonischer Default.
5. UI-Inhalte, Asset-/Rechteregister und Produktionsrichtlinie müssen denselben Produktumfang benennen.
6. Das finale CI-Ergebnis ist an den exakten Commit zu binden; laufende oder abgebrochene Workflows zählen nicht als bestanden.

## Decision rule

Produktname und Produktumfang werden durch die neueste ausdrückliche Owner-Anweisung festgelegt. Das historische Archiv wird mit seinem originalen Hash als Quelle dokumentiert, aber nicht als Grund verwendet, eine spätere, bestätigte Produktidentität zurückzusetzen. Änderungen an technischen Verträgen bleiben kontrolliert, nachvollziehbar und mit Tests belegt. `main` wird erst nach Review und erfolgreichen Pflichtgates geändert.
