# Dr. Green Dump / DopeFarm — Core Loop, Zustände und User-Flows

## Hauptfluss

**Planung → Zuweisung → Ausführung → QC/Traceability → Auftragserfüllung → Auswertung → Investition**.

### Start / Laden
- Startscreen bietet Neues Spiel, Fortsetzen, Spielstände, Einstellungen und Credits.
- Save wird validiert und migriert, bevor er in den Store gelangt.
- Ein fehlerhafter Save überschreibt nicht automatisch den letzten gültigen Autosave; Recovery-/Backup-Option wird angeboten.

### Cannabis-Pflanzenpflege — zentraler Gameplay-Loop

- Eine Pflanze wird direkt in der 3D-Anlage ausgewählt; der UI-Inspector zeigt genau diese Pflanze und ihren aktuellen simulierten Zustand.
- Pflegeaktionen sind unmittelbar am Pflanzenobjekt sichtbar und geben klares Feedback: Bewässern, Licht einstellen, fiktive Temperatur-/Luftfeuchtigkeitswerte steuern, Nährstoffversorgung ausbalancieren, Beschneiden sowie Stecklinge schneiden und setzen.
- Jede Aktion muss einen echten, validierten Domain-Command auslösen, den Zustand und das Anlagenbild nachvollziehbar ändern, einen Logeintrag erzeugen und nachweislich gespeichert werden können.
- Alle Werte sind erfundene Spiel-Balancewerte. Keine realen Sollwerte oder Anbauanleitungen.
- Apothekenprozesse enden am Kundenauftrag und an der protokollierten Auslieferung; die interne Arbeit der Apotheke wird nicht simuliert.

### Tagesplanung
- Zeigt Aufträge/Fälligkeiten, Lagerwarnungen, Raumbelegung, Schichten, Compliance-Risiko und Wartungsbedarf.
- Prioritätsänderungen haben erkennbare Auswirkungen auf Kalender und Status.

### Produktion
- Raum-/Entity-Auswahl öffnet Kontextdetails.
- Fachaktionen werden gegen Stage, Kapazität, Material, Staff, Gerät und Lizenzstatus validiert.
- Ungültige Aktionen verändern den State nicht und nennen einen konkreten Grund.

### Qualitätsprüfung
- QC zeigt dokumentierte Prüfergebnisse und fiktive Spielregeln.
- Bestehen führt nur bei erfüllten Bedingungen zu Freigabe.
- Nichtbestehen sperrt die Charge und öffnet einen nachvollziehbaren Reject-/Nachprüfungspfad.

### Auslieferung
- Auftrag reserviert nur passenden freigegebenen Bestand.
- Versand erfordert freigegebene, tracebare, nicht zurückgerufene Chargen, ausreichende Menge und zulässigen Spielstatus.
- Lieferung ist idempotent: Doppelclick, doppelte Event-Zustellung oder erneuter Command erzeugt kein zweites Entgelt.

### Auswertung / Ausbau
- Tagesabschluss zeigt Erlös, Kosten, Verspätungen, Qualität, Risiko, Verstöße und Ressourcennutzung samt Ursache.
- Investitionen prüfen Cash, Voraussetzungen, Lizenz-/Reputationsbedingungen und Folgekosten.

## Fail Loop und Recovery

Fehler → Ursache verstehen → Charge/Order gegebenenfalls sperren → Abweichung dokumentieren → Korrekturmaßnahme und gegebenenfalls Nachprüfung → Risiko neu bewerten → Kunde/Deadline neu planen → Stabilisierung. Fehler sind nicht nur Strafpunkte; ein fairer Wiederherstellungspfad wird angeboten, soweit der fiktive Zustand es zulässt.

## Informationshierarchie

1. Sofortige Blocker (gesperrte Charge, Lizenzwarnung, drohende Deadline).
2. Handlungsbedarf (fehlende Ressource, überlastete Station, Personalverfügbarkeit).
3. Betriebszustand (Auslastung, Qualität, Cashflow, Reputation).
4. Langfristige Analysen (Trends, Kostenkurven, Ausbauoptionen).

## Interaktionsregeln

- Jede Aktion hat Vorbedingung, Ergebnis, Kosten/Auswirkung und Feedback.
- Kein stilles Scheitern und keine versteckten automatischen Zustandswechsel.
- Bestätigung nur bei destruktiven oder wirtschaftlich erheblichen Entscheidungen.
- Kein Button ohne echte Aktion.
- Jede Liste/Karte/Tabelle besitzt Lade-, Leer-, Fehler- und Normalzustand.
