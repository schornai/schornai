# Coverage-Ergebnis

Erzeugt mit `npm run test:coverage` und `node scripts/test-report.mjs`.

## JavaScript / TypeScript gesamt

| Metrik     | Abgedeckt / gesamt | Coverage |
| ---------- | -----------------: | -------: |
| lines      |        15428/16299 |   94.65% |
| statements |        16365/17490 |   93.56% |
| functions  |          4182/4574 |   91.42% |
| branches   |        11934/13187 |   90.49% |

Python-Transcriber: **100.00%** kombinierte Zeilen-/Zweigabdeckung.

## Zeilen pro Workspace

Die Zeilen-Grenze von 90% gilt zusätzlich für jeden Workspace. Statements, Funktionen und Zweige werden global geprüft.

| Workspace                   | Abgedeckt / gesamt | Coverage |
| --------------------------- | -----------------: | -------: |
| apps/admin-mac              |            136/140 |   97.14% |
| apps/cli                    |              22/23 |   95.65% |
| apps/realtime               |            860/890 |   96.63% |
| apps/transcriber-mac        |            158/160 |   98.75% |
| apps/web                    |          6715/7295 |   92.05% |
| packages/database           |          2896/2993 |   96.76% |
| packages/markdown-changelog |              92/92 |  100.00% |
| packages/realtime           |          2079/2155 |   96.47% |
| packages/service            |          1217/1264 |   96.28% |
| packages/ui                 |            605/625 |   96.80% |
| packages/utils              |            132/132 |  100.00% |
| packages/xrag               |            516/530 |   97.36% |

Proxy und Tika haben Konfigurationstests, aber keine instrumentierbaren JavaScript-Anweisungen.

Importanalyse: 1207 Quelldateien im Umfang; 80 Package-Dateien ohne eingehenden Produktionsimport; 112 Package-Dateien außerhalb des App-Graphen.

Die Liste ist in [unused-package-files.md](unused-package-files.md) dokumentiert. Externe Dienste sind an ihren Schnittstellen ersetzt; der Realtime-Persistenztest verwendet einen lokalen WebSocket-Server.
