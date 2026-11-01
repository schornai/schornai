# Tests und Coverage

## Ausführen

Voraussetzungen: Node.js 24 (Vitest unterstützt auch Node 22.12+) und Python 3.

```sh
npm ci
python3 -m venv .test-venv
.test-venv/bin/python -m pip install -r requirements-test.txt
npm test
npm run test:coverage
```

Unter Windows liegt der Python-Interpreter in `.test-venv/Scripts/python.exe`.
`AIBOX_TEST_PYTHON` kann einen anderen Interpreter auswählen. Für normale Python-Tests
werden keine zusätzlichen Python-Pakete benötigt; für Coverage wird `coverage` benötigt.

`npm test` führt JavaScript/TypeScript- und Python-Tests aus. Der Coverage-Lauf verlangt
mindestens **90% Zeilen, Statements, Funktionen und Zweige** für den gesamten
JavaScript/TypeScript-Umfang und mindestens **90% kombinierte Zeilen-/Zweigabdeckung**
für den Python-Transcriber. Zusätzlich muss jede App und jedes verwendete Package mit
instrumentierbarem Code mindestens **90% Zeilenabdeckung** erreichen. Ein unterschrittener Grenzwert beendet den Lauf mit Fehler.
Ein einzelner Worker hält den Speicherbedarf auch auf Entwicklungsrechnern begrenzt.

Weitere Befehle:

- `npm run test:js -- tests/storage.test.ts` – ausgewählte Vitest-Tests.
- `npm run test:watch` – Watch-Modus.
- `npm run test:python` – Python-Tests.
- `npm run test:python:coverage` – Python-Coverage.
- `npm run test:scope` – Importanalyse und Liste möglicherweise ungenutzter Dateien.

Die HTML-Berichte liegen in `coverage/index.html` und `coverage/python/index.html`.
Die JSON-Berichte liegen in `coverage/coverage-summary.json`,
`coverage/coverage-final.json` und `coverage/python/coverage.json`.

## Umfang und Testgrenzen

`scripts/test-scope.mjs` untersucht Produktionsimporte mit dem TypeScript-Parser.
Alle Quelldateien in `apps` sowie transitiv verwendete Package-Dateien gehören zum
Coverage-Umfang, auch wenn bisher kein Test sie ausführt. Type-only-Dateien haben keine
instrumentierbaren Anweisungen. Build-Ausgaben, Tests und Tool-Konfigurationen werden
nicht als Anwendungscode gemessen. Neue Dateien und Importe werden automatisch erfasst.

`apps/proxy` und `apps/document-extractor` bestehen aus Dienst-/Container-Konfigurationen. Ihre
Routing-, WebSocket- und Port-Verträge werden getestet; dafür gibt es keine prozentuale
JavaScript-Coverage. Der Python-Kern wird separat mit Branch-Coverage gemessen.

Die Tests prüfen unter anderem reale Yjs-Dokumente, Persistenz über einen lokalen
WebSocket-Server, Queue-Zustände und Abbruchverhalten, Storage-Pfadgrenzen, Server-Actions,
API-Routen, React-Formulare, Dateiuploads und UI-Zustände. Supabase, Modellserver, Tika,
MCP und Python-Prozessstarts werden an den externen Schnittstellen ersetzt. Dadurch
werden keine produktiven Daten oder Dienste benötigt. Unerwartete `fetch`-Aufrufe
schlagen im Test fehl. Der WebSocket-Integrationstest benötigt Zugriff auf localhost.

Die vier globalen Coverage-Werte gelten für den gesamten ermittelten Umfang;
die Zeilen-Grenze wird zusätzlich pro Workspace geprüft. Es gibt keine
90%-Grenze für jede einzelne Datei. Prüfe Änderungen an Dienstintegrationen
zusätzlich in der laufenden Anwendung mit Supabase, Ollama, Tika beziehungsweise
dem macOS/MLX-Transcriber; die Unit-Tests ersetzen diese Schnittstellen durch Mocks.

## Möglicherweise ungenutzte Dateien

Siehe [reports/unused-package-files.md](reports/unused-package-files.md) und die
maschinenlesbare Analyse [reports/test-scope.json](reports/test-scope.json).

Die erste Liste enthält Package-Dateien ohne eingehenden Produktionsimport.
Die zweite enthält Dateien außerhalb des App-Abhängigkeitsgraphen, die beispielsweise
zu eigenständigen Package-Anwendungen gehören können. Testimporte gelten nicht als
Produktionsnutzung. Re-Exports, Type-Imports und literale dynamische Importe zählen mit.
Framework-Einstiegspunkte, Konfigurationen und nichtliterale dynamische Importe müssen
vor einer Löschung manuell geprüft werden.

Einige alte Realtime-Beispieldateien referenzieren inzwischen fehlende interne Module.
Diese Importe werden im Bericht aufgeführt; die App-Dateien bleiben im Coverage-Umfang.
Die historischen Beispiel-Tests ersetzen die nicht mehr vorhandenen Schnittstellen
explizit durch Test-Doubles. Sie bestätigen das Verhalten des Beispiels, aber nicht
die Ausführbarkeit seiner heutigen Produktionsimporte.
