# Coverage-Ergebnis

Erzeugt mit `npm run test:coverage` und `node scripts/test-report.mjs`.

## JavaScript / TypeScript gesamt

| Metrik     | Abgedeckt / gesamt | Coverage |
| ---------- | -----------------: | -------: |
| lines      |        11002/11646 |   94.47% |
| statements |        11600/12399 |   93.55% |
| functions  |          3138/3438 |   91.27% |
| branches   |          8134/9026 |   90.11% |

Python-Transcriber: **93.81%** kombinierte Zeilen-/Zweigabdeckung.

## Zeilen pro Workspace

Die Zeilen-Grenze von 90% gilt zusätzlich für jeden Workspace. Statements, Funktionen und Zweige werden global geprüft.

| Workspace                   | Abgedeckt / gesamt | Coverage |
| --------------------------- | -----------------: | -------: |
| apps/admin-mac              |            130/140 |   92.86% |
| apps/cli                    |              22/23 |   95.65% |
| apps/realtime               |            623/641 |   97.19% |
| apps/transcriber-mac        |            156/160 |   97.50% |
| apps/web                    |          5554/5988 |   92.75% |
| packages/database           |          1223/1259 |   97.14% |
| packages/markdown-changelog |              92/92 |  100.00% |
| packages/realtime           |          1119/1168 |   95.80% |
| packages/service            |          1099/1134 |   96.91% |
| packages/ui                 |            572/620 |   92.26% |
| packages/utils              |            132/132 |  100.00% |
| packages/xrag               |            280/289 |   96.89% |

Proxy und Tika haben Konfigurationstests, aber keine instrumentierbaren JavaScript-Anweisungen.

Importanalyse: 924 Quelldateien im Umfang; 93 Package-Dateien ohne eingehenden Produktionsimport; 128 Package-Dateien außerhalb des App-Graphen.

Die Liste ist in [unused-package-files.md](unused-package-files.md) dokumentiert. Externe Dienste sind an ihren Schnittstellen ersetzt; der Realtime-Persistenztest verwendet einen lokalen WebSocket-Server.
