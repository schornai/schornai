# Coverage-Ergebnis

Erzeugt mit `npm run test:coverage` und `node scripts/test-report.mjs`.

## JavaScript / TypeScript gesamt

| Metrik     | Abgedeckt / gesamt | Coverage |
| ---------- | -----------------: | -------: |
| lines      |        15358/16214 |   94.72% |
| statements |        16283/17388 |   93.64% |
| functions  |          4173/4561 |   91.49% |
| branches   |        11840/13077 |   90.54% |

Python-Transcriber: **100.00%** kombinierte Zeilen-/Zweigabdeckung.

## Zeilen pro Workspace

Die Zeilen-Grenze von 90% gilt zusätzlich für jeden Workspace. Statements, Funktionen und Zweige werden global geprüft.

| Workspace                   | Abgedeckt / gesamt | Coverage |
| --------------------------- | -----------------: | -------: |
| apps/admin-mac              |            136/140 |   97.14% |
| apps/cli                    |              22/23 |   95.65% |
| apps/realtime               |            861/891 |   96.63% |
| apps/transcriber-mac        |            158/160 |   98.75% |
| apps/web                    |          6709/7283 |   92.12% |
| packages/database           |          2834/2921 |   97.02% |
| packages/markdown-changelog |              92/92 |  100.00% |
| packages/realtime           |          2076/2153 |   96.42% |
| packages/service            |          1217/1264 |   96.28% |
| packages/ui                 |            605/625 |   96.80% |
| packages/utils              |            132/132 |  100.00% |
| packages/xrag               |            516/530 |   97.36% |

Proxy und Tika haben Konfigurationstests, aber keine instrumentierbaren JavaScript-Anweisungen.

Importanalyse: 1203 Quelldateien im Umfang; 80 Package-Dateien ohne eingehenden Produktionsimport; 112 Package-Dateien außerhalb des App-Graphen.

Die Liste ist in [unused-package-files.md](unused-package-files.md) dokumentiert. Externe Dienste sind an ihren Schnittstellen ersetzt; der Realtime-Persistenztest verwendet einen lokalen WebSocket-Server.
