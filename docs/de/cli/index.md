---
title: "schorn.ai CLI"
description: "schorn.ai automatisch installieren, Status prüfen und Dienste steuern."
lang: de
meta:
  app_urls: []
  required_role: "Betriebszugang zur Maschine; keine zusätzliche CLI-Anmeldung."
  role_scope: "Jeweilige Maschine"
  prerequisites: "Node.js ab Version 24; für die Erstinstallation OpenSSL und ein passendes Setup-Bundle; unter Linux laufendes Docker mit Compose ab 2.24.4."
  status: "Finales Setup November 2026 für macOS ARM64; npm veröffentlicht CLI 0.4.0, Quellstand enthält 0.5.0. Veröffentlichungsstand siehe Release-Hinweise."
  last_verified: "2026-11-02"
  source_files:
    [
      "apps/cli/package.json",
      "apps/cli/bin/schornai.js",
      "apps/cli/scripts/build.mjs",
      "packages/service/src/cli.ts",
      "packages/service/src/bootstrap.ts",
      "packages/service/src/initialSetup.ts",
      "packages/service/src/initialAdmin.ts",
      "packages/service/src/initialAdminMessages.ts",
      "packages/database/src/user/createInitialAdminWithResetKey.ts",
      "packages/database/src/user/hasUsers.ts",
      "packages/xrag/src/archive.ts",
      "packages/xrag/update/scripts/generateDockerEnv.ts",
    ]
---

# schorn.ai CLI

Die CLI unter `apps/cli` bietet die Service-Befehle an. Das npm-Paket heißt
`schornai`; auf npm ist derzeit Version `0.4.0` veröffentlicht. Der Quellstand
für **November 2026** enthält die noch nicht veröffentlichte Version `0.5.0`.
Den Veröffentlichungsstand findest du in den
[Release-Hinweisen](../../releases/november-2026.md). Im Repository ist die CLI
nach `npm run build:cli` verfügbar.

## Automatische Installation oder Status

```sh
npx schornai
```

Ist schorn.ai bereits eingerichtet und der Service installiert, zeigt der Aufruf
den Installationspfad und den aktuellen Service-Status, auch wenn der Service
gestoppt ist. Er lädt kein Update und startet eine gestoppte Installation nicht
erneut. Alte Admin-Installationen werden als solche gemeldet; ihren Laufzustand
prüfst du in der Admin-App. Eine Migration erfolgt durch diesen Aufruf nicht.

Vor einer neuen oder unvollständigen Installation fragt die CLI
`Install schorn.ai ...? [y/N]`. Erst nach `y` (auch `Y`) beginnt der Download.
`n`, eine leere Eingabe, das Ende der Eingabe oder `Strg+C` brechen ab, ohne
Dateien anzulegen oder zu verändern. Vorhandene Installationen zeigen ihren
Status ohne Rückfrage.

Nach der Bestätigung lädt die CLI das aktuelle XRAG-Setup von
`https://schorn.ai/xrag/schornai/latest`, prüft Archiv, Pakettyp und Plattform und
führt den enthaltenen Installer aus. Anschließend startet sie den Service.
Das Setup für **November 2026** ist für macOS ARM64 vorgesehen.
Der Endpunkt liefert jeweils das zuletzt veröffentlichte Setup; eine gezielt
gewählte CLI-Version legt die Version des heruntergeladenen Setups nicht fest.

Die korrigierte CLI meldet nach dem Download
`Download complete. Verifying and extracting schorn.ai setup...`.
Während dieser Phase prüft und entpackt sie das Archiv. Gültige symbolische
Linkketten innerhalb des Archivs bleiben erhalten; unsichere Pfade und Links
außerhalb des Zielverzeichnisses werden abgewiesen.

Der Bootstrap übermittelt derzeit keine Plattform oder Architektur an den
Download-Endpunkt. Dort kann deshalb jeweils nur ein Zielsystem bedient werden.
Ein macOS-ARM64-Setup lässt sich nicht unter Linux installieren; für Linux ist
ein separat auf der passenden Architektur gebautes Setup erforderlich.

Die neue lokale Instanz umfasst Core, Supabase und Dokumentverarbeitung. Auf
Apple-Silicon-Macs kommen Ollama und MLX-Transkription hinzu. Unterstützt werden
macOS ARM64 sowie Linux ARM64/x64. Unter Linux müssen Docker und Compose ab
2.24.4 bereits laufen; Mac-Bundles enthalten Docker und Colima. Auf beiden
Plattformen wird OpenSSL benötigt. Für Download, entpacktes Archiv, installierte
Programme und Container-Images muss ausreichend freier Speicher vorhanden sein.

Die CLI erzeugt eine eindeutige Maschinen-ID, private Instanzschlüssel und ein
selbstsigniertes Zertifikat für `https://localhost` mit einem Jahr Gültigkeit.
Der Browser vertraut diesem Zertifikat zunächst nicht. Für einen öffentlichen
Zugang müssen Domain und Zertifikat separat eingerichtet werden, ebenso
Mailversand und KI-Modelle. Unter Linux werden Ollama und MLX nicht automatisch
eingerichtet. Zugangsdaten liegen in `docker.env` mit Dateirechten `600` und
werden nicht ausgegeben.

Standardpfad ist `~/.aibox`. `SCHORNAI_HOME` wählt ein anderes Verzeichnis;
`SCHORNAI_CONFIG` wählt eine konkrete Konfiguration für die CLI;
ein explizites `--config` hat Vorrang.
Eine bereits mit `service init` angelegte Konfiguration ohne Dienstdateien wird
vervollständigt. Ihre Dienstauswahl und vorhandene Zugangsdaten bleiben erhalten;
benötigte Zugangsdaten einer entfernten Instanz müssen dort vorher hinterlegt sein.

Nach einem fehlgeschlagenen Setup denselben Befehl erneut ausführen und die
Installation wieder mit `y` bestätigen. Die CLI
erkennt den unvollständigen Versuch und behält schon erzeugte Schlüssel und
Zertifikate. Scheitert erst der Service-Start nach erfolgreicher Installation,
prüfe die Logs und starte mit `npx schornai service start` erneut.
`--help` und `--version` zeigen weiterhin ausschließlich Hilfe beziehungsweise
CLI-Version an.

## Ersten Administrator anlegen

Diese Funktion ist im Dienst des finalen Setups **November 2026** und im
CLI-Quellstand `0.5.0` enthalten. Die veröffentlichte npm-CLI `0.4.0` bietet
weder die automatische Abfrage noch den Befehl `service setup-admin`. Nach der
Installation des aktuellen Setups kann auf einem Mac stattdessen dessen
Runtime verwendet werden:

```bash
~/.aibox/bin/node/node ~/.aibox/apps/service/cli.mjs service setup-admin
```

Bei einem anderen Installationsverzeichnis die beiden Pfade anpassen. Unter
Linux `node` für die systemseitige Node.js-Runtime verwenden. Die folgenden
Angaben zur automatischen Abfrage und zum `npx`-Befehl gelten für CLI `0.5.0`,
sobald diese veröffentlicht ist, beziehungsweise nach einem lokalen CLI-Build.

Nach einer neuen automatischen Installation fragt die CLI im Terminal nach der
E-Mail-Adresse des ersten Administrators. Sie legt das Konto an und zeigt einen
einmaligen Schlüssel. Öffne die angezeigte Adresse `/signin/reset` (lokal
`https://localhost/signin/reset`) und trage E-Mail-Adresse, Schlüssel und dein
neues Passwort ein. Melde dich anschließend mit E-Mail-Adresse und Passwort an.
Das erste Konto erhält durch die Datenbank automatisch die globale Admin-Rolle;
die CLI prüft diese Rolle vor der Ausgabe des Schlüssels.

Für eine bereits installierte, noch leere Instanz oder nach einem übersprungenen
Schritt:

```sh
npx schornai service setup-admin
```

Voraussetzungen sind Core, eine erreichbare Supabase-Instanz mit abgeschlossenen
Migrationen sowie deren private Zugangsdaten und `SITE_URL` in der
Maschinenkonfiguration beziehungsweise ihrer Umgebungsdatei. Die CLI sendet keine
E-Mail; ein Mailserver ist nicht nötig. Der Schlüssel gilt sieben Tage und kann
einmal verwendet werden. Bewahre ihn vertraulich auf; er wird nur im Terminal
angezeigt und nicht in Service-Logs geschrieben.

Enter ohne E-Mail-Adresse, `Strg+C` oder geschlossene Eingabe überspringen die
Kontoanlage. Bei umgeleiteter Ein- oder Ausgabe wird sie ebenfalls übersprungen.
Die Installation bleibt erhalten und der Befehl kann später erneut ausgeführt
werden. Existiert schon ein Benutzer, werden weder ein weiteres Konto angelegt
noch Berechtigungen oder Passwörter geändert. Für weitere Konten nutze die
[Benutzerverwaltung](../settings/user/index.md). Dieser Befehl ist kein
Wiederherstellungsweg für ein bestehendes Konto.

## Dienste gezielt steuern

```sh
npx schornai service init --services core,supabase,document-extractor,ollama,transcriber-mlx
npx schornai service start
npx schornai service status
npx schornai service logs --follow
npx schornai service stop
```

`init` legt eine neue Maschinenkonfiguration an und überschreibt keine vorhandene.
`--config /pfad/config.json` wählt eine andere Konfiguration und hat Vorrang vor
`SCHORNAI_CONFIG`. `restart` startet neu;
`run` betreibt den Service im Vordergrund. `logs --lines 500 --json` liefert
strukturierte Logzeilen. `--help` zeigt die Hilfe und `--version` die CLI-Version.

Das npm-Paket enthält den Service-Code, aber keine Docker-Images oder nativen
Dienstprogramme. Diese werden beim automatischen Erstaufruf über das XRAG-Setup
nachgeladen oder manuell mit einem Setup-Bundle bereitgestellt. Die CLI benötigt
keinen zusätzlichen Kontologin; Dienstzugänge stehen in der privaten
Betriebskonfiguration. Die Mac-App steuert denselben Service.

Die technischen Funktionen bleiben im eigenständigen Paket `packages/service`.
Für Konfiguration, Voraussetzungen und automatische Updates alter Systeme siehe
[Service und Mac-App](../box-admin/index.md).

## Service-Übersicht und sofortiger Abgleich

Die [Service-Seite](../service/index.md) zeigt Maschinenstatus, CPU-/GPU-Auslastung,
Arbeitsspeicher- und Festplattenbelegung. Veröffentlichte Dateien verwaltest du
unter [Cluster → Artefakte](../artifacts/index.md).
Der Service reagiert auf Yjs-Änderungen und Wiederverbindungen. Ein manueller
Abgleich ist mit `npx schornai service sync` möglich; ein laufender Service
mit konfiguriertem `sharing` ist dafür erforderlich. Der Befehl bestätigt die
Annahme. Ergebnis und Fehler stehen in den Logs und auf der Service-Seite.
Web-App, Realtime-Dienst und Service benötigen denselben `SERVICE_API_TOKEN`.
Entfernte Maschinen verwenden `/v2/realtime` an der Freigabeadresse oder
`endpoints.realtime`. Auf lokalen Core-Hosts verwendet der Service den nur auf
Loopback erreichbaren Port 9001 (Entwicklung: 9000).
