# Coverage-Ergebnis

Erzeugt mit `npm run test:coverage` und `node scripts/test-report.mjs`.

## JavaScript / TypeScript gesamt

| Metrik     | Abgedeckt / gesamt | Coverage |
| ---------- | -----------------: | -------: |
| lines      |        15337/16194 |    94.7% |
| statements |        16262/17368 |   93.63% |
| functions  |          4170/4559 |   91.46% |
| branches   |        11820/13059 |   90.51% |

Python-Transcriber: **100.00%** kombinierte Zeilen-/Zweigabdeckung.

## Zeilen pro Workspace

Die Zeilen-Grenze von 90% gilt zusätzlich für jeden Workspace. Statements, Funktionen und Zweige werden global geprüft.

| Workspace                   | Abgedeckt / gesamt | Coverage |
| --------------------------- | -----------------: | -------: |
| apps/admin-mac              |            136/140 |   97.14% |
| apps/cli                    |              22/23 |   95.65% |
| apps/realtime               |            858/888 |   96.62% |
| apps/transcriber-mac        |            158/160 |   98.75% |
| apps/web                    |          6697/7270 |   92.12% |
| packages/database           |          2831/2918 |   97.02% |
| packages/markdown-changelog |              92/92 |  100.00% |
| packages/realtime           |          2073/2152 |   96.33% |
| packages/service            |          1217/1264 |   96.28% |
| packages/ui                 |            605/625 |   96.80% |
| packages/utils              |            132/132 |  100.00% |
| packages/xrag               |            516/530 |   97.36% |

Proxy und Tika haben Konfigurationstests, aber keine instrumentierbaren JavaScript-Anweisungen.

Importanalyse: 1203 Quelldateien im Umfang; 80 Package-Dateien ohne eingehenden Produktionsimport; 112 Package-Dateien außerhalb des App-Graphen.

Die Liste ist in [unused-package-files.md](unused-package-files.md) dokumentiert. Externe Dienste sind an ihren Schnittstellen ersetzt; der Realtime-Persistenztest verwendet einen lokalen WebSocket-Server.
