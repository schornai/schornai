# November 2026

Finaler Release für November 2026. Web-App und Mac-Admin-App zeigen
**November 2026** ohne Release-Candidate-Zusatz. Die zugehörige CLI-Version ist
`schornai@0.5.0`.

**Veröffentlichungsstand:** Release in Vorbereitung. Der öffentliche
Setup-Endpunkt und npm-`latest` verweisen bei der Prüfung am 2. November 2026
noch auf RC3 beziehungsweise CLI `0.4.0`.

| Angabe         | Wert                                                |
| -------------- | --------------------------------------------------- |
| Branch         | `release/november-2026`                             |
| Ausgangscommit | `0cb49283e052f1d9a726becadcc79224585758f5` (`main`) |
| CLI            | `schornai@0.5.0`                                    |
| Setup-Datei    | `november-2026.xrag.tar`                            |
| Setup-Ziel     | macOS ARM64 (Apple Silicon)                         |

## Enthaltene Funktionen

- Gemeinsamer Maschinen-Service mit CLI, Mac-Admin-App, Dienststeuerung und
  Protokollen; Verwaltung von Services und Artefakten über die Cluster-Seiten.
- Automatische Erstinstallation mit `npx schornai` nach ausdrücklicher
  Bestätigung. Die Archivextraktion unterstützt gültige symbolische Linkketten
  und zeigt die Prüf- und Entpackphase an.
- Einrichtung des ersten Administrators nach einer neuen Installation oder
  mit `npx schornai service setup-admin`: E-Mail-Adresse eingeben, einmaligen
  Schlüssel auf `/signin/reset` verwenden und das Passwort festlegen. Ein
  Mailserver ist dafür nicht erforderlich. Vorhandene Benutzer verhindern die
  erneute Kontoanlage; bestehende Konten und Rollen bleiben unverändert.
- Zentrale Provider-Verbindungen und MCP-OAuth mit persönlichen Freigaben sowie
  Fortsetzung unterbrochener Chat-Anfragen.
- Veröffentlichung des Quellcodes unter AGPL-3.0-only im Repository
  [schornai/schornai](https://github.com/schornai/schornai).

## Installation und Aktualisierung

Die CLI benötigt Node.js ab Version 24. Für die Erstinstallation ist OpenSSL
erforderlich. Das finale Setup ist für Apple-Silicon-Macs vorgesehen; Linux
benötigt ein separat auf der passenden Architektur gebautes Bundle. Der
öffentliche Bootstrap-Endpunkt wählt weiterhin keine Plattform aus.

Nach der Veröffentlichung installiert `npx schornai` eine neue Instanz mit dem
aktuellen Setup. Bestehende Installationen zeigen ihren Status und werden nicht
automatisch aktualisiert. Globale Administratorinnen und Administratoren
können das passende XRAG nach einer konsistenten Sicherung unter
**Einstellungen → XRAG hochladen** bereitstellen. Ein erfolgreicher Upload
bestätigt noch keine abgeschlossene Installation. Datenbankmigrationen werden
nicht durch ein älteres Bundle automatisch rückgängig gemacht.

## Bekannte Einschränkungen und Prüfungen

Der vollständige manuelle Erstinstallationstest auf einem separaten Mac wird
auf ausdrücklichen Wunsch für diesen Release ausgelassen. Automatisierte
Archiv-, CLI- und Darstellungstests bestätigen keine vollständige Erstinstallation
oder Aktualisierung einer bestehenden Instanz. Mac-Signierung und Notarisierung
sind weiterhin nicht konfiguriert. Modelle, Mailversand sowie öffentliche Domain
und TLS-Zertifikate werden separat eingerichtet.

Siehe [CLI](../de/cli/index.md), [Service und Mac-App](../de/box-admin/index.md),
[Provider-Verbindungen](../de/settings/connections.md) und
[Release-Checkliste](../../RELEASE_CHECKLIST.md).
