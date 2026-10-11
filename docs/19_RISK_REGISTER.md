# 19 — Risiko-Register

| ID | Risiko | Wahrscheinlichkeit / Impact | Früherkennung | Maßnahme | Gate/Owner |
|---|---|---|---|---|---|
| R-001 | Alte Chat-Codefragmente widersprechen sich | hoch/hoch | doppelte Typen/Stage-Werte/Dateien | Phase-0 Audit; Altcode nicht als Autorität behandeln | Phase 0 / Hauptagent |
| R-002 | Agenten verändern dieselben Contracts | mittel/hoch | diff/claim overlap | ein Contract-Owner, Freeze und Handoff | Vor paralleler Arbeit / Architect |
| R-003 | Determinismus bricht durch Zeit/RNG | mittel/hoch | Replay drift | feste Ticks, seeded RNG, pure domain, replay tests | CI / Simulation |
| R-004 | Save wird korrupt/verloren | mittel/critical | Migration-/transaction-/quota errors | Snapshots, validation, atomic writes, recovery/export | P0 / Persistence |
| R-005 | Doppelbuchung oder negativer Bestand | mittel/critical | invariant/property tests | Ledger, reservierte Mengen, idempotency keys | P0 / Simulation |
| R-006 | UI zeigt falschen/widerlegten Zustand | mittel/hoch | E2E/state selectors mismatch | source of truth, selectors, contract tests | UI gate / Presentation |
| R-007 | Platzhalter als finale Optik ausgegeben | hoch/hoch | Asset manifest missing / visual review fails | Final-art gate, screenshots und Assets registrieren | P0 / Art owner |
| R-008 | Unbekannte Asset-Lizenz | mittel/critical | `pending` im rights register | Ersatzasset oder Beleg beschaffen; Release blockieren | Rights gate / Producer |
| R-009 | Produktname kollidiert mit Marke | mittel/hoch | Register-/ähnlichkeitsrecherche | schriftliche Recherche, Alternativname bereithalten, fachkundige Prüfung bei Risiko | Rights gate / Producer |
| R-010 | Security Secret im Git | niedrig/critical | secret scan | pre-commit/CI scans, rotation and history remediation | P0 / Security owner |
| R-011 | Browser-/GPU-Performance reicht nicht | mittel/hoch | p95 frame time, GPU/heap trace | target devices, budgets, asset LOD/compression, adaptive presentation | Phase 14–16 / Engine |
| R-012 | Dependency-Lizenz/Version ändert sich | mittel/hoch | lockfile/SBOM diff | pinned dependencies, audit, notices, controlled updates | Each release / Architect |
| R-013 | Scope wächst unkontrolliert | hoch/mittel | unverplante Features | scope change record, deferred backlog, release baseline | Jede Phase / Producer |
| R-014 | Simulation wirkt wie reale Produktionsberatung | mittel/hoch | realistische Zahlen/Anleitungen im Content | vollständig fiktive abstrahierte Parameter und Fachtextprüfung | Content gate / Design |
| R-015 | „100 % fehlerfrei“ wird unhaltbar versprochen | hoch/hoch | unbewiesene Claims | evidenzbasiertes DoD, deklarierte Rest-Risiken | jede Abnahme / Hauptagent |
| R-016 | Tooling- oder Cloudoperation verursacht Kosten/externe Wirkung | niedrig/hoch | permission/cost prompt | lokale reversible Aktionen autonom; externe paid/irreversible actions anhalten | Tool policy / Hauptagent |
| R-017 | Performance/QA-Test läuft auf anderer Revision | mittel/hoch | Commit-hash mismatch | Evidence bundle bindet Resultate an Revision/Artefakt hash | RC gate / QA |
| R-018 | Datenschutz/Telemetrie unerwartet aktiv | niedrig/hoch | runtime/network inspect | local-only default; separate approval and review for telemetry | Security gate / Architect |