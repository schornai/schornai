---
title: "Worker-Installation unter macOS"
description: "Installation und Konfiguration eines MLX-Workers auf einem Mac mit Apple Silicon, einschließlich Autostart."
lang: de
meta:
  app_urls: ["/service", "/artifacts"]
  required_role: "Betriebsadministration des Mac; globale Administration der Zielinstanz"
  role_scope: "Ein Worker-Rechner"
  prerequisites: "Apple Silicon, passendes macOS-Setup-Bundle, erreichbarer Core und Supabase."
  status: "verfügbar"
  last_verified: "2026-10-30"
  source_files:
    - "packages/service/src/cli.ts"
    - "packages/service/src/installer.ts"
    - "packages/service/src/environment.ts"
    - "packages/service/src/services.ts"
    - "packages/service/src/serviceCommands.ts"
    - "packages/utils/src/prepareTranscriberEnvironment.ts"
    - "apps/transcriber-mac/src/service/runTranscriber.ts"
    - "apps/transcriber-mac/src/service/transcribeWorker.ts"
    - "packages/database/src/auth/createClientWithClaims.ts"
    - "packages/xrag/update/bundleUpdate.mts"
    - "apps/transcriber-mac/src/service/getInstalledModels.ts"
---

# Worker-Installation unter macOS

Diese Anleitung richtet einen zusätzlichen `transcriber-mlx`-Worker an einem
bestehenden Core ein. Er benötigt einen Apple-Silicon-Mac; Intel-Macs und Linux
unterstützen diesen Dienst nicht. Ein reiner Transcriber braucht weder Docker
noch eine eigene Datenbank, Web-App oder Electron-App.

## 1. Maschine und Installationspaket vorbereiten

Ein dauerhaftes Benutzerkonto mit eigenem Passwort anlegen, FileVault aktivieren
und im Netzbetrieb automatisches Einschlafen verhindern. Alle folgenden Befehle
als dieses Konto ausführen. Nach einem Neustart muss der Mac entsperrt werden.

Von der Betriebsadministration das vertrauenswürdige Setup-Bundle für
`darwin/arm64` und dessen Prüfsumme beziehen. Es enthält Node.js, ffmpeg und den
fertig gebauten MLX-Transcriber; auf dem Ziel-Mac sind kein npm, Python oder
Compiler nötig. Zum Erstellen des Pakets siehe [Service-Handbuch](index.md#setup-bundles-bauen).

```bash
mkdir -p "$HOME/Downloads/schornai-setup"
tar -xf "$HOME/Downloads/update.xrag.tar" -C "$HOME/Downloads/schornai-setup"
cd "$HOME/Downloads/schornai-setup"
./bin/node/node --version
./bin/node/node ./apps/service/cli.mjs service init --services transcriber-mlx
```

`init` erstellt `~/.aibox/config.json` mit einer eindeutigen ID. Keine ID von einem
anderen Worker kopieren. Die Datei mit einem Texteditor öffnen und die erzeugten
Felder behalten. Ergänzen:

```json
{
  "sharing": { "url": "https://core.example.com" },
  "endpoints": { "supabase": "https://PROJECT.supabase.co" }
}
```

Die Supabase-URL kann genauso auf einen eigenen Server zeigen. Aus `sharing.url`
ergibt sich automatisch `https://core.example.com/v2/realtime`. Nur bei abweichender
Netzführung zusätzlich `endpoints.realtime` setzen.

## 2. Bestehende Instanz verbinden

```bash
umask 077
touch "$HOME/.aibox/docker.env"
chmod 600 "$HOME/.aibox/docker.env"
nano "$HOME/.aibox/docker.env"
```

Die folgenden Werte von der Zielinstanz übernehmen:

```dotenv
SUPABASE_PUBLISHABLE_KEY=REPLACE_WITH_PROJECT_PUBLIC_KEY
SUPABASE_SECRET_KEY=REPLACE_WITH_PROJECT_SERVER_KEY
SUPABASE_JWT_SECRET=REPLACE_WITH_PROJECT_JWT_SIGNING_SECRET
REALTIME_SERVER_SECRET=REPLACE_WITH_CORE_REALTIME_SECRET
SERVICE_API_TOKEN=REPLACE_WITH_CORE_SERVICE_TOKEN
```

Hier keine neuen, unabhängigen Instanzschlüssel erzeugen. Legacy-Anon-/Service-Role-Keys
sind ebenfalls möglich. Der Transcriber benötigt das JWT-Signiersecret für
Datenbank- und Storage-Zugriffe mit den Rechten des auftraggebenden Benutzers.
Ein bestehendes `JWT_SECRET` wird als `SUPABASE_JWT_SECRET` übernommen. Ein explizites, nicht leeres `SUPABASE_JWT_SECRET` hat Vorrang. Diese Zuordnung gilt bei jedem Start und bleibt nach Updates erhalten; ein zusätzlicher Alias in `docker.env` ist nicht nötig. Die
Zielinstanz muss damit signierte HS256-JWTs akzeptieren. Ein Datenbankpasswort
ist nicht nötig. Bei eigener CA die Zertifikatsdatei lokal speichern und vor dem Start
`NODE_EXTRA_CA_CERTS` darauf setzen; das gilt auch beim späteren Autostart.
Die [Supabase-Anleitung](supabase.md) beschreibt den nötigen Auth-Hook auf Core.

Vor dem Verbinden mit der Auftragswarteschlange prüft der Worker die benötigten Supabase- und Realtime-Variablen. Fehlen beide JWT-Varianten, meldet er einen Konfigurationsfehler mit `SUPABASE_JWT_SECRET` und übernimmt keine Aufträge. Fehlermeldungen nennen keine Schlüsselwerte. Die Transkription und Speicherung erfolgen weiterhin mit den Rechten des auftraggebenden Benutzers.

## 3. Installieren, starten und Modell bereitstellen

Im entpackten Setup-Ordner:

```bash
bash ./setup.sh
"$HOME/.aibox/bin/node/node" "$HOME/.aibox/apps/service/cli.mjs" service start
"$HOME/.aibox/bin/node/node" "$HOME/.aibox/apps/service/cli.mjs" service status
"$HOME/.aibox/bin/node/node" "$HOME/.aibox/apps/service/cli.mjs" service logs --follow
```

In Core als globale Administration **Cluster → Service** öffnen. Der neue Mac
sollte dort innerhalb weniger Sekunden erscheinen. In **Einstellungen → XRAG
hochladen** ein passendes MLX-Whisper-Modellpaket veröffentlichen. Service lädt nur
die zur Rolle passenden Modelle und startet den Worker nach erfolgreicher
Installation neu. Ohne lokal vorhandene Konfiguration und Gewichte meldet der
Transcriber keine Modellfähigkeit. Einen kurzen Audioauftrag mit genau diesem
Modell ausführen und das Ergebnis prüfen. `service sync` fordert bei Bedarf
einen sofortigen Abgleich an.

Der Python-Prozess bleibt zwischen Aufträgen aktiv und hält das zuletzt verwendete Modell im Speicher. Das reduziert die Startzeit nachfolgender Aufträge mit demselben Modell; ein Modellwechsel lädt das andere Modell. Ein Abbruch beendet den Python-Prozess, der nächste Auftrag startet ihn neu. Der Arbeitsspeicher für das zuletzt verwendete Modell bleibt bis zum Wechsel oder Dienstende belegt. Das Setup-Bundle enthält den vollständigen Ordner `dist/transcribe-worker`; bei manueller Verteilung muss dieser Ordner einschließlich seiner Laufzeitdateien übernommen werden.

## 4. Autostart nach Anmeldung

Eine einzige Startmethode verwenden. Für einen Betrieb ohne Mac-App zuerst
`service stop` ausführen und einen LaunchAgent anlegen:

```bash
"$HOME/.aibox/bin/node/node" "$HOME/.aibox/apps/service/cli.mjs" service stop
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$HOME/Library/LaunchAgents/ai.schorn.service.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>ai.schorn.service</string>
  <key>ProgramArguments</key><array>
    <string>$HOME/.aibox/bin/node/node</string>
    <string>$HOME/.aibox/apps/service/cli.mjs</string>
    <string>service</string><string>run</string>
    <string>--config</string><string>$HOME/.aibox/config.json</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>EnvironmentVariables</key><dict>
    <key>SCHORNAI_SERVICE_MANAGER</key><string>launchd</string>
  </dict>
  <key>StandardOutPath</key><string>$HOME/.aibox/logs/launchd.log</string>
  <key>StandardErrorPath</key><string>$HOME/.aibox/logs/launchd-error.log</string>
</dict></plist>
EOF
plutil -lint "$HOME/Library/LaunchAgents/ai.schorn.service.plist"
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/ai.schorn.service.plist"
```

Bei eigener CA in der plist unter `EnvironmentVariables` zusätzlich
`NODE_EXTRA_CA_CERTS` mit absolutem Pfad eintragen. Für Wartung zuerst
`launchctl bootout "gui/$(id -u)/ai.schorn.service"` verwenden; andernfalls startet
`KeepAlive` einen per CLI gestoppten Service wieder. Der LaunchAgent läuft nach
Benutzeranmeldung, nicht vor dem Entsperren von FileVault.

Alternativ `apps/schorn.ai Admin.app` aus dem Bundle nach `~/Applications` kopieren
und als Anmeldeobjekt hinzufügen. Dann keinen LaunchAgent parallel einrichten.
Die App steuert denselben Service; ihr Schließen stoppt den Worker nicht.
