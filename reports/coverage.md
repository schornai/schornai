# Coverage-Ergebnis

Erzeugt mit `npm run test:coverage` und `node scripts/test-report.mjs`.

## JavaScript / TypeScript gesamt

| Metrik     | Abgedeckt / gesamt | Coverage |
| ---------- | -----------------: | -------: |
| lines      |        12032/12604 |   95.46% |
| statements |        12699/13422 |   94.61% |
| functions  |          3450/3701 |   93.21% |
| branches   |          8857/9725 |   91.07% |

Python-Transcriber: **100.00%** kombinierte Zeilen-/Zweigabdeckung.

## Zeilen pro Workspace

Die Zeilen-Grenze von 90% gilt zusätzlich für jeden Workspace. Statements, Funktionen und Zweige werden global geprüft.

| Workspace                   | Abgedeckt / gesamt | Coverage |
| --------------------------- | -----------------: | -------: |
| apps/admin-mac              |            136/140 |   97.14% |
| apps/cli                    |              22/23 |   95.65% |
| apps/realtime               |            640/660 |   96.97% |
| apps/transcriber-mac        |            158/160 |   98.75% |
| apps/web                    |          5743/6140 |   93.53% |
| packages/database           |          1378/1415 |   97.39% |
| packages/markdown-changelog |              92/92 |  100.00% |
| packages/realtime           |          1751/1799 |   97.33% |
| packages/service            |          1100/1134 |   97.00% |
| packages/ui                 |            600/620 |   96.77% |
| packages/utils              |            132/132 |  100.00% |
| packages/xrag               |            280/289 |   96.89% |

Proxy und Tika haben Konfigurationstests, aber keine instrumentierbaren JavaScript-Anweisungen.

Importanalyse: 988 Quelldateien im Umfang; 96 Package-Dateien ohne eingehenden Produktionsimport; 131 Package-Dateien außerhalb des App-Graphen.

Die Liste ist in [unused-package-files.md](unused-package-files.md) dokumentiert. Externe Dienste sind an ihren Schnittstellen ersetzt; der Realtime-Persistenztest verwendet einen lokalen WebSocket-Server.
