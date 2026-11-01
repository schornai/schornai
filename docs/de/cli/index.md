---
title: "schorn.ai CLI"
description: "schorn.ai automatisch installieren, Status prüfen und Dienste steuern."
lang: de
meta:
  app_urls: []
  required_role: "Betriebszugang zur Maschine; keine zusätzliche CLI-Anmeldung."
  role_scope: "Jeweilige Maschine"
  prerequisites: "Node.js ab Version 24; für die Erstinstallation OpenSSL und ein passendes Setup-Bundle; unter Linux laufendes Docker mit Compose ab 2.24.4."
  status: "CLI 0.3.0 mit korrigierter Archivextraktion auf npm veröffentlicht; Download-Endpunkt liefert RC2 für macOS ARM64."
  last_verified: "2026-10-28"
  source_files:
    [
      "apps/cli/package.json",
      "apps/cli/bin/schornai.js",
      "apps/cli/scripts/build.mjs",
      "packages/service/src/cli.ts",
      "packages/service/src/bootstrap.ts",
      "packages/service/src/initialSetup.ts",
      "packages/xrag/src/archive.ts",
      "packages/xrag/update/scripts/generateDockerEnv.ts",
    ]
---

# schorn.ai CLI

Die CLI unter `apps/cli` bietet die Service-Befehle an. Das npm-Paket heißt
`schornai`; Version `0.3.0` ist als `latest` veröffentlicht. Im Repository ist der aktuelle
Quellstand mit Version `0.3.0` nach `npm run build:cli` verfügbar.

**Bekannter Fehler in `0.2.0`:** Das macOS-ARM64-Setup kann nach vollständig
abgeschlossenem Download beim Entpacken gültiger symbolischer Linkketten
abbrechen. Beim anschließenden Aufräumen kann stattdessen `ENOTEMPTY` erscheinen.
Die Korrektur ist in CLI `0.3.0` für
[November 2026 Release Candidate 2](../../releases/november-2026-release-candidate-2.md)
enthalten und auf npm veröffentlicht. Bei einer alten lokalen oder globalen
Installation gezielt `npx --yes schornai@0.3.0` aufrufen.

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
Der Endpunkt liefert derzeit das macOS-ARM64-Setup des November 2026 Release
Candidate 2.

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
`SCHORNAI_CONFIG` wählt beim Aufruf ohne Argumente eine konkrete Konfiguration.
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

## Dienste gezielt steuern

```sh
npx schornai service init --services core,supabase,document-extractor,ollama,transcriber-mlx
npx schornai service start
npx schornai service status
npx schornai service logs --follow
npx schornai service stop
```

`init` legt eine neue Maschinenkonfiguration an und überschreibt keine vorhandene.
`--config /pfad/config.json` wählt eine andere Konfiguration. `restart` startet neu;
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
