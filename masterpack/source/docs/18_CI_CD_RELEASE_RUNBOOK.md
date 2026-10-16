# 18 — CI/CD- und Release-Runbook

## 1. Merge-Gates

Jeder PR/Commit in eine releasefähige Branch-Policy muss folgende Checks bestehen (exakte Befehle werden dem tatsächlichen Package-Manager angepasst und dann in `package.json` eingefroren):

1. Frozen lockfile install in clean runner.
2. Formatting check.
3. Lint/static analysis.
4. TypeScript strict typecheck.
5. Unit/domain tests.
6. Contract/schema validation.
7. Integration/E2E tests für betroffene Workflows.
8. Build und artifact integrity.
9. Dependency/SBOM/license gate.
10. Secret scan.
11. Save-migration and backwards-compatibility suite.
12. Visual/performance gates bei Änderungen an UI/Engine/Assets.

Kein Skip ohne schriftlich dokumentierte, zeitlich begrenzte Ausnahme und Owner. Release-Blocker werden nicht durch Label oder Kommentar übergangen.

## 2. Branch-/Commit-Hygiene

- Ein Task bleibt möglichst klein und vollständig. Commits sind thematisch und verweisen auf Task/Decision Record.
- Nur explizite Dateien stage'n. Vor Commit gestagte Dateien und Patch prüfen.
- Keine Nutzeränderungen überspielen, kein unaufgeforderter force push, kein destruktives Reset/Clean.
- Lockfile-Änderungen dürfen nur vom verantwortlichen Integrationseigentümer gegen den geprüften Paketstand regeneriert und diff-reviewed werden.
- Größere Architekturänderungen erhalten ADR und Migration.

## 3. Release Candidate

1. Feature-Freeze für vereinbarte Release-Funktionen.
2. Content-/Asset-Freeze und License Gate.
3. Build vom clean checkout mit Lockfile.
4. Tests genau auf derselben Revision ausführen.
5. Version, Changelog, SBOM, Third-Party-Notices, Rechte-Register und Release-Notizen verifizieren.
6. Artifact-Dateien und SHA-256 sammeln; keine nach dem Test veränderten Artefakte ausliefern.
7. Installations-/Smoke-Test auf definierten Zielbrowsern/Geräten.
8. Owner gibt dokumentiert Release frei oder weist ihn zurück.

## 4. Rollout

Je nach Hosting: gestaffelter Rollout oder kontrollierter statischer Release mit vorheriger Version als Rollback. Deployment bleibt getrennt von Build. Vor Live-Änderung sind Ziel, Kosten, Risiken und Autorisierung klar. Nach Release: HTTP/asset loading, console/runtime errors, Save/Load, Crash-/Fehlerindikatoren und Kernloop prüfen.

## 5. Rollback und Hotfix

- Rollback-Artefakt/alte Version und Migrationskompatibilität vor Release prüfen.
- Bei kritischen Fehlern Veröffentlichung stoppen/auf letzte sichere Revision zurückgehen. Saves nicht automatisch rückwärts in inkompatibles Schema migrieren.
- Hotfix enthält reproduzierbaren Test, changelog, neue Hashes und vollständige Pflicht-Gates.

## 6. Keine falschen Garantien

CI beweist nur, dass die ausgeführten Checks auf genau diesem Stand bestanden haben. Es beweist weder absolute Fehlerfreiheit noch rechtliche Freigabe oder visuelle Qualität ohne entsprechende Prüfungen. Das Release-Protokoll darf daher nur beobachtete Ergebnisse und konkrete Belege ausweisen.
