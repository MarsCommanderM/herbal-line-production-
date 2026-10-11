# 10 — Asset-Pipeline und Lizenz-Gate

## 1. Pipeline

1. Briefing und Asset-ID definieren: Funktion, Maßstab, LOD, Interaktion, Zielplattform, Material, Animation, Kamera.
2. Herkunft festhalten: intern erstellt, beauftragt, gekauft, Open Source oder sonstige Lizenz.
3. Source-Dateien kontrollieren; Einheiten/Koordinaten/Normals/UV/Materialnamen prüfen.
4. In glTF/GLB exportieren, falls passend; Texturen komprimieren und Mipmaps erzeugen; Meshes prüfen; Audio normalisieren/komprimieren.
5. Importtest mit dem festgelegten Build-Tool, Logs speichern, Dateigröße und Laufzeit prüfen.
6. Hash, Quellenreferenz, Lizenz, Urheber/Creator, Asset-Owner und Änderungsdatum in Manifest eintragen.
7. Visuelle und technische QA (Renderer, Schatten, Skalierung, Collision Proxy, Interaktion).
8. Nur freigegebene Assets aus dem Manifest werden in Release eingebunden.

## 2. Asset-Register

Jede Datei unter `public/assets` oder Game-Asset-Ordner braucht einen Registereintrag in `rights/IP_REGISTER.csv` oder einem maschinenlesbaren Asset-Manifest: `asset_id`, `path`, `sha256`, `creator_or_source`, `acquired_at`, `license_id`, `license_url_or_proof`, `allowed_use`, `redistribution_allowed`, `modification_allowed`, `attribution_required`, `reviewer`, `status`.

## 3. No-go

- Kein Asset unbekannter Herkunft.
- Keine weitergereichte fremde Font-/Texture-/Model-Datei ohne Rechtebeleg.
- Keine aus Webseiten gezogene Bilder oder Soundfiles ohne geprüfte Nutzungserlaubnis.
- Kein Verstecken unklarer Lizenzen in einer allgemeinen Notiz.
- Keine KI-generierten Assets als „sicher frei von Rechten“ darstellen; Quellenbedingungen und menschliche Beiträge dokumentieren.
- Keine echten Logos, pharmazeutischen Marken oder geschützten Design-Imitationen ohne Freigabe.

## 4. Release-Gate

`ASSET_LICENSE_GATE=PASS` erfordert: keine `unknown`-/`pending`-Assets, gültige Hashes, Lizenzen samt Belegen vorhanden, Attributionen automatisiert im Third-Party-Notices-File, bekannte Pfade nur aus freigegebenem Manifest, keine fehlenden Texturen oder stillen Asset-Fallbacks. Eine fehlende Lizenz ist ein Release-Blocker, kein nachträglicher Task.