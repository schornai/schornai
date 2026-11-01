# November 2026 Release Candidate 1

Release-Kandidat für die November-Ausgabe 2026. `schornai@0.2.0` und das
macOS-ARM64-Setup sind öffentlich verfügbar. Die veröffentlichte CLI hat den
unten beschriebenen Entpackfehler. Die Korrektur ist mit `schornai@0.3.0` in
[RC2](november-2026-release-candidate-2.md) veröffentlicht.

| Angabe                           | Wert                                               |
| -------------------------------- | -------------------------------------------------- |
| Branch                           | `release/november-2026-release-candidate-1`        |
| Ausgangsstand                    | `8888cf58409f4cd3e830d485e65571d9f935f9af` (`dev`) |
| CLI                              | `schornai@0.2.0`                                   |
| Setup-Datei                      | `november-2026-release-candidate-1.xrag.tar`       |
| Zunächst vorgesehenes Setup-Ziel | macOS ARM64 (Apple Silicon)                        |

## Enthaltene Änderungen

- Gemeinsamer Maschinen-Service mit CLI, Mac-Admin-App, Dienststeuerung und
  Protokollen; Verwaltung von Services und Artefakten über die Cluster-Seiten.
- Automatische Erstinstallation mit `npx schornai` nach ausdrücklicher Bestätigung
  der Installationsrückfrage. Bestehende Installationen zeigen ihren Status.
- Zentrale Provider-Verbindungen sowie MCP-OAuth mit persönlichen Freigaben,
  Verbindungsverwaltung und Fortsetzung unterbrochener Chat-Anfragen.
- Korrekturen an Berechtigungen, Werkzeugverfügbarkeit und mobilen Kopfzeilen.
- Anzeige dieses Release-Namens im Web-Footer und in der Mac-Admin-App.

## Voraussetzungen und bekannte Einschränkungen

- `schornai@0.2.0` kann das macOS-ARM64-Setup wegen gültiger symbolischer
  Linkketten in Ollama und Frameworks nicht vollständig entpacken. Der Download
  selbst funktioniert; ein Folgefehler beim Aufräumen kann die Ursache als
  `ENOTEMPTY` verdecken. Die Korrektur im aktuellen Quellstand entpackt zunächst
  Dateien und legt anschließend die geprüften Links unverändert an. Sie wartet
  vor der Fehlermeldung auf laufende Dateischreibvorgänge und zeigt nach dem
  Download die Prüf- und Entpackphase an. Diese Korrektur ist auf npm als
  `schornai@0.3.0` veröffentlicht.
- Die CLI benötigt Node.js ab Version 24. Für die Erstinstallation ist OpenSSL
  erforderlich. Modelle, Mailversand und öffentliche TLS-Zertifikate werden separat
  konfiguriert. Die lokale Installation verwendet ein selbstsigniertes Zertifikat.
- XRAG-Setups sind plattformspezifisch. Der Builder unterstützt macOS ARM64 und
  Linux ARM64/x64; weitere Plattformen benötigen einen nativen Build und eigene
  Installationstests vom selben Release-Commit.
- Der öffentliche Bootstrap-Endpunkt `https://schorn.ai/xrag/schornai/latest`
  erhält keine Plattformauswahl. Bis diese vorhanden ist, kann er nur ein
  festgelegtes Zielsystem bedienen. Das vorgesehene macOS-Setup ist nicht unter
  Linux verwendbar.
- Die Mac-App enthält derzeit keine konfigurierte Signierung oder Notarisierung.
- CLI, öffentlicher Setup-Download und interner XRAG-Katalog werden getrennt
  veröffentlicht. Ein erneuter Aufruf von `npx schornai` aktualisiert keine
  bestehende Installation.

## Installation und Aktualisierung

Der öffentliche Download-Endpunkt ist erreichbar. Die npm-Veröffentlichung
`0.2.0` erfolgte vor Abschluss des Erstinstallationstests auf einem separaten Mac.
Bei der anschließenden RC2-Veröffentlichung wurde dieser manuelle Test auf
ausdrücklichen Wunsch übersprungen; ein erfolgreicher Download- und Entpacktest
bestätigt keine vollständige Erstinstallation.

Bestehende Boxen werden nach einer konsistenten Sicherung über das passende
XRAG-Setup aktualisiert. Globale Administratorinnen und Administratoren können
dieses unter **Einstellungen → XRAG hochladen** veröffentlichen. Zunächst eine
Testinstanz prüfen; ein erfolgreicher Upload bestätigt noch keine abgeschlossene
Installation. Datenbankmigrationen werden nicht durch ein älteres Bundle
automatisch rückgängig gemacht.

Siehe [CLI](../de/cli/index.md), [Service und Mac-App](../de/box-admin/index.md),
[Provider-Verbindungen](../de/settings/connections.md) und
[Release-Checkliste](../../RELEASE_CHECKLIST.md).
