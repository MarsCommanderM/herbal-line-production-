# Dr. Green Dump / DopeFarm — Wiederherstellungs- und Produktionsstatus

**Zuletzt aktualisiert:** 2026-10-13  
**Arbeitsbranch:** `restore/original-masterpack-product-scope-20261012`  
**Produktname:** Dr. Green Dump / DopeFarm  
**Produktumfang:** legales, kontrolliertes Management einer streng regulierten medizinischen Cannabis-Pflanzenproduktion mit sichtbaren Pflegeaktionen.

## Verbindliche Scope-Entscheidung

Die aktuelle ausdrückliche Produktvorgabe des Auftraggebers hat Vorrang vor älteren Chat-/Dokumentfassungen und dem historischen Archivnamen. Das Spiel heißt **Dr. Green Dump / DopeFarm**, nicht Herbal Line, Botanical Operations oder Kräuterlinienproduktion.

Der Spieler steuert Anbau, direkte und sichtbare Pflanzenpflege (Bewässerung, Licht, fiktive Temperatur-/Luftfeuchtigkeitssteuerung, Nährstoffpflege, Beschneiden sowie Stecklinge schneiden/setzen), simulierte Verarbeitung, Qualitätssicherung, Lager, Logistik und Auslieferung an Apotheken. Die Apotheken selbst werden nicht betrieben oder simuliert. Alle Werte und Effekte sind erfundene Spiel-Balancewerte; keine realen Kultivierungs-Sollwerte oder Anleitungen.

## Archiv-Provenienz und korrekte Paritätsaussage

- Geliefertes historisches ZIP: `Herbal-Line-Production-Master-Pack.zip`.
- Dokumentierter SHA-256: `4e783542951f573ed7412444e9e2ed00c490a9b7919f67c30399b86297a4b8972`.
- Ursprüngliche Datei-/ZIP-Prüfung: 42 Dateien; ZIP-Integrität bestand.
- Der Archivname und ältere Archivtexte werden als Provenienz dokumentiert, nicht als aktueller Spieltitel.
- Eine 42/42 Blob-Übereinstimmung wurde auf einem früheren Branch-Zwischenstand gemeldet. **Sie gilt nicht als Paritätsaussage für den aktuellen Branch**, weil spätere, ausdrücklich bestätigte Produktnamen- und Inhaltskorrekturen Inhalte geändert haben.
- Aktuelle volle Archivparität wird nicht behauptet. Das Archiv bleibt über den dokumentierten Hash identifizierbar; ein Paritätsreport muss absichtliche, vom Auftraggeber bestätigte Abweichungen klar von ungeklärten Abweichungen trennen.

## Tatsächlich überprüfter Ausgangsstand

Ausgangsrevision vor dem nächsten gebündelten Richtlinien-/E2E-Patch: `c9116b8b65f4ce9d59b8f1dc54cfabe3c8bc3f38`.

Beobachtete Aktionen in GitHub Actions auf diesem Ausgangsstand:
- [Master-Pack-Validierung 38305545140](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38305545140): **PASS**.
- [App-CI 38305545109](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38305545109): Install, Lint, Formatcheck, Strict Typecheck, Domain-Tests und Produktionsbuild waren erfolgreich; Browser-E2E war bei der letzten Abfrage noch aktiv.
- [Zweiter App-CI-Lauf 38305540569](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38305540569): gleicher Zwischenstand, Browser-E2E war ebenfalls noch aktiv.

Das ist **kein** bestätigtes Gesamt-CI-PASS. Frühere rote Typecheck-Läufe gehören zu älteren Commits und sind historische Befunde, keine Aussage über die letzten abgeschlossenen Schritte.

## Korrekturen im gebündelten Richtlinien-Patch

- CI-Workflow-Namen auf Dr. Green Dump / DopeFarm umgestellt.
- App-CI löst nicht mehr zusätzlich auf jedem Feature-Branch-Push aus; verbindliche Ausführung erfolgt für PRs gegen `main`, auf `main` und manuell.
- E2E-Heading-Erwartung auf den aktuellen Spielnamen ausgerichtet.
- README, Manifest, AGENTS, Rechtehinweis, Content-Register und UI-Bezeichnungen auf eine gemeinsame Produktdefinition ausgerichtet.
- Generische Profil-/Auftragsbezeichner in der sichtbaren Produktstrecke bereinigt.
- Überholte CI-/Paritätsaussagen in Auditdokumenten werden als historisch gekennzeichnet, nicht als aktueller Status ausgegeben.

## Latest exact-commit verification — 2026-10-13

Verified code revision: `41ae376e527a79d28ff1692fd19d6db2a4052631`.

- [Full DopeFarm CI 38355313631](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38355313631): **SUCCESS** on this exact SHA. Locked install, source lint, format, strict TypeScript, unit tests, production build, Chromium/Firefox/WebKit E2E, preview smoke, Master-Pack/source-snapshot validation, product-policy validation and whitespace all passed.
- [Master Pack Validation 38355313567](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38355313567): **SUCCESS** on the same SHA.
- The E2E suite contains explicit WebGL initialization failure injection; the management UI and a care action remain available when the 3D renderer cannot initialize. Renderer-dependent tests may be skipped where the browser exposes no WebGL canvas; these are not counted as passes.
- `main` remains unchanged at `2b2dd96ed1739f4395ff02ac6a9cd399e940be94`.

## Remaining release blockers

1. **Persistence migration:** no migration chain will be fabricated without a real, evidenced legacy schema.
2. **Formal incident/corrective-action lifecycle:** requires an authoritative product contract; existing compliance gates remain implemented and tested.
3. **Economy/progression:** upgrade prices/effects, XP/level thresholds and unlock schedules require an approved balance table; unconfigured upgrades stay unavailable.
4. **Final art/audio/assets:** procedural third-person avatar and facility geometry remain placeholders until source assets, provenance and commercial-use rights are verified.
5. **Release QA/operations:** dependency/secret review, accessibility, privacy/security, IP/license review, artifact identity and rollback/incident-response evidence remain open.

A green CI establishes technical acceptance for this commit only. It does not close the product decisions, asset approvals or release operations listed above. Do not merge or claim release-ready status until those blockers are resolved or explicitly accepted through the project's decision process.


## Dependency security verification — exact source revision

- Source revision: `41ff3d43f01da61fa54a645e685a3361c685cab6`.
- [Full CI 38417104774](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38417104774): **SUCCESS** on the exact revision.
- [Master Pack Validation 38417104628](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38417104628): **SUCCESS** on the same revision.
- `npm audit --audit-level=high` reported 0 vulnerabilities; the generated CycloneDX SBOM contains 58 components with SPDX license metadata (SBOM SHA-256: `6bc6940c06cb7ae50979181c287cda28da6fd6eb09dd0b67a43db5e91f8c48ea`).
- The subsequent commit adds deterministic license-inventory validation and enables the standalone Master Pack workflow on the restoration branch. These changes require their own exact-SHA CI proof.


## Security/accessibility acceptance expansion

The subsequent QA revision adds full-history high-confidence credential scanning, a full-severity `npm audit` gate, a Playwright Axe WCAG 2.1/2.2 A/AA scan, and deterministic SBOM/license-inventory comparison. Earlier successful run IDs do not prove these newly added checks; use only the current head's own full CI and Master Pack Validation results. Legal license compatibility/required texts, final asset rights, privacy/security review and release/rollback acceptance remain separate.
