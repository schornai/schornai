# Coverage-Ergebnis

Erzeugt mit `npm run test:coverage` und `node scripts/test-report.mjs`.

## JavaScript / TypeScript gesamt

| Metrik | Abgedeckt / gesamt | Coverage |
| --- | ---: | ---: |
| lines | 13418/14158 | 94.77% |
| statements | 14188/15133 | 93.75% |
| functions | 3780/4121 | 91.72% |
| branches | 10297/11397 | 90.34% |

Python-Transcriber: **100.00%** kombinierte Zeilen-/Zweigabdeckung.

## Zeilen pro Workspace

Die Zeilen-Grenze von 90% gilt zusätzlich für jeden Workspace. Statements, Funktionen und Zweige werden global geprüft.

| Workspace | Abgedeckt / gesamt | Coverage |
| --- | ---: | ---: |
| apps/admin-mac | 136/140 | 97.14% |
| apps/cli | 22/23 | 95.65% |
| apps/realtime | 836/864 | 96.76% |
| apps/transcriber-mac | 158/160 | 98.75% |
| apps/web | 6284/6797 | 92.45% |
| packages/database | 1627/1685 | 96.56% |
| packages/markdown-changelog | 92/92 | 100.00% |
| packages/realtime | 2004/2065 | 97.05% |
| packages/service | 1230/1277 | 96.32% |
| packages/ui | 605/625 | 96.80% |
| packages/utils | 132/132 | 100.00% |
| packages/xrag | 292/298 | 97.99% |

Proxy und Tika haben Konfigurationstests, aber keine instrumentierbaren JavaScript-Anweisungen.

Importanalyse: 1093 Quelldateien im Umfang; 80 Package-Dateien ohne eingehenden Produktionsimport; 112 Package-Dateien außerhalb des App-Graphen.

Die Liste ist in [unused-package-files.md](unused-package-files.md) dokumentiert. Externe Dienste sind an ihren Schnittstellen ersetzt; der Realtime-Persistenztest verwendet einen lokalen WebSocket-Server.
