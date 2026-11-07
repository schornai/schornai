# Coverage-Ergebnis

Erzeugt mit `npm run test:coverage` und `node scripts/test-report.mjs`.

## JavaScript / TypeScript gesamt

| Metrik     | Abgedeckt / gesamt | Coverage |
| ---------- | -----------------: | -------: |
| lines      |        11727/12495 |   93.85% |
| statements |        12357/13298 |   92.92% |
| functions  |          3329/3665 |   90.83% |
| branches   |          8684/9638 |    90.1% |

Python-Transcriber: **93.81%** kombinierte Zeilen-/Zweigabdeckung.

## Zeilen pro Workspace

Die Zeilen-Grenze von 90% gilt zusätzlich für jeden Workspace. Statements, Funktionen und Zweige werden global geprüft.

| Workspace                   | Abgedeckt / gesamt | Coverage |
| --------------------------- | -----------------: | -------: |
| apps/admin-mac              |            130/140 |   92.86% |
| apps/cli                    |              22/23 |   95.65% |
| apps/realtime               |            637/660 |   96.52% |
| apps/transcriber-mac        |            156/160 |   97.50% |
| apps/web                    |          5523/6048 |   91.32% |
| packages/database           |          1350/1403 |   96.22% |
| packages/markdown-changelog |              92/92 |  100.00% |
| packages/realtime           |          1734/1794 |   96.66% |
| packages/service            |          1099/1134 |   96.91% |
| packages/ui                 |            572/620 |   92.26% |
| packages/utils              |            132/132 |  100.00% |
| packages/xrag               |            280/289 |   96.89% |

Proxy und Tika haben Konfigurationstests, aber keine instrumentierbaren JavaScript-Anweisungen.

Importanalyse: 983 Quelldateien im Umfang; 96 Package-Dateien ohne eingehenden Produktionsimport; 131 Package-Dateien außerhalb des App-Graphen.

Die Liste ist in [unused-package-files.md](unused-package-files.md) dokumentiert. Externe Dienste sind an ihren Schnittstellen ersetzt; der Realtime-Persistenztest verwendet einen lokalen WebSocket-Server.
