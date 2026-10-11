# 17 — Name, Urheberrecht, Nutzungsrechte und rechtliche Produktchecks

## 1. Projektidentität und vorgesehene Copyright-Zeile

Vorgegebene Projektmetadaten:

`Herbal Line — Copyright © 2026 Michael Braunschweig. All rights reserved.`

Diese Zeile wird als gewünschte Projektangabe in die Unterlagen übernommen. Sie beweist nicht von selbst, dass alle Beiträge, Assets, Fonts, Sounds, Codebestandteile, Markenrechte oder Auftragsarbeiten tatsächlich exklusiv dem Genannten zustehen. Der Hauptagent muss die Herkunft jedes Beitrags und jede eingeräumte Nutzungsrechtelage erfassen, anstatt aus dem Namen im Manifest Eigentum abzuleiten.

## 2. Rechte-Register ist Pflicht

`rights/IP_REGISTER.csv` ist die Quelle für den Freigabestatus. Es unterscheidet:
- **AUTHORSHIP/CONTRIBUTOR:** wer einen konkreten Beitrag erstellt hat;
- **COPYRIGHT/RELATED RIGHTS:** Rechte an Text, Code, Musik, Bild, Modell, Animation, Font und sonstigen Werken;
- **LICENSE/USAGE RIGHTS:** Nutzungsumfang, Dauer, Gebiet, Bearbeitung, Unterlizenzierung und Weiterverbreitung, soweit durch Beleg gedeckt;
- **TRADEMARK/BRAND:** Produkt-/Studio-/Logo-/Figuren-/Produktnamen und mögliche Verwechslungsgefahr;
- **THIRD-PARTY DEPENDENCIES:** Paketname, Version, Lizenz, Notice-Anforderungen und Inventar;
- **CONTRACTS/ASSIGNMENTS:** Verträge, Bestell-/Zahlungsbelege, Rechteübertragungen und Freigaben.

Jeder Eintrag besitzt Owner, Proof-Referenz, Prüfung und Status. Status `unknown` oder `pending` blockiert die Veröffentlichung des betreffenden Materials.

## 3. Copyright

Nach deutschem Urheberrechtsgesetz ist Urheber grundsätzlich der Schöpfer eines Werkes (§ 7 UrhG); Nutzungsrechte können eingeräumt werden (§ 31 UrhG). Der Agent darf keine nicht belegte Rechteübertragung, Auftragsklausel oder Einwilligung erfinden. Bei Teambeiträgen, Auftragsarbeit, fremden Repo-Commits oder KI-unterstützten Assets muss die tatsächliche Berechtigung anhand von Herkunft und Vertragslage geklärt werden.

## 4. Produktname und Marke

`Herbal Line` ist der Arbeits-/Produktname in diesem Dokument, aber nicht als markenrechtlich freigegeben gekennzeichnet. Vor öffentlicher kommerzieller Nutzung: Recherche nach identischen und ähnlichen Zeichen in relevanten Waren-/Dienstleistungsklassen und Gebieten (mindestens DPMAregister sowie, falls der Zielmarkt es erfordert, EUIPO/TMview/WIPO), Prüfung von Domains/Stores, Dokumentation der Suchstrategie und ggf. fachkundige Rechtsprüfung. Ein einfacher Treffer-freier Suchlauf ist keine Garantie der Verfügbarkeit.

## 5. Third-party dependencies

Vor jeder Release-Freigabe genaue Lockfile-Versionen und Paketlizenzen prüfen. Für Libraries wird ein Software Bill of Materials (SBOM) exportiert; Lizenztexte und Attributionen liegen im Third-Party-Notices-File. Lizenzstatus darf nicht allein aus dem Namen einer Bibliothek oder aus einer alten Recherche abgeleitet werden.

## 6. Medizin-/Arzneimittel-Compliance als Spielinhalt

Das Spiel stellt eine fiktive, regulierte Produktionskette dar. Es ist keine reale Betriebssoftware, keine arzneimittelrechtliche Standard Operating Procedure und keine pharmazeutische Herstellungsanweisung. QC-/Lizenzschwellen sind Spielwerte und dürfen nicht als reale GMP-, Arzneibuch-, Labor- oder Apothekenstandards dargestellt werden. Reale Behauptungen über medizinische Wirkung, konkrete Herstellungsverfahren oder aktuelle Zulassungsvorgaben gehören nicht in die Spielregeln ohne fachlich geprüfte Quellen und Rechtsreview.

## 7. Release-Gate und Entscheidung

Der Agent kann eine Inventarisierung und Recherche dokumentieren, aber darf keine anwaltliche Bestätigung oder endgültige Marken-/Rechtegarantie behaupten. Release muss bei unbekannter Rechteinhaberschaft, fehlendem Beleg, unklarer Lizenz, ungeklärtem Markenkonflikt oder unzulässiger Verwendung angehalten werden. Bei Zweifeln ein Ersatzasset/-name mit belegter Nutzungserlaubnis wählen.