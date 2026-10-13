# Dr. Green Dump / DopeFarm — Game Vision & Game Design Document

## High Concept

Ein hochwertiges Web-Managementspiel über den legalen und kontrollierten Aufbau und Betrieb einer streng regulierten medizinischen Cannabis-Pflanzenproduktion. Der Spieler steuert den Anbau und sichtbare, ausführliche Pflege direkt an erkennbaren Cannabis-Pflanzen, simulierte Verarbeitung, Qualitätssicherung, Lager, Logistik und Auslieferung an fiktive Apothekenkunden. Apothekeninterne Abläufe sind nicht Teil des Spiels.

## Genre, Plattform, Perspektive

- Genre: Management, Operations Simulation, Tycoon, leichtes Zeitmanagement.
- Plattform: moderner Desktop-Browser als Primärziel; responsive Managementansicht auf kleineren Displays, wenn Lesbarkeit erhalten bleibt.
- Weltansicht: verbindliche Third Person 3D-Perspektive mit sichtbarer, steuerbarer Spielfigur innerhalb der Anlage; die Kamera folgt hinter/oberhalb der Figur. Bewegung erfolgt über WASD/Pfeiltasten; Pflanzenaktionen werden direkt aus der Weltansicht und nur innerhalb der Interaktionsreichweite ausgelöst.
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


## Verbindliche Pflanzenpflege und Sichtbarkeit

Die Pflanzenwelt ist eindeutig als medizinische Cannabis-Pflanzenproduktion erkennbar. Der Spieler führt Pflegehandlungen sichtbar an einzelnen Pflanzen oder Pflanzengruppen aus; Aktionen dürfen nicht ausschließlich in abstrakten Menüs stattfinden. Die Interaktionen umfassen im Spiel Bewässerung, Beleuchtung, Klima-/Luftfeuchtigkeitsmanagement, Nährstoffversorgung, Beschneiden und Stecklingsmanagement. Jeder Vorgang besitzt sichtbares Feedback am Pflanzenzustand, eine nachvollziehbare Spielwirkung und fiktive, ausdrücklich nicht reale Balancewerte. Es werden keine realen Anbau-Sollwerte oder Produktionsrezepte verwendet.
