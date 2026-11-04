---
title: "Service und Mac-App"
description: "Dienste pro Maschine konfigurieren, über CLI oder Mac-App starten und Protokolle lesen."
lang: de
meta:
  app_urls: []
  required_role: "Betriebszugang zum Rechner; globale Administration für XRAG-Veröffentlichungen."
  role_scope: "Jeweilige Maschine"
  prerequisites: "Node.js ab Version 24; installierte Dienstdateien; für Container Docker Compose ab 2.24.4."
  status: "verfügbar"
  last_verified: "2026-11-04"
  source_files:
    [
      "apps/admin-mac/src/main.ts",
      "apps/admin-mac/src/renderer/App.tsx",
      "apps/admin-mac/src/renderer/components/ServiceView.tsx",
      "packages/service/src/cli.ts",
      "packages/service/src/bootstrap.ts",
      "packages/service/src/initialAdmin.ts",
      "packages/service/src/config.ts",
      "packages/service/src/environment.ts",
      "packages/utils/src/prepareTranscriberEnvironment.ts",
      "apps/transcriber-mac/src/service/transcribeWorker.ts",
      "packages/service/src/dev.ts",
      "packages/service/src/services.ts",
      "packages/service/src/serviceCommands.ts",
      "packages/service/src/installer.ts",
      "packages/xrag/update/bundleUpdate.mts",
      "packages/xrag/update/build/workspace.mts",
      "packages/xrag/update/build/images.mts",
      "external/downloads/src/downloadAll.ts",
      "packages/xrag/update/container/docker-compose.yml",
      "packages/xrag/update/container/supabase/overrides.yml",
      "packages/xrag/update/container/volumes/db/prepare-data.sh",
      "packages/xrag/update/container/volumes/db/check-health.sh",
    ]
---

# Service und Mac-App

Pro Maschine läuft ein Service. Er startet ausschließlich die in seiner
`config.json` ausgewählten Dienste, überwacht native Prozesse und verarbeitet
passende Pakete aus dem Dateikatalog der Web-App. Die Mac-App **schorn.ai Admin**
ist ein Starter und Protokollbetrachter für diesen Service.

## CLI und Installation

Im Repository zunächst `npm run build:cli` ausführen. Danach verwendet
`npx schornai` das lokale Workspace-Paket. Für andere Rechner kann die
Betriebsadministration mit `npm pack --workspace apps/cli` ein
installierbares npm-Paket erstellen. Der globale Aufruf ohne lokale Installation
setzt voraus, dass die entsprechende Version unter `schornai` veröffentlicht wurde.

Für eine neue vollständige lokale Instanz genügt `npx schornai`: Nach Bestätigung
mit `y` bei der Abfrage `[y/N]` lädt der Aufruf
das aktuelle XRAG-Setup, erzeugt die lokale Konfiguration samt Zugangsdaten und
Zertifikat, installiert und startet die Dienste. Bei vorhandener Installation
zeigt er nur den Status. Download-Endpunkt und neue npm-Version müssen dafür
bereitgestellt sein. Plattformen, Voraussetzungen und Dienstumfang stehen in der
[CLI-Anleitung](../cli/index.md#automatische-installation-oder-status).
Der aktuelle Quellstand bietet danach die
[Einrichtung des ersten Administrators](../cli/index.md#ersten-administrator-anlegen)
an. Über `service setup-admin` lässt sie sich für eine bereits installierte,
noch leere Instanz nachholen. Die Mac-App legt selbst keine Benutzer an.
Für eine bewusst abweichende Dienstauswahl bleibt der manuelle Ablauf verfügbar:

```bash
npx schornai service init --services core,supabase,document-extractor,ollama,transcriber-mlx
npx schornai service start
npx schornai service status
npx schornai service logs --follow
npx schornai service stop
npx schornai service restart
```

`init` erzeugt `~/.aibox/config.json` mit einer neuen Maschinenkennung und
überschreibt keine bestehende Datei. Ohne `--services` bleibt die Dienstliste
leer. Das Startkommando installiert keine Programme oder Container-Images;
diese werden über das Setup-Paket bereitgestellt. `--config /pfad/config.json`
wählt ein anderes Datenverzeichnis; dessen Basis ist der Ordner der Konfiguration.
`SCHORNAI_HOME` ändert den Standardordner. `run` betreibt den Service im
Vordergrund, beispielsweise unter systemd oder launchd.

| Dienst               | Wirkung                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| `core`               | Web-App, Realtime-Server und gemeinsamer HTTPS-Proxy.                                             |
| `supabase`           | Lokaler Supabase-Stack als eine Dienstgruppe, einschließlich Datenbank und Anwendungsmigrationen. |
| `document-extractor` | Separat betreibbarer HTTP-Dienst zur Dokumentextraktion, derzeit Apache Tika.                     |
| `transcriber-mlx`    | MLX-Transcriber auf einem Apple-Silicon-Mac.                                                      |
| `ollama`             | Lokaler Ollama-Prozess.                                                                           |

Core kann Supabase auf demselben Rechner, auf einem anderen Service-Rechner oder
bei Supabase Cloud verwenden. Die [Supabase-Anleitung](supabase.md) beschreibt
Verbindungen, Schlüssel, den Auth-Hook und den Unterschied zwischen CLI-Entwicklung
und installierter Box. `init` erzeugt nur die Maschinenkonfiguration; es startet
keinen einzelnen Postgres. Eine Rolle `database` gibt es nicht mehr.

Installation auf neu eingerichteten Systemen:

- [Worker-Installation unter macOS](worker-macos.md)
- [Worker-Installation unter Linux](worker-linux.md)

Konfigurationen aus dem früheren Supervisor-Entwicklungsstand vor der Weiterverwendung
anpassen: Rolle `web` wird `core`, Document Extractor wird ausdrücklich mit
`document-extractor` ausgewählt, `database` wird `supabase`, und der gemeinsame
Freigabetoken heißt `SERVICE_API_TOKEN`. Dieselben Werte auf Core und allen
Rechnern verwenden. Die neue Dev-Vorgabe ist `.service-dev`; alte Verzeichnisse
werden nicht automatisch übernommen oder gelöscht. Dienstzustand und Logs tragen
jetzt ebenfalls den Namen Service. Die automatische Migration alter ausgelieferter
Admin-Boxen ist davon unabhängig und bleibt im Setup-Bundle enthalten.

## Entwicklung mit dem Service

Im Repository startet `npm run dev:service` denselben Service-Kern wie die
installierte Box. Die Dienstliste, Sperre gegen Doppelstarts, CLI-Steuerung,
Protokollierung, Prozessüberwachung und das Beenden von Kindprozessen sind
gemeinsam. `development.workspace` in der automatisch angelegten
`.service-dev/config.json` schaltet Web, Realtime und Transcriber auf die
Dev-Skripte aus diesem Checkout um. Proxy und Document Extractor laufen weiter als Container.
Service- und App-Code werden überwacht; Änderungen starten die entsprechenden
Prozesse neu. `Ctrl-C` beendet die vom Service gestarteten Dienste.

Standardmäßig werden `core` und `document-extractor` ausgewählt, auf Apple-Silicon-Macs zusätzlich
`transcriber-mlx`. `npm run dev:service -- --services core` legt bei der ersten
Ausführung eine reine Web-Konfiguration an. Vorhandene Konfigurationen werden
nicht überschrieben; Rollen und Einstellungen darin bearbeiten und anschließend
neu starten. Ein abweichender Pfad ist über `--config` möglich.

Die bestehenden App-`.env`/`.env.local`-Dateien liefern lokale Einstellungen. Für
Web werden außerdem `.env.development` und `.env.development.local` berücksichtigt.
Werte in der gemeinsamen `.service-dev/docker.env` haben Vorrang vor den
App-Dateien, explizite Prozessvariablen vor beiden. Produktionsnamen wie
`ANON_KEY` und `SERVICE_ROLE_KEY` werden auf die passenden App-Variablen
abgebildet. Realtime- und Transcriber-Worker benötigen derzeit zusätzlich das
JWT-Signiersecret für Datenbankzugriffe mit den Rechten des jeweiligen Benutzers.
Service übernimmt `JWT_SECRET` als `SUPABASE_JWT_SECRET`; ein ausdrücklich gesetztes
`SUPABASE_JWT_SECRET` hat Vorrang. Es gehört ausschließlich in die private
Umgebung der vertrauenswürdigen Server und Worker.
Geheimnisse werden auch in der Terminalausgabe maskiert.

Die Standardkonfiguration verwendet die bereits laufende lokale Supabase-Instanz
und externes Ollama. Docker, App-Zugangsdaten, Proxy-Zertifikate sowie beim
Transcriber das gebaute Python-Programm und `ffmpeg` bleiben Voraussetzungen.
Mit der zusätzlichen Rolle `supabase` verwaltet Service die lokale Instanz über
Supabase CLI 2.120.0 und die vorhandene `supabase/config.toml`. Bereits laufende
Instanzen bleiben beim Service-Stop erhalten; selbst gestartete Instanzen werden
mit Datensicherung gestoppt. Es gibt keinen automatischen Reset. CLI-Einstellungen
kommen aus `supabase/.env` und `.env.local`; gemeinsame Umgebungsvariablen haben
wie bei den Apps Vorrang. Setup-Bundles werden bei aktivem `development.workspace`
abgewiesen. Vollständige Setup-/Migrationstests verwenden eine eigene
Produktionskonfiguration, damit sie nicht die Quellcodeumgebung ersetzen.

Modelle, Logs und sonstige lokale Daten liegen im Ordner der Dev-Konfiguration.
Bestehende Produktionsdaten werden nicht übernommen. Whisper-Dateien gehören
nach `.service-dev/mlx/whisper/models/<fileSystemIdentifier>`, Ollama-Modelle
nach `.service-dev/ollama/models`. Modellpakete können auch über einen explizit
konfigurierten Test-Dateikatalog verteilt werden. Der Proxy nutzt standardmäßig
die bisherigen Zertifikate aus `~/.aibox/docker/volumes/api/cert`; mit
`AIBOX_CERT_DIR` wird ein anderes Zertifikatsverzeichnis ausgewählt. Mit
`AIBOX_DOCKER_HOST` lässt sich die Hostadresse aus Sicht der Container anpassen;
`AIBOX_SUPABASE_PROXY_URL` überschreibt deren Supabase-Ziel.

Die normalen CLI-Befehle steuern die Entwicklungsinstanz über denselben Socket:

```bash
node packages/service/src/main.ts service status --config .service-dev/config.json
node packages/service/src/main.ts service logs --follow --config .service-dev/config.json
node packages/service/src/main.ts service stop --config .service-dev/config.json
```

Nach `npm run build:cli` funktionieren dieselben Befehle auch über
`npm run service -- ... --config .service-dev/config.json`. Die Mac-App kann
mit `SCHORNAI_CONFIG` auf diese Konfiguration zeigen. `npm run dev:web` bleibt als
bisheriger Turbo-Start verfügbar; beide Starts verwenden dieselben App-Ports und
sollten nicht gleichzeitig laufen.

## Beispiel: eigener Transcriber-Rechner

```json
{
  "version": 1,
  "id": "00000000-0000-4000-8000-000000000001",
  "services": ["transcriber-mlx"],
  "envFile": "docker.env",
  "sharing": { "url": "https://box.example.com" },
  "endpoints": {
    "supabase": "https://database.example.com",
    "realtime": "https://box.example.com/v2/realtime"
  }
}
```

Erzeuge die tatsächliche `id` mit `init` auf jeder Maschine neu. Der Transcriber
benötigt in seiner privaten `docker.env` die Werte `SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SECRET_KEY`, `SUPABASE_JWT_SECRET` und `REALTIME_SERVER_SECRET` der
Zielinstanz. Für den Dateikatalog kommt `SERVICE_API_TOKEN` hinzu.

`SUPABASE_JWT_SECRET` ist das JWT-Signiersecret derselben Supabase-Instanz.
Ein bestehendes `JWT_SECRET` wird als Alias übernommen. Ein explizites, nicht
leeres `SUPABASE_JWT_SECRET` hat Vorrang. Der Worker benötigt dieses Secret,
um Anfragen mit den Rechten des auftraggebenden Benutzers zu signieren.
Fehlen beide Varianten, bricht er vor der Übernahme von Aufträgen mit einem
Konfigurationsfehler ab. Das vollständige Umgebungsbeispiel steht unter
[Worker-Installation unter macOS](worker-macos.md).

Verwende Dateirechte `600`. Zugangsdaten gehören ausschließlich in die private
`docker.env`. Eine reine Datenbankmaschine benötigt keinen laufenden
Transcriber und lädt keine Transkriptionsmodelle herunter.

Der Transcriber meldet nur Modelle als Fähigkeit an, deren Konfiguration und
Gewichte lokal vorhanden sind. Neue Transkriptionsaufträge werden dadurch einem
passenden Worker zugewiesen. Nach einer Modellinstallation startet der Service
die ausgewählten Dienste neu, sodass der Worker seine Fähigkeiten neu einliest.

Bei einer Komplettinstallation mit `supabase`, `core` und `transcriber-mlx` sind keine
zusätzlichen Endpunkte nötig: Der native Transcriber verwendet die lokale
Supabase-API auf Port 8085 und den nur lokal erreichbaren Realtime-Port 9001.
Explizite Endpunkte und `caFile` haben Vorrang. Container behalten ihre internen
Dienstadressen.

## Getrennte Supabase- und Core-Maschinen

Auf der Core-Maschine zeigt `endpoints.supabase` auf die erreichbare Supabase-API.
`endpoints.ollama` kann auf einen separaten Ollama-Host zeigen. Auf der
Supabase-Maschine muss `AUTH_HOOK_URL` in `docker.env` auf die Web-App zeigen.
Beide Seiten brauchen denselben `SUPABASE_AUTH_HOOK_SECRET`; Web-App, Realtime und
Transcriber brauchen denselben `REALTIME_SERVER_SECRET`.

Der Service legt das vom Realtime-Dienst beobachtete Modellverzeichnis auch
auf reinen Core-Maschinen an. Ein entfernter Ollama-Host muss über seine private
Netzwerkschnittstelle erreichbar sein; dafür kann `OLLAMA_HOST` in dessen
`docker.env` gesetzt werden. Nach Modelländerungen auf einem entfernten Ollama-Host
benötigt der Realtime-Dienst weiterhin einen Neustart, sofern kein gemeinsames
Dateisystem mit Änderungsbenachrichtigungen verwendet wird.

Supabase-API und Postgres-Ports sind zunächst nur an Loopback gebunden.
`SUPABASE_BIND_ADDRESS` beziehungsweise `POSTGRES_BIND_ADDRESS` wählen bei Bedarf
eine private Netzwerkschnittstelle. Richte den Zugriff zwischen den Rechnern über
ein geschütztes Netz beziehungsweise einen TLS-Proxy ein. Für Zertifikate einer
eigenen CA setze vor dem Start `NODE_EXTRA_CA_CERTS`; `caFile` in der Konfiguration
reicht die CA zusätzlich an den Transcriber weiter.

`docker.manageColima: true` erlaubt auf macOS den Start von Colima, wenn Docker
noch nicht erreichbar ist. Eine bereits laufende Docker-VM wird beim Stoppen des
Services nicht beendet. Verwende auf Linux eine vorhandene Docker-Engine.
Auch das Setup kann Colima zum Laden der ausgewählten Container-Images kurzzeitig
starten. Eine bereits laufende VM bleibt dabei bestehen.

## Mac-App und Logs

Die Mac-App liegt im Projekt unter `apps/admin-mac`. Beim Öffnen startet sie den
Service oder verbindet sich mit dem bereits laufenden Prozess. Die
Service-Karte zeigt den Zustand; **Starten** und **Stoppen** steuern denselben
Prozess wie die CLI. Während einer Aktion sind beide Schaltflächen gesperrt.
Fehlgeschlagene Aktionen erscheinen als Fehlermeldung und können wiederholt
werden. Das Schließen der App lässt den Service weiterlaufen. Sprache
(Deutsch oder Englisch) und Hell-/Dunkeldarstellung folgen dem System.

Neben dem Logo steht die Release-Bezeichnung der installierten Mac-App, zum
Beispiel **November 2026**. Der Footer der Web-App zeigt
deren Release-Bezeichnung. Bei getrennten Installationen können die Anzeigen
abweichen; `schornai --version` zeigt stattdessen die eigenständige CLI-Version.

Der Pfeil an **Protokolle** öffnet die Tabelle mit Absender, Ausgabe (`stdout`
oder `stderr`), Zeit und Meldung. **Protokolle durchsuchen** durchsucht den gesamten
Meldungstext, Absender, Ausgabeart und ISO-Zeitstempel mit Tippfehlertoleranz.
Die Suche reagiert nach einer kurzen Eingabepause und berücksichtigt auch neu
eintreffende Meldungen. Die Kontrollkästchen schränken zusätzlich nach Absender
ein. **Filter zurücksetzen** leert die Suche und die Absender-Auswahl.
Durchsucht werden die in der Ansicht gehaltenen Meldungen, nicht ältere Logdateien.
Die Ansicht hält bis zu 1.000 Meldungen je Absender, die neuesten zuerst.
`logs --lines 500` zeigt ältere Meldungen; `--json` gibt
strukturierte Logzeilen aus. Der Service rotiert `~/.aibox/logs/service.log`
bei etwa 10 MiB und behält eine Vorgängerdatei. Bekannte Geheimnisse aus der
Betriebskonfiguration werden maskiert. Prüfe Logs vor einer Weitergabe trotzdem.

## Setup-Bundles bauen

Im Repository-Root genügt ein Befehl, auch in einem frischen Checkout ohne
`node_modules`, Downloads oder vorherige Builds:

```bash
npm run xrag:bundle
```

Der Build-Rechner muss dieselbe Plattform und Architektur wie das Ziel haben:
Apple-Silicon-macOS, Linux ARM64 oder Linux x64. Voraussetzungen sind Node.js 24+,
npm, Git, `tar`, Internetzugang und eine laufende Linux-Docker-Engine ab 28.1
(API 1.49) mit Buildx und Docker Compose. Auf dem Mac werden außerdem Python 3.13,
Xcode Command Line Tools und `unzip` benötigt. Für Quellen, Abhängigkeiten,
Container-Images und das unkomprimierte Archiv ausreichend freien Speicher sowohl
im temporären Systemverzeichnis als auch im Repository und in Docker vorsehen.
Für einen vollständigen Build ohne vorhandenen Cache der Docker-VM mindestens
8 GB RAM und 4 CPUs zuweisen; parallel laufende Dienste benötigen zusätzliche
Reserven. Die Ressourceneinstellungen werden vom Bundle-Skript nicht verändert.

`bundleUpdate.mts` erledigt die gesamte Vorbereitung:

1. Es kopiert den aktuellen Arbeitsstand einschließlich lokaler Änderungen und
   nicht ignorierter neuer Dateien in einen temporären Quellordner außerhalb des
   Checkouts. Lokal gelöschte Dateien bleiben gelöscht. Vorhandene `node_modules`,
   Build-Ausgaben, Python-Umgebungen und `.env`-Dateien werden nicht übernommen.
2. Es installiert die npm-Abhängigkeiten mit `npm ci` aus dem Lockfile und baut
   Realtime und Service neu. Ein inkonsistentes Lockfile bricht den Build ab.
3. Auf macOS lädt es sämtliche externen Binaries in den im Checkout festgelegten
   Versionen frisch herunter und prüft ihre Versionsausgaben. Anschließend legt es
   eine neue Python-Umgebung an, installiert die Requirements und baut Transcriber
   und Mac-App. Ein vorheriges `external:downloads` oder `python:install` ist nicht
   erforderlich. Linux überspringt diese Mac-Komponenten.
4. Es bestimmt die benötigten Images aus den mitgelieferten Compose-Dateien
   einschließlich Overrides und Migrationsprofil. Deaktivierte Supabase-Dienste
   werden nicht eingepackt. Alle eigenen Images werden mit aktualisierten
   Basis-Images ohne Docker-Build-Cache gebaut; externe Images werden für die
   passende Architektur erneut gepullt, geprüft und exportiert.
5. Es erstellt Integritäts- und Installationsmanifeste sowie `build.json` mit
   Toolversionen, Lockfile-Prüfsumme und Image-Digests. Erst nach erfolgreicher
   Prüfung mit demselben XRAG-Prüfer wie beim Upload ersetzt es `update.xrag.tar`
   im Repository-Root und gibt dessen SHA-256-Prüfsumme aus.

Ein fehlgeschlagener Lauf meldet einen Fehler, entfernt seine temporären
Arbeitsordner und lässt das letzte vollständige Archiv unverändert. Die lokalen
Quellen, Abhängigkeiten und Downloads werden nicht überschrieben; Git wird weder
zurückgesetzt noch aktualisiert. Symlinks auf Quellen innerhalb des Checkouts
werden übernommen; Verweise auf externe Dateien oder lokale Build-Ausgaben
führen zu einem Fehler. Während der Quellkopie keine Dateien bearbeiten.
Bei einem erzwungenen Prozessabbruch können temporäre Ordner zurückbleiben; ein
neuer Lauf verwendet immer neue Ordner. Downloads und Lockfiles bestimmen die
Versionen, ein automatischer Wechsel auf neuere Upstream-Releases findet nicht
statt. Transitive Python-Abhängigkeiten werden anhand der Requirements frisch
aufgelöst; byteidentische Archive über verschiedene Build-Rechner und Zeitpunkte
werden nicht zugesichert.

`npm run external:downloads` bleibt auf Apple Silicon separat nutzbar und ersetzt
seinen Downloadordner erst, wenn der gesamte neue Satz erfolgreich geprüft wurde.
Das Ergebnis `update.xrag.tar` nach Plattform benennen und mit Prüfsumme verteilen.
Linux-Zielrechner benötigen systemweit Node und Docker sowie bei gewählter Rolle
Ollama. Mac- und Linux-Pakete können im selben Artefaktkatalog liegen; Service wählt
jeweils das neueste Paket für seine Plattform und Architektur. Gelöschte aktuelle
Releases führen auch je Plattform nicht zu einem Downgrade.

## Updates und bestehende Installationen

### Alte Systeme per XRAG automatisch umstellen

Jedes künftig gebaute Setup-Bundle unterstützt beide Ausgangszustände: eine
bestehende Service-Installation und die bisherige Admin-App ohne Service.
Eine bestimmte Zwischenversion ist für die Umstellung nicht erforderlich.

1. Baue das vollständige Paket auf dem Apple-Silicon-Build-Mac mit den bisherigen
   Build-Voraussetzungen:

   ```bash
   npm run xrag:bundle
   ```

2. Sichere vor dem Update Datenbank, Storage, `~/.aibox`, die bisherige Mac-App und
   die Docker-Volumes `supabase_db-config` und, falls schon vorhanden,
   `supabase_db-data`. Eine Kopie laufender PostgreSQL-Dateien
   allein ist kein konsistentes Datenbank-Backup. Behalte `docker.env` und Zertifikate.

3. Lade `update.xrag.tar` über die bisherige XRAG-Uploadseite der alten Box hoch.
   Die alte Admin-App startet wie bisher `setup.sh`. Das Bundle verwendet seine
   passende Node-Laufzeit, erkennt die alte Installation und erzeugt selbst die
   fehlende `config.json`. Es übernimmt `BOX_ID`, alle bisherigen Dienstgruppen
   und die lokale Sharing-Adresse `http://127.0.0.1:3001`. Vorhandene Konfiguration
   wird nicht ersetzt.

4. Der Installer beendet die alte Admin-App und einen eventuell zurückgebliebenen
   Transcriber, ersetzt die Programme und die Mac-App unter `~/Applications` und
   startet den Service automatisch. Daten, Modellgewichte und gültige Schlüssel
   bleiben erhalten; fehlende Betriebsschlüssel werden ergänzt. Kein manuelles
   `init`, kein Rechner-Neustart und kein vorher installiertes npm-Paket sind nötig.

5. Prüfe Anmeldung, Chat, Upload und Transkription. Die neue Mac-App und die CLI
   zeigen Status und Logs. Verteile Dienste erst danach auf weitere Maschinen.

Die Abwärtskompatibilität liegt im Setup-Bundle. Die bisherige Web-App und
Admin-App liefern und starten es über ihren unveränderten Updateweg. Nach der
Umstellung bezieht der Service weitere Pakete aus dem neuen Dateikatalog.

Für eine manuelle Installation kann dasselbe Archiv entpackt und im entpackten
Ordner mit `bash ./setup.sh` gestartet werden. Auf erkannten alten Boxen funktioniert
auch das ohne vorbereitete `config.json`. Bei einer echten Neuinstallation muss
beim manuellen Aufruf zunächst eine Konfiguration mit den gewünschten Diensten
angelegt werden. `npx schornai` übernimmt diesen Schritt für eine neue lokale Instanz.

### Weiterer Betrieb

Sichere Datenbank, Storage und private Konfiguration vor einer Umstellung.
Auf alten Gesamtinstallationen erzeugt das Setup die fehlende Konfiguration
automatisch. Auf vorhandenen Service-Systemen bleibt sie unverändert.
Der Installer beendet die alte Admin-App und deren Compose-Projekt ohne
Volumenlöschung, übernimmt die neuen Dienstdateien und erhält
`docker/volumes/db/data`, Storage, Zertifikate und `supabase_db-config`.

Lokales PostgreSQL verwendet künftig das Docker-Volume `supabase_db-data`.
Beim ersten Start mit dem neuen Bundle übernimmt der Datenbankcontainer die
bisherigen Daten aus `docker/volumes/db/data` automatisch. Compose beendet
zuerst den alten Datenbankcontainer. Danach werden der vollständige
PostgreSQL-15-Datenbestand einschließlich Transaktionsprotokollen kopiert und
die Dateibesitzer für das verwendete Image eingerichtet. Die PostgreSQL-Hauptversion
bleibt unverändert. Globale Colima-Einstellungen werden dabei nicht geändert.

Die Übernahme schreibt zunächst in ein temporäres Verzeichnis im neuen Volume.
Erst die vollständige Kopie wird als Datenbank verwendet. Nach einem Abbruch
wird nur diese temporäre Kopie neu aufgebaut; eine vorhandene vollständige
Zieldatenbank wird niemals durch den alten Stand ersetzt. Die Inhalte des alten
Datenverzeichnisses bleiben erhalten. Auf SELinux-Systemen kann Docker dessen
Sicherheitslabel für die schreibgeschützte Einbindung anpassen.

Für die einmalige Kopie muss ausreichend freier Platz im Docker-Datenträger und
auf dessen physischem Speicher vorhanden sein. Der Supabase-Start wartet dafür
bis zu 30 Minuten. Die CLI berücksichtigt zusätzlich vier Minuten für den
übrigen Start und jeweils drei Minuten für ausgewählte Core- und
Document-Extractor-Dienste, also höchstens 40 Minuten. Fehler bei Dateizugriffen
oder Platzmangel werden protokolliert.
Unvollständige Datenbestände, andere PostgreSQL-Hauptversionen und symbolische
Links, etwa externe Tablespaces oder WAL-Verzeichnisse, benötigen eine manuelle
Übernahme. Bei solchen Fehlern wird keine leere Ersatzdatenbank angelegt.

Nach der Übernahme enthält `docker/volumes/db/data` nur noch den alten Stand.
Sichere die aktuelle Datenbank und `supabase_db-data`; lösche das Volume oder die
Docker-VM nicht ohne eine geprüfte Sicherung. Ein Rückwechsel auf alte
Compose-Dateien würde den alten Datenbestand öffnen und ist daher keine
vollständige Wiederherstellung. Ist die bestehende Datenbank schon so gestört,
dass XRAG-Uploads scheitern, lässt sich das neue Bundle weiterhin direkt auf der
Maschine mit dem enthaltenen `setup.sh` installieren.

Die Datenbank-Zustandsprüfung führt eine echte SQL-Abfrage aus und liest eine
PostgreSQL-Kontrolldatei mit den Dateirechten des Datenbankprozesses. Wenn einer
dieser Zugriffe fehlschlägt, gilt der Container als nicht gesund; beim Start
werden abhängige Dienste dann nicht freigegeben. Die Prüfung repariert keine
Dateirechte und verändert keine Daten. Ein laufender Service-Prozess allein
belegt nicht, dass Datenbank und Anmeldung funktionieren. Wiederholte
`Permission denied`-Fehler für PostgreSQL-Dateien erfordern eine Prüfung der
Dateirechte und der Docker-Einbindung auf der betroffenen Maschine.

Setup-Pakete erreichen alle Service mit konfigurierter `sharing`-URL. Installiert
werden nur die ausgewählten Komponenten. Der Service pausiert dafür seine
Dienste und startet sie nach erfolgreicher Installation neu. Ein Rechner-Neustart
und `sudo` sind nicht Teil des neuen Updaters. Für die Wiederherstellung bleiben
ersetzte Programmverzeichnisse als `.previous` erhalten; Datenbank-Backups werden
weiterhin separat benötigt. Geschützte Backups früherer `sudo`-Installationen
bleiben mit einem zusätzlichen eindeutigen Suffix erhalten und blockieren
weitere Updates nicht. Sie können später durch die Betriebsadministration
entfernt werden. Ein Fehler wird protokolliert und beim nächsten
Kataloglauf erneut versucht. Das Abschalten einer Maschine während eines Updates
kann eine manuelle Wiederherstellung erfordern.

Nach Updates werden Konfiguration und `docker.env` neu eingelesen. Explizit beim
Prozessstart gesetzte Umgebungsvariablen behalten Vorrang. Beim Stoppen oder
Neustarten nativer Worker werden auch ihre Kindprozesse beendet, damit keine
Transkriptionsprozesse neben dem neuen Worker weiterlaufen.
Ein Site-URL-Paket aktualisiert `SITE_URL` und `API_EXTERNAL_URL` auch in manuell
angelegten Umgebungsdateien und ergänzt fehlende Einträge.

Historische Setup-Archive ohne Service-Payload sind keine Updates für den neuen
Service. Neu gebaute Bundles bleiben dagegen dauerhaft auf alten Systemen
ausführbar. Der Service berücksichtigt jeweils das zuletzt veröffentlichte
Setup-Paket für seine Plattform und Architektur, damit eine neu hinzukommende Maschine keine veralteten Releases
nacheinander installiert. Veröffentlichte Dateien
bleiben erhalten, damit später hinzukommende Maschinen sie beziehen können.

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
