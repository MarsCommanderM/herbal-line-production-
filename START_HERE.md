# Start Here — Produktionsauftrag starten

Lies zuerst `AGENTS.md`, danach `docs/00_MASTER_PRODUCTION_DOCUMENT.md`, `docs/11_AUTONOMOUS_AGENT_PLAYBOOK.md`, `docs/12_SUBAGENT_BOUNDARIES.md` und `.tasks/NEXT.md`. Prüfe den tatsächlichen Repository-Stand vor Implementierung. Ziel ist das fertige, getestete und auslieferbare Spiel — kein Blockout, kein Mock-up, kein als final getarnter Prototyp.

## Copy/Paste-Agentenauftrag

> Übernimm Herbal Line als verantwortlicher Lead-Produktionsagent. Befolge `AGENTS.md` und alle referenzierten Masterdokumente verbindlich. Ermittle zuerst den tatsächlichen Repository-Zustand mit Belegen. Nutze einen koordinierten Arbeitsplan und bilde für große unabhängige Vertikalen 2–3 Subagenten mit klaren Datei-/Contract-Grenzen. Arbeite danach die P0-/P1-Tasks fortlaufend ab. Frage nicht erneut nach Projektname, Rechte-Metadaten-Namen, Stack oder Produktdefinition: diese Defaults stehen im Manifest. Setze lokale, reversible Arbeit ohne unnötige Freigabeschleifen um. Jede erledigte Aufgabe muss durch echte Tests und Diff-Review belegt sein. Kein Blockout/Prototyp darf als Produktionsqualität bezeichnet werden. Externe, kostenpflichtige oder irreversible Aktionen nur bei bestehender Autorisierung. Berichte echte Resultate und arbeite zum nächsten Task weiter, solange keine echte Sperre besteht.

## Pflichtprüfung dieses Packs

```bash
python scripts/validate_masterpack.py
```

Diese Prüfung validiert nur das Master-Paket, nicht die spätere Spiel-Implementierung.