# Coverage-Ergebnis

Erzeugt mit `npm run test:coverage` und `node scripts/test-report.mjs`.

## JavaScript / TypeScript gesamt

| Metrik | Abgedeckt / gesamt | Coverage |
| --- | ---: | ---: |
| lines | 5418/5702 | 95.01% |
| statements | 5634/5931 | 94.99% |
| functions | 1980/2130 | 92.95% |
| branches | 3627/4006 | 90.53% |

Python-Transcriber: **94.44%** kombinierte Zeilen-/Zweigabdeckung.

## Zeilen pro Workspace

Die Zeilen-Grenze von 90% gilt zusätzlich für jeden Workspace. Statements, Funktionen und Zweige werden global geprüft.

| Workspace | Abgedeckt / gesamt | Coverage |
| --- | ---: | ---: |
| apps/realtime | 413/418 | 98.80% |
| apps/transcriber-mac | 84/84 | 100.00% |
| apps/web | 3072/3309 | 92.84% |
| packages/database | 622/629 | 98.89% |
| packages/markdown-changelog | 92/92 | 100.00% |
| packages/realtime | 474/482 | 98.34% |
| packages/ui | 524/551 | 95.10% |
| packages/utils | 137/137 | 100.00% |

Proxy und Tika haben Konfigurationstests, aber keine instrumentierbaren JavaScript-Anweisungen.

Importanalyse: 639 Quelldateien im Umfang; 110 Package-Dateien ohne eingehenden Produktionsimport; 199 Package-Dateien außerhalb des App-Graphen.

Die Liste ist in [unused-package-files.md](unused-package-files.md) dokumentiert. Externe Dienste sind an ihren Schnittstellen ersetzt; der Realtime-Persistenztest verwendet einen lokalen WebSocket-Server.
