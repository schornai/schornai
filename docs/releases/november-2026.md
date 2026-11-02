# November 2026

Finaler Release für November 2026. Web-App und Mac-Admin-App zeigen
**November 2026** ohne Release-Candidate-Zusatz. Die zugehörige CLI-Version ist
`schornai@0.5.0`.

Veröffentlicht am **2. November 2026**. Der öffentliche
[Setup-Endpunkt](https://schorn.ai/xrag/schornai/latest) liefert das finale
macOS-ARM64-Setup. Das Paket wurde am selben Tag mit der unten beschriebenen
Datenbankkorrektur unter derselben Adresse ersetzt. npm-`latest` verweist auf
[`schornai@0.5.0`](https://www.npmjs.com/package/schornai/v/0.5.0), damit direkte
CLI-Starts ebenfalls die korrigierte Dienstlogik verwenden.

| Angabe          | Wert                                                |
| --------------- | --------------------------------------------------- |
| Branch          | `release/november-2026`                             |
| Ausgangscommit  | `0cb49283e052f1d9a726becadcc79224585758f5` (`main`) |
| Basis-Build     | `80a7a663492b4b2471e9bc11cb6e5ac96820e1bf`          |
| Öffentliche CLI | `schornai@0.5.0`                                    |
| Setup-Datei     | `november-2026.xrag.tar`                            |
| Setup-Ziel      | macOS ARM64 (Apple Silicon)                         |

## Enthaltene Funktionen

- Automatische Übernahme bestehender PostgreSQL-15-Daten in das Docker-Volume
  `supabase_db-data`. Neue Installationen verwenden dieses Volume direkt.
  Ein unterbrochener Import bleibt wiederholbar; die bisherigen Dateien werden
  nicht gelöscht. Datenbankstart und Dateizugriffe werden geprüft, der erste
  Start erhält bis zu 30 Minuten für Supabase und höchstens 40 Minuten insgesamt.
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

`npx schornai` installiert eine neue Instanz mit dem
aktuellen Setup. Bestehende Installationen zeigen ihren Status und werden nicht
automatisch aktualisiert. Globale Administratorinnen und Administratoren
können das passende XRAG nach einer konsistenten Sicherung unter
**Einstellungen → XRAG hochladen** bereitstellen. Ein erfolgreicher Upload
bestätigt noch keine abgeschlossene Installation. Datenbankmigrationen werden
nicht durch ein älteres Bundle automatisch rückgängig gemacht.

Der reguläre XRAG-Updateweg und die Mac-App verwenden den neu mitgelieferten
Dienst. CLI `0.5.0` enthält dieselbe Dienstlogik für direkte Aufrufe wie
`npx schornai service start` oder `restart`. Bereits global oder fest auf eine
ältere Version installierte CLIs müssen auf `0.5.0` aktualisiert werden.
Die globale Colima-Konfiguration wird durch die Korrektur nicht verändert.
Weitere Voraussetzungen zu Speicherplatz, Sicherung und Wiederherstellung stehen
in der [Betriebsanleitung](../de/box-admin/index.md).

## Bekannte Einschränkungen und Prüfungen

Für die Datenbankkorrektur sind 2.505 JavaScript-/TypeScript-Tests und zehn
Python-Tests sowie der Service-Build erfolgreich. Zusätzlich wurde ein echtes
Docker-Upgrade mit erhaltenen Daten und anschließendem Neustart geprüft;
eine frische Supabase-Initialisierung mit den Produktions-Erweiterungen war
ebenfalls erfolgreich. Der regulär übersprungene Docker-Integrationstest wurde
separat ausgeführt.

Das korrigierte Archiv enthält den neu gebauten Dienst und die aktualisierten
Datenbank-Startdateien. Container-Images, native Programme, Transcriber und
Mac-App sind unverändert aus dem geprüften Basisarchiv übernommen. Die
Integritätsmanifeste wurden aktualisiert; das gesamte Archiv wird mit der
bisher veröffentlichten CLI 0.4.0 geprüft. Die neue CLI 0.5.0 wurde separat
außerhalb des Checkouts unter Node.js 24 geprüft: Hilfe, Version und die
Dienststeuerung mit Start, Neustart, Status und Stoppen. Ihre Dienstdateien
stimmen vollständig mit der Runtime im korrigierten XRAG überein. Die erfolgreiche Storybook-Typprüfung,
Komponentenabdeckung und vier Visual-CI-Shards des Basis-Releases betreffen die
unveränderte Oberfläche.

Der vollständige manuelle Erstinstallationstest auf einem separaten Mac wird
auf ausdrücklichen Wunsch für diesen Release ausgelassen. Automatisierte
Archiv-, CLI- und Darstellungstests bestätigen keine vollständige Erstinstallation
oder Aktualisierung einer bestehenden Instanz. Mac-Signierung und Notarisierung
sind weiterhin nicht konfiguriert. Modelle, Mailversand sowie öffentliche Domain
und TLS-Zertifikate werden separat eingerichtet.

## Artefakte

- [Finales Setup für macOS ARM64](https://e5bdpj0rnd1tojfy.public.blob.vercel-storage.com/november-2026.xrag.tar)
  (4.466.759.680 Bytes),
  [SHA-256-Datei](https://e5bdpj0rnd1tojfy.public.blob.vercel-storage.com/november-2026.xrag.tar.sha256).
- Setup-SHA-256: `831abf2a4dda1d0924543aae108cdc45304b10bb8ac17977c8561e8734b4deb4`.
- CLI-SHA-256 (`schornai-0.5.0.tgz`):
  `a8d5ca899d87c07657f81ab8005a103315f90de4d65558644c386b4fbc7207d9`.

Siehe [CLI](../de/cli/index.md), [Service und Mac-App](../de/box-admin/index.md),
[Provider-Verbindungen](../de/settings/connections.md) und
[Release-Checkliste](../../RELEASE_CHECKLIST.md).
