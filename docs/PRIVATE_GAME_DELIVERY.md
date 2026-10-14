# Persönlicher Spiel-Build — DopeFarm

Diese Bereitstellung dient ausschließlich dem privaten Spielen mit dem Projektinhaber und wenigen Freunden. Es ist keine Vermarktung oder kommerzielle Veröffentlichung vorgesehen.

## Direkt spielen

Der aktuelle Browser-Build wird über GitHub Pages bereitgestellt. Die Website ist eine öffentliche URL ohne Suchmaschinen- oder Zugangskontrollgarantie; wer den Link kennt, kann sie öffnen. Keine Passwörter oder persönlichen Daten ins Spiel eingeben.

## Desktop-ZIP

Die CI erzeugt `dist/DopeFarm-Desktop.zip` mit:
- dem gebauten Spiel,
- `start-game.bat` und `serve-game.ps1` für einen lokalen Windows-Webserver,
- einer lokalen Startanleitung,
- vollständigen mitgelieferten Drittanbieter-Lizenzhinweisen.

Nach dem Entpacken `start-game.bat` doppelklicken und das Serverfenster geöffnet lassen. Das Spiel startet im Browser unter `http://127.0.0.1:4173`.

## Kostenloser Betrieb

Es werden keine kostenpflichtigen Assets oder Domains gekauft. Die Veröffentlichung verwendet GitHub Pages für dieses öffentliche Repository. Das ZIP ist ein statischer Browser-Build, keine native Windows-EXE.

## Reproduzierbarkeit

Die Pages-Bereitstellung baut exakt den Commit aus, der den Workflow ausgelöst hat. Der Workflow ist auf dem Projektbranch aktiv und ändert weder `main` noch den Merge-Status von PR #26.
