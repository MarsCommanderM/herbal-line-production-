# Game Vision & Game Design Document

## High Concept

Ein strategisches Management-/Tycoon-Spiel über den Aufbau einer streng regulierten medizinischen Cannabis-Pflanzenproduktion. Der Spieler leitet einen kleinen Betrieb und entwickelt ihn zu einem zuverlässigen, dokumentationsstarken Lieferanten für fiktive Apothekenkunden.

## Genre, Plattform, Perspektive

- Genre: Management, Operations Simulation, Tycoon, leichtes Zeitmanagement.
- Plattform: moderner Desktop-Browser als Primärziel; responsive Managementansicht auf kleineren Displays, wenn Lesbarkeit erhalten bleibt.
- Weltansicht: schwenk- und zoombare isometrische/taktische 3D-Kamera, Raumfokus und Detailansichten.
- UI: Operations-Dashboard mit HUD, Dock/Sidebar, Datenpanels, Produktionspipeline und Ereigniszentrum.
- Single-player, lokale Save-Kampagne. Multiplayer/Cloud-Sync sind keine Release-Abhängigkeit.

## Zielgruppe und Design-Pfeiler

Zielgruppe: Spieler, die Systeme optimieren, Engpässe erkennen, Ressourcen planen und Daten lesen. Schwierigkeit entsteht durch Abhängigkeiten und Priorisierung, nicht durch Reflexe oder Klickfrequenz.

1. Planung schlägt hektisches Klicken.
2. Qualität schlägt reine Masse.
3. Traceability ist spielrelevant.
4. Ursache und Wirkung bleiben sichtbar.
5. Jeder Screen beantwortet eine operative Frage.
6. Premium-Optik ist Bestandteil der Produktdefinition.
7. Automatisierung reduziert Routine, schafft aber neue Investitions- und Wartungsentscheidungen.

## Schleifen

- **Mikro-Loop (10–60 Sekunden):** Status lesen → Aktion ausführen → Feedback erhalten → Werte kontrollieren.
- **Operations-Loop (5–15 Minuten):** Aufträge/Risiken prüfen → Kapazitäten disponieren → Aufgaben ausführen → QC/Trace sichern → liefern → Ergebnis analysieren.
- **Meta-Loop (mehrere Spieltage):** Gewinn/Risiko analysieren → Personal/Räume/Technologie investieren → größere Verträge freischalten → Komplexität steigern.

## Start und Einführung

Die erste Kampagne startet mit einem kleinen Betriebsbereich, begrenzter Kapazität, einem fiktiven Kundenauftrag und einer geführten Schulung. Das Tutorial nutzt dieselben echten Systeme wie die Kampagne; es gibt keinen Fake-Tutorialmodus. Es ist überspringbar und später erneut aufrufbar.

## Production-quality Vertical Slice

Ein kompletter, auf finaler Architektur und finaler visueller Richtung beruhender Spielablauf: Produktionsraum, Lagerbereich, QC, ein fiktiver Apothekenkunde, eine Charge mit vollständigen Statusübergängen, QC-Ergebnis, Bestellung, Reservierung, Lieferung, Auszahlung, Compliance-Protokoll, Save/Load und Tagesauswertung. Kein Blockout, keine Attrappen.

## Release-Inhalt

- mehrere Raumtypen und Kapazitätsstufen;
- fiktive Pflanzen-/Produktprofile mit abstrahierten Qualitäts- und Produktionswerten;
- Material- und Lagerbestand mit Reservierungen und Bewegungsjournal;
- Chargen, Audit-Trail, QC, Freigabe, Reject und Rückrufsimulation;
- Kundenprofile, Aufträge, Lieferfenster, Zuverlässigkeit und Kundenbewertung;
- Mitarbeiterrollen, Skills, Energie/Moral, Schichten und Aufgabenpriorisierung;
- Energie-/Betriebskosten, Wartung, Fehlerereignisse und Investitionen;
- Compliance-Audits, Incidents, Korrekturmaßnahmen und Wiederherstellung im Spiel;
- Upgrades, Automatisierung, Expansion und Wirtschaftskurve;
- Save-Slots, Autosave, Migration und sichere Wiederherstellung;
- Tutorials, Settings, Tastaturbelegung, Accessibility und Lokalisierung;
- Audiofeedback, Fehlerzustände, Performance-Tools nur im Dev-Build.

## Nicht-Ziele

- keine reale Cannabis-Kultivierungs-, -Verarbeitungs-, Arzneimittelherstellungs- oder Vertriebsanleitung;
- keine realen Rezepturen, Klimasetpoints, Produktionskalender oder Herstellungsprotokolle;
- keine Patientenakten, medizinische Beratung oder Arzneimitteldosierung;
- keine echten Bestellungen, Lieferungen, Zahlungen oder regulatorischen Meldungen;
- kein Echtgeldmarkt, kein Token-/Krypto-System und kein Multiplayer im ersten Release;
- keine Behauptung, In-Game-Scores würden reale GMP-/Rechtskonformität bestätigen.

## Spielerfeedback

Erfolg misst sich an stabiler Auslastung, QC-Erstbestehensquote, vollständiger Traceability, termingerechten Lieferungen, Netto-Cashflow, Mitarbeiterbelastung, Auditresultaten und Ausbau. Meldungen nennen Ursachen, z. B. „Lieferung verzögert: Verpackungsstation war ausgelastet“, nicht nur rote Zahlen.

## Tonalität

Professionell, präzise, ruhig und leicht futuristisch. Die Spielwelt ist eine fiktive lizenzierte medizinische Einrichtung; sie belohnt Planung, Qualität und nachvollziehbare Abläufe.