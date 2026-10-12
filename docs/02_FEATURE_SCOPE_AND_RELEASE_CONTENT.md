# Feature-Scope, Priorisierung und Release-Inhalt

## Prioritäten

- **P0:** Release-Blocker — ohne das Feature ist der Kern nicht vollständig oder sicher.
- **P1:** verbindlicher Release-Kern.
- **P2:** Ausbau/Qualitätsgewinn nach dem stabilen Kern.
- **P3:** nach Release, außerhalb des ersten Produktversprechens.

## P0 — Kern

1. Boot-, Fehler- und Shutdown-Lifecycle.
2. Feste Simulationsschritte, Pause/Resume und 1×/2×/4× Speed.
3. Kanonischer State, typed commands/actions, selectors und Domain-Events.
4. Räume, Kapazität und auswählbare Entities.
5. Fiktiver Pflanzenlebenszyklus mit normalisierten Skalen, Aktionen und Qualitätseffekt.
6. Charge mit Herkunft, Status und Audit-Trail.
7. Verarbeitung → Verpackung → QC → Freigabe/Reject.
8. Inventar mit Bestandsjournal und Reservierungen.
9. Bestellung → Annahme → Reservierung → Versand → Lieferung.
10. Umsatz, Ausgaben, Reputation und Lizenzstatus als verbundene Systeme.
11. Save-/Load-/Migration-/Recovery-Funktion.
12. Bedienbares Management-HUD mit Fehler- und Erfolgszuständen.
13. Automatisierte Tests der fachlichen Invarianten und der End-to-End-Kernschleife.

## P1 — Release-Kern

- mehrere Raumtypen, Auslastung, Wartung und Energieverbrauch;
- Lagerplätze, Materialbestände, Reservierungen und Mindestbestandswarnungen;
- Mitarbeiterrollen, Skills, Dienstpläne und Aufgabenpriorisierung;
- Kundenprofile und Vertragsanforderungen;
- Compliance-Audits, Incidents, Korrekturmaßnahmen und Rückrufpfad;
- Expansion, Upgrade-Baum, Automatisierung und freischaltbare Verträge;
- Produktions-/Finanz-/QC-/Compliance-Dashboards und historische Auswertung;
- Tutorial, Settings, Keyboard-Navigation, reduzierte Bewegung und lokalisierungsfähige Strings;
- finale Assets für alle sichtbaren Räume, Maschinen, Pflanzen und UI-States;
- Audiofeedback, Lade-/Fehlerzustände und Performance-Optimierung.

## P2

Zusätzliche Standorte, komplexere Auftragsprofile, Staff-Training/Moralereignisse, vertiefte Nachfragekurve, Challenges und erweiterte Trendcharts.

## P3

Cloud-Sync, Multiplayer, Community-Inhalte, Modding-Portal, Live-Service-Saisons und plattformübergreifende Accounts. Diese brauchen eine separate Sicherheits-, Datenschutz- und Aufwandentscheidung.

## Release-Ausschluss

Jede sichtbare oder beworbene Funktion muss im Release funktionieren. Nicht fertige Elemente werden fertig implementiert oder aus Releaseumfang und Präsentation entfernt. Fehlende Assets dürfen nicht durch graue Boxen, Stockbilder mit unklaren Rechten oder Dummy-Texte ersetzt werden.


## Sichtbare Cannabis-Pflege — verbindlicher Releaseumfang

- Professionelle Indoor-Anlage mit klar erkennbaren Cannabis-Pflanzen, Beleuchtungs-, Bewässerungs-, Klima- und Lüftungssystemen.
- Direkt sichtbare Pflegeinteraktionen an Pflanzen: Bewässerung, Licht einstellen, simulierte Temperatur-/Luftfeuchtigkeitsregelung, Nährstoffversorgung, Beschneiden und Stecklinge setzen/verwalten.
- Pflanzenzustand, gewählte Aktion, simuliertes Ergebnis und Statusänderung müssen visuell nachvollziehbar sein.
- Die Apotheken sind Kunden der Lieferkette; interne Apothekenprozesse sind außerhalb des Umfangs.
- Alle numerischen Parameter sind erfundene Spielwerte. Keine realen Anbauanleitungen.
