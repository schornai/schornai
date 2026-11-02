# November 2026

Finaler Release für November 2026. Web-App und Mac-Admin-App zeigen
**November 2026** ohne Release-Candidate-Zusatz. Der Quellstand enthält CLI
`schornai@0.5.0`; auf npm bleibt `schornai@0.4.0` veröffentlicht.

Veröffentlicht am **2. November 2026**. Der öffentliche
[Setup-Endpunkt](https://schorn.ai/xrag/schornai/latest) liefert das finale
macOS-ARM64-Setup. Das Paket wurde am selben Tag mit der unten beschriebenen
Datenbankkorrektur unter derselben Adresse ersetzt. npm-`latest` bleibt auf
[`schornai@0.4.0`](https://www.npmjs.com/package/schornai/v/0.4.0); ein neues
npm-Paket wurde für diese Korrektur nicht veröffentlicht.

| Angabe          | Wert                                                |
| --------------- | --------------------------------------------------- |
| Branch          | `release/november-2026`                             |
| Ausgangscommit  | `0cb49283e052f1d9a726becadcc79224585758f5` (`main`) |
| Basis-Build     | `80a7a663492b4b2471e9bc11cb6e5ac96820e1bf`          |
| Öffentliche CLI | `schornai@0.4.0`                                    |
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
- Einrichtung des ersten Administrators über den mitgelieferten Dienst:
  E-Mail-Adresse eingeben, einmaligen
  Schlüssel auf `/signin/reset` verwenden und das Passwort festlegen. Ein
  Mailserver ist dafür nicht erforderlich. Vorhandene Benutzer verhindern die
  erneute Kontoanlage; bestehende Konten und Rollen bleiben unverändert.
  Die automatische Abfrage und `npx schornai service setup-admin` gehören zur
  noch nicht veröffentlichten CLI 0.5.0; für npm 0.4.0 siehe die
  [CLI-Anleitung](../de/cli/index.md#ersten-administrator-anlegen).
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

Der reguläre XRAG-Updateweg, die Mac-App und der Abschluss einer Erstinstallation
verwenden den neu mitgelieferten Dienst. Explizites `npx schornai service start`
oder `restart` verwendet dagegen weiterhin die im npm-Paket enthaltene ältere
Dienstlogik. Für die neue Startlogik über diese Befehle wäre ein eigener
CLI-Release nötig; bis dahin die Mac-App oder die installierte Runtime verwenden.
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
veröffentlichten CLI 0.4.0 geprüft. Die erfolgreiche Storybook-Typprüfung,
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
- Lokal gebautes, nicht auf npm veröffentlichtes CLI-Archiv
  `schornai-0.5.0.tgz`, SHA-256:
  `1166725abb244b9426495e90a4e7e9523e6407276af96e4eb72ec347f2b7dacc`.

Siehe [CLI](../de/cli/index.md), [Service und Mac-App](../de/box-admin/index.md),
[Provider-Verbindungen](../de/settings/connections.md) und
[Release-Checkliste](../../RELEASE_CHECKLIST.md).
