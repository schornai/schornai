---
title: "Worker-Installation unter Linux"
description: "Installation und Konfiguration von Document Extractor oder Ollama unter Linux mit systemd."
lang: de
meta:
  app_urls: ["/service", "/artifacts"]
  required_role: "Betriebsadministration des Servers; globale Administration der Zielinstanz"
  role_scope: "Ein Worker-Rechner"
  prerequisites: "64-Bit-Linux mit systemd; Node.js 24+; für Container Docker Compose 2.24.4+."
  status: "verfügbar"
  last_verified: "2026-10-25"
  source_files:
    - "packages/service/src/cli.ts"
    - "packages/service/src/installer.ts"
    - "packages/service/src/services.ts"
    - "packages/service/src/serviceCommands.ts"
    - "packages/xrag/update/bundleUpdate.mts"
    - "packages/xrag/update/container/document-extractor/docker-compose.yml"
---

# Worker-Installation unter Linux

Das Beispiel verwendet Ubuntu 24.04 LTS mit x64 oder ARM64 und betreibt einen
zusätzlichen `document-extractor`. Linux kann auch `core`, `supabase` und `ollama`
betreiben. `transcriber-mlx` setzt Apple Silicon und macOS voraus.

## 1. Grundsystem installieren

Ein dauerhaftes Betriebskonto mit Home-Verzeichnis und passwortgeschütztem
Administrationszugang einrichten. Unter diesem Konto:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl xz-utils tar
case "$(uname -m)" in
  x86_64) SCHORNAI_NODE_ARCH=x64 ;;
  aarch64) SCHORNAI_NODE_ARCH=arm64 ;;
  *) echo "Nicht unterstützte Architektur"; exit 1 ;;
esac
SCHORNAI_NODE_RELEASE="node-v24.22.0-linux-$SCHORNAI_NODE_ARCH"
mkdir -p "$HOME/Downloads/node"
cd "$HOME/Downloads/node"
curl -fSLO "https://nodejs.org/dist/v24.22.0/$SCHORNAI_NODE_RELEASE.tar.xz"
curl -fSLO https://nodejs.org/dist/v24.22.0/SHASUMS256.txt
sha256sum --check --ignore-missing SHASUMS256.txt
sudo tar -xJf "$SCHORNAI_NODE_RELEASE.tar.xz" -C /opt
sudo ln -s "/opt/$SCHORNAI_NODE_RELEASE/bin/node" /usr/local/bin/node
sudo ln -s "/opt/$SCHORNAI_NODE_RELEASE/bin/npm" /usr/local/bin/npm
sudo ln -s "/opt/$SCHORNAI_NODE_RELEASE/bin/npx" /usr/local/bin/npx
node --version
```

Die Version entspricht dem gebündelten Mac-Runtime-Stand; alternativ eine neuere
unterstützte Node-LTS-Version ab 24 aus dem [offiziellen Node-Archiv](https://nodejs.org/en/download/archive/v24.22.0)
verwenden. Auf einem bereits eingerichteten Rechner vorhandene Installationen
prüfen, bevor Symlinks angelegt werden.

Docker Engine einschließlich Compose-Plugin über das offizielle apt-Repository
nach der [Docker-Anleitung für Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
installieren. Dann dem Betriebskonto Zugriff geben und neu anmelden:

```bash
sudo usermod -aG docker "$USER"
# Jetzt abmelden und erneut anmelden.
docker version
docker compose version
docker info
```

Compose muss mindestens 2.24.4 unterstützen. Docker-Zugriff gewährt weitreichende
Hostrechte; nur das vorgesehene Betriebskonto aufnehmen. Für reines Ollama ohne
Container ist Docker nicht erforderlich. Linux verwendet die vorhandene Engine,
keine Colima-VM.

## 2. Passendes Paket und Konfiguration

Das Setup-Bundle für `linux/x64` beziehungsweise `linux/arm64` von der
Betriebsadministration beziehen, Prüfsumme vergleichen und entpacken. Linux-Bundles
enthalten die Service-Laufzeit und Container-Images, aber keine macOS-Binaries.
Zum Bauen siehe [Service-Handbuch](index.md#setup-bundles-bauen).

```bash
mkdir -p "$HOME/Downloads/schornai-setup"
tar -xf "$HOME/Downloads/update.xrag.tar" -C "$HOME/Downloads/schornai-setup"
cd "$HOME/Downloads/schornai-setup"
node ./apps/service/cli.mjs service init --services document-extractor
```

In der erzeugten `~/.aibox/config.json` die ID behalten und
`"sharing": { "url": "https://core.example.com" }` ergänzen. `docker.manageColima`
bleibt `false`. Die private Umgebung anlegen:

```bash
umask 077
touch "$HOME/.aibox/docker.env"
chmod 600 "$HOME/.aibox/docker.env"
nano "$HOME/.aibox/docker.env"
```

```dotenv
SERVICE_API_TOKEN=REPLACE_WITH_CORE_SERVICE_TOKEN
DOCUMENT_EXTRACTOR_BIND_ADDRESS=10.0.0.5
DOCUMENT_EXTRACTOR_PORT=9998
```

`10.0.0.5` durch die tatsächliche private IP dieses Workers ersetzen. Ohne diese
Einstellung ist der Extractor nur über Loopback erreichbar. Er bietet selbst
keine Benutzeranmeldung; den Port ausschließlich für den Core-Rechner in einem
geschützten Netz freigeben. Der reine Extractor benötigt keine Supabase-Schlüssel.
Für eine eigene CA `NODE_EXTRA_CA_CERTS` beim Service-Start setzen.

## 3. Installieren und mit Core verbinden

```bash
bash ./setup.sh
node "$HOME/.aibox/apps/service/cli.mjs" service start
node "$HOME/.aibox/apps/service/cli.mjs" service status
node "$HOME/.aibox/apps/service/cli.mjs" service logs --follow
```

Auf dem **Core-Rechner** `endpoints.documentExtractor` auf
`http://10.0.0.5:9998` setzen und Core neu starten. Die Rolle `document-extractor`
dort nur entfernen, wenn künftig ausschließlich der entfernte Worker verwendet
werden soll. Die bisherige Variable `APACHE_TIKA_URL` wird als Fallback akzeptiert;
der einheitliche Name ist `DOCUMENT_EXTRACTOR_URL`.

In **Cluster → Service** den verbundenen Linux-Rechner und dessen Containerstatus
prüfen. In der Anwendung eine kleine PDF- oder Textdatei hochladen und die
extrahierten Inhalte prüfen. Der Extractor wird von Core über HTTP aufgerufen;
die Service-Verbindung liefert Status und Updates, sie verteilt keine
Extraktionsaufträge automatisch auf mehrere Extractor-Rechner.

## 4. Dauerhaft über systemd betreiben

Zuerst den manuell gestarteten Service stoppen. Dann einen Benutzerdienst
anlegen; `%h` wird von systemd durch das Home-Verzeichnis ersetzt:

```bash
node "$HOME/.aibox/apps/service/cli.mjs" service stop
mkdir -p "$HOME/.config/systemd/user"
cat > "$HOME/.config/systemd/user/schornai-service.service" <<'EOF'
[Unit]
Description=schorn.ai Service

[Service]
Type=simple
ExecStart=/usr/local/bin/node %h/.aibox/apps/service/cli.mjs service run --config %h/.aibox/config.json
Restart=always
RestartSec=10
TimeoutStopSec=180
Environment=PATH=/usr/local/bin:/usr/bin:/bin
Environment=SCHORNAI_SERVICE_MANAGER=systemd

[Install]
WantedBy=default.target
EOF
systemctl --user daemon-reload
systemctl --user enable --now schornai-service
sudo loginctl enable-linger "$USER"
systemctl --user status schornai-service
journalctl --user -u schornai-service -n 100
```

Bei eigener CA im Unit-Abschnitt `[Service]` zusätzlich
`Environment=NODE_EXTRA_CA_CERTS=/absoluter/pfad/ca.pem` eintragen. Linger ermöglicht
den Betrieb ohne aktive Anmeldung. Neustarts oder Wartungsstopps anschließend
mit `systemctl --user restart schornai-service` beziehungsweise `stop` durchführen.
Ein `service stop` allein würde durch systemd wieder gestartet.
Auch vor einem manuellen `setup.sh` zuerst die Unit stoppen und anschließend
wieder starten; automatische Service-Updates übernimmt die Unit selbst.

## Optional: Ollama oder Core

Ollama nach der [offiziellen Linux-Anleitung](https://docs.ollama.com/linux) samt
passenden GPU-Treibern installieren. Wenn Service `ollama` verwalten soll, einen
eventuell vom Installer eingerichteten `ollama.service` vorher mit
`sudo systemctl disable --now ollama` stoppen. `ollama` zu `services` hinzufügen;
Service startet `ollama serve` und speichert Modelle unter `~/.aibox/ollama/models`.
Für Zugriff von Core `OLLAMA_HOST=10.0.0.5:11434` in der Worker-Umgebung und
`endpoints.ollama=http://10.0.0.5:11434` auf Core setzen. Auch diesen Port privat
halten. Modelle über passende XRAG-Pakete bereitstellen. Ein entfernter Core ohne
gemeinsames Modellverzeichnis benötigt nach Modelländerungen einen Neustart.

Für `core` zusätzlich TLS-Zertifikate, Realtime-/Service-Token und die
[Supabase-Verbindung](supabase.md) konfigurieren. `supabase` nur auswählen, wenn
dieser Rechner die Datenbank tatsächlich selbst betreiben soll. Weder ein Core-
noch ein Worker-Start installiert das Anwendungsschema in einer fremden Instanz.
