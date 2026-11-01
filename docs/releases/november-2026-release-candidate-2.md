# November 2026 Release Candidate 2

Zweiter Release-Kandidat für November 2026. Das macOS-ARM64-Setup und
`schornai@0.3.0` sind seit 28. Oktober 2026 öffentlich verfügbar. npm-`latest`
verweist auf `0.3.0`. Der bestehende Branch wird mit der Entpackkorrektur fortgeführt.

| Angabe         | Wert                                             |
| -------------- | ------------------------------------------------ |
| Branch         | `release/november-2026-release-candidate-1`      |
| Ausgangscommit | `0afd7dfb0c1a4f29c37200109532efd350e1b1c2` (RC1) |
| CLI            | `schornai@0.3.0`                                 |
| Setup-Datei    | `november-2026-release-candidate-2.xrag.tar`     |
| Setup-Ziel     | macOS ARM64 (Apple Silicon)                      |

## Änderungen gegenüber RC1

- Gültige symbolische Linkketten in Ollama und macOS-Frameworks lassen sich
  entpacken. Dateien werden zuerst extrahiert, anschließend werden die geprüften
  Links mit unverändertem Ziel angelegt. Die Pfad- und Linkprüfungen bleiben aktiv.
- Bei Fehlern einzelner Archiveinträge wartet die Extraktion auf noch laufende
  Dateischreibvorgänge. Dadurch verdeckt das anschließende Aufräumen den Fehler
  nicht mehr mit `ENOTEMPTY`.
- Die CLI kennzeichnet den Wechsel vom abgeschlossenen Download zur Prüfung
  und zum Entpacken ausdrücklich.
- Web-Footer und Mac-Admin-App zeigen **November 2026 Release Candidate 2**.

## Installation und Veröffentlichung

Das Setup ist für macOS ARM64 gebaut. Node.js ab Version 24 und OpenSSL werden
für den Bootstrap benötigt. Linux benötigt ein eigenes natives Setup-Bundle.
Der öffentliche Bootstrap-Endpunkt wählt weiterhin keine Plattform aus.

Der öffentliche Download-Endpunkt `https://schorn.ai/xrag/schornai/latest`
verweist auf das RC2-Archiv. `npx --yes schornai@0.3.0` verwendet gezielt die
korrigierte CLI. Der vollständige öffentliche Archivdownload und die
npm-Paketprüfsummen stimmen mit den geprüften Release-Dateien überein.

Der manuelle Erstinstallationstest auf einem separaten Mac wurde für RC2 auf
ausdrücklichen Wunsch übersprungen. Der automatisierte Download- und Entpacktest
sowie CLI-Startprüfungen waren erfolgreich; eine vollständige Erstinstallation
ist dadurch nicht bestätigt. Mac-Signierung und Notarisierung sind weiterhin nicht
konfiguriert. Bestehende Installationen werden durch `npx schornai` nicht
automatisch aktualisiert.

Für bestehende Boxen gelten die Sicherungs- und Updatehinweise aus
[RC1](november-2026-release-candidate-1.md). Siehe außerdem
[CLI](../de/cli/index.md), [Service und Mac-App](../de/box-admin/index.md) und
[Release-Checkliste](../../RELEASE_CHECKLIST.md).
