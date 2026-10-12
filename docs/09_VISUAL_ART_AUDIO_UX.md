# 09 — Visual Direction, UI, Audio und UX

## 1. Art Direction

**Identität:** klinisch, industriell, kontrolliert, hochwertig und ruhig. Graphit-/Nachtblau als Grundfläche, helle Laborflächen, entsättigte Metalltöne, klare Glasflächen und sparsame Cyan-/Violett-Akzente. Der Raum soll wie eine professionelle, streng kontrollierte Anlage wirken, nicht wie ein neonfarbener Arcade-Blockout.

- Materialien: PBR mit überprüfbarer Roughness/Metalness, sauberen Normalen, korrekter Skalierung und konsistenter Texeldichte.
- Beleuchtung: definierte Key/Fill/Rim-Lichtrollen; Schatten selektiv und nach Leistungsbudget. Bloom nur für tatsächliche Emissive-Quellen und UI-Akzente, nicht als Ersatz für Materialqualität.
- Kamera: managementorientierte isometrische/perspektivische Ansicht mit weichem Pan/Zoom, Fokus auf Raum oder Entität, stabilen Grenzen und gut lesbaren Arbeitsflächen.
- Produktionsobjekte besitzen tatsächliche Silhouette, Material, Maßstab und Interaktion. Platzhalterformen sind in Dev-Tools zulässig, niemals als endgültige Visuals einer als abgeschlossen deklarierten Release-Feature.
- Animationsprinzip: minimal, lesbar, ursachenbezogen; kein permanentes Pulsieren oder jitterndes UI.

## 2. UI-System

PixiJS rendern lassen wir das Management-HUD. Eine HTML-Accessibility-Schicht (semantische Buttons, Fokusziele, Texte) umgibt wesentliche Bedienpunkte, damit Pixi-only-Canvas nicht zur Accessibility-Sackgasse wird.

Screens: Boot/Loading, Main Menu, New/Load Game, Operations Dashboard, Facility View, Production Queue, Source & Inventory, Batch Traceability, Quality & Release, Orders & Delivery, Compliance & Audits, Staff & Assignments, Facilities/Upgrades, Finance & Ledger, Reports/History, Settings/Accessibility, Pause, Save Recovery, Error Recovery, Credits/Legal.

HUD-Hierarchie:
1. Top Bar: Spieltag/-zeit, Pause/Speed, Kasse, Reputation, Lizenz-/Compliance-Zustand.
2. Facility Navigation: Räume, Maschinen, Wartungs-/Auslastungsstatus.
3. Arbeitsbereich: ausgewählte Produktionslinie/Facility mit Statusmarkers.
4. Detailinspector: Zustand, geblockte Aktionen, nächste fällige Schritte, Historie.
5. Queue/Alerts: Fristen, QC, Ausfälle, Audits, stockende Aufträge.
6. Report-Panels: Trend und Ursache, immer mit Zeitraum/Einheit und erklärbaren Regeln.

## 3. Informationsdesign

- Status ist nie allein über Farbe codiert: zusätzlich Icon, Textlabel und Tooltip.
- Statusfarben sind konsistent: Neutral/Info, Success, Warning, Critical; Farbwerte aus Tokens.
- Primäraktionen sind sichtbar; gefährliche/irreversible Spielaktionen bekommen eine Bestätigung und klare Auswirkung.
- Jede blockierte Aktion erklärt einen Code in natürlicher Sprache: z. B. „Freigabe gesperrt: Qualitätsprüfung fehlt“.
- Zahlen zeigen Einheiten, Bereich und Rundungsregeln. Geld zeigt Spielwährung; das Spiel behauptet keine reale Marktpreisliste.
- Charts benötigen Titel, Zeitraum, Achsen, Werteformat, leere Zustände und Screenreader-Zusammenfassung.

## 4. Motion & Feedback

Motion wird aus einer zentralen Token-Sammlung festgelegt: kurze Übergänge für Panels, längere Navigationstransitions, reduzierte Bewegung nach Betriebssystempräferenz. Nicht jede Render-Frame-Aktualisierung baut den gesamten UI-Tree neu auf. Transitions werden auf State-Änderung getrieben; das UI vermeidet Full-Stage-Clear bei jedem Frame.

## 5. Audio

Layer: Raum-Ambience, Maschinen/Facility-Beds, UI-Feedback, Alerts, Musik. Lautstärkeregler je Kategorie, Master-Mute, keine Audio-Pflicht für wichtige Information. Audio kann jederzeit abgeschaltet werden; Alerts müssen visuell ebenso klar sein. Assets erhalten Lizenz/Quelle und Hash.

## 6. Visuelle Abnahme

Ein Feature ist visuell erst fertig, wenn: finaler Asset-Pfad geladen ist, Materialien plausibel wirken, die Szene bei Zielauflösung/DPR getestet ist, UI-Layouts bei vereinbarten Mindestmaßen funktionieren, Kontrast/Lesbarkeit dokumentiert sind, Assets optimiert wurden, keine Error-Console-Fehler auftreten und Screenshots/Videos aus dem echten Build die Abnahme belegen.


## Cannabis-Anlage und Interaktionssichtbarkeit

Die Umgebung muss eindeutig als professionelle medizinische Cannabis-Pflanzenproduktion lesbar sein. Referenzrichtung: großflächige, helle Indoor-Anlage mit Reihen erkennbarer Cannabis-Pflanzen, sichtbaren Lampen, Bewässerungsleitungen, Klima-/Lüftungstechnik und funktionalen Arbeitswegen. Keine Umbenennung in Kräuter-/Botanik-Simulation und keine neutralen Pflanzenmodelle als Ersatz für Cannabis.

Pflege ist eine räumliche, visuelle Interaktion: Spieler wählt eine Pflanze oder Gruppe in der 3D-Welt, öffnet ein kontextbezogenes Pflege-Overlay und löst die passende Spielaktion aus. Animation/Feedback zeigt beispielsweise Bewässerung, Lichtwechsel, Klimaänderung, Nährstoffgabe, Schnitt oder Stecklingsaktion. Zustand und Folgen werden am betroffenen Objekt sichtbar und zusätzlich barrierearm im UI erklärt. Diese Darstellungen verwenden nur fiktive Spielwerte, keine realen Produktionsvorgaben.
