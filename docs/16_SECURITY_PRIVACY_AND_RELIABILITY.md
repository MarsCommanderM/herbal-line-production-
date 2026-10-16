# 16 — Security, Privacy und Reliability

## 1. Threat model

Das Spiel läuft zunächst lokal im Browser. Zu schützen sind lokale Spielstände, Projektgeheimnisse, Drittanbieter-Assets, Update-/Save-Integrität und die Zuverlässigkeit der Simulation. Es gibt keine absichtliche Übertragung personenbezogener Nutzerdaten. Ohne gesondert genehmigte Produktentscheidung gibt es kein Tracking, Konto, Backend oder Telemetrie-Upload.

## 2. Security-Baseline

- Secrets kommen ausschließlich aus geeigneten, nicht versionierten lokalen Umgebungsvariablen/Secret Stores. Ein `.env.example` enthält nur offensichtlich nicht geheime Beispiele.
- Vor Commit laufen Secret Scan, Dependency Audit und Prüfung neuer/aktualisierter Pakete.
- Eingaben werden an jeder Grenze validiert: Commands, importierte Saves, Datenkataloge, Konfigurationsdateien und externe Asset-Metadaten.
- Kein unsicheres `innerHTML` mit Daten, die aus Saves, Content oder Nutzereingaben stammen. Bevorzuge sichere Textknoten/Renderer-Textfelder; wenn HTML nötig ist, explizit sanitizen.
- Kein `eval`, dynamischer Code aus Save-Dateien oder ungeprüfter URL-Import.
- Keine persönlichen Daten in Logs, Screenshots, Testreports oder Agentenprompts.
- Fehler zeigen nutzerverständlichen Text und eine Korrelations-/Fehler-ID, nie Stacktraces als einziges Recovery-Interface.
- Kein unbestätigtes automatisches Download-/Update-Installieren.

## 3. Save-Sicherheit

Save-Dateien gelten als nicht vertrauenswürdig. Import: Größenlimit → JSON parse → Schema-Check → Hash-/Integritätsprüfung → Migration → semantische Prüfung aller IDs/Referenzen/Zahlen/State-Machines → atomare Übernahme. Unbekanntes höheres Schema darf nicht herabmigriert werden. Der letzte valide Autosave bleibt bis zur vollständigen Bestätigung unverändert.

Checksums erkennen zufällige Beschädigung, sie sind keine kryptographische Authentisierung gegen absichtliche Manipulation. Das Produkt verspricht daher keinen Cheat-/Manipulationsschutz, solange keine signierte Serverautorität existiert.

## 4. Reliability

- Domänen-Commands sind atomar und idempotent, wo Retry möglich ist.
- Zustandsänderungen sind von render/physics failure entkoppelt.
- Hintergrund-Tab-Verhalten, Schlaf-/Resume, niedrige Framerate und extreme `dt`-Werte haben feste Regeln.
- Save-Fehler verursachen sichtbaren Warnstatus und begrenzten Retry mit Backoff; es gibt kein endloses, unsichtbares Retry.
- Logwachstum ist begrenzt; auditrelevante Records dürfen nicht durch UI-Notification-Limits gelöscht werden.
- Fehler in einem nicht kritischen Asset sollen sicher isoliert sein; wichtige UI/State-Status müssen ohne den betreffenden Effekt weiter lesbar bleiben.

## 5. Incident-Verfahren

1. Problem reproduzieren und Version/Revision erfassen.
2. Auswirkung und Datenintegrität einschätzen; bei Save-/Release-/Compliance-Risiko sofort Release stoppen.
3. Sichere Reproduktion mit anonymisierten Testdaten erstellen.
4. Ursachenanalyse, minimaler Fix, Regressionstest.
5. Finale Checks ausführen, Hotfix changeloggen und bekannte Auswirkungen dokumentieren.
6. Nach relevantem Produktionsvorfall Postmortem mit Ursache, Detektion, Schutzmaßnahme und Owner führen; keine Schuldzuweisung als Ersatz für technische Ursachen.

## 6. Datenschutz und Telemetrie

Standard: lokal-only, keine Nutzeraccounts und keine Servertelemetrie. Falls später Telemetrie beschlossen wird, vor Implementierung Zweck, Rechtsgrundlage, Datenfelder, Speicherdauer, Opt-in/Opt-out, Hosting, Löschpfad und Datenschutzhinweise prüfen. Nur minimale, aggregierte, nicht direkt identifizierende Metriken senden. Ohne diesen Gate-Entscheid bleibt die Funktion aus.
