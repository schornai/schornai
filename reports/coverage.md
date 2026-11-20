# Coverage-Ergebnis

Erzeugt mit `npm run test:coverage` und `node scripts/test-report.mjs`.

## JavaScript / TypeScript gesamt

| Metrik     | Abgedeckt / gesamt | Coverage |
| ---------- | -----------------: | -------: |
| lines      |        15191/16041 |    94.7% |
| statements |        16110/17204 |   93.64% |
| functions  |          4152/4542 |   91.41% |
| branches   |        11688/12909 |   90.54% |

Python-Transcriber: **100.00%** kombinierte Zeilen-/Zweigabdeckung.

## Zeilen pro Workspace

Die Zeilen-Grenze von 90% gilt zusätzlich für jeden Workspace. Statements, Funktionen und Zweige werden global geprüft.

| Workspace                   | Abgedeckt / gesamt | Coverage |
| --------------------------- | -----------------: | -------: |
| apps/admin-mac              |            136/140 |   97.14% |
| apps/cli                    |              22/23 |   95.65% |
| apps/realtime               |            858/888 |   96.62% |
| apps/transcriber-mac        |            158/160 |   98.75% |
| apps/web                    |          6671/7244 |   92.09% |
| packages/database           |          2756/2837 |   97.14% |
| packages/markdown-changelog |              92/92 |  100.00% |
| packages/realtime           |          2073/2152 |   96.33% |
| packages/service            |          1215/1262 |   96.28% |
| packages/ui                 |            605/625 |   96.80% |
| packages/utils              |            132/132 |  100.00% |
| packages/xrag               |            473/486 |   97.33% |

Proxy und Tika haben Konfigurationstests, aber keine instrumentierbaren JavaScript-Anweisungen.

Importanalyse: 1201 Quelldateien im Umfang; 80 Package-Dateien ohne eingehenden Produktionsimport; 112 Package-Dateien außerhalb des App-Graphen.

Die Liste ist in [unused-package-files.md](unused-package-files.md) dokumentiert. Externe Dienste sind an ihren Schnittstellen ersetzt; der Realtime-Persistenztest verwendet einen lokalen WebSocket-Server.
