---
title: "XRAG-Pakete bereitstellen"
description: "Modelle, Ressourcen und Updates über den gemeinsamen Dateikatalog verteilen."
lang: de
meta:
  app_urls:
    ["/settings/xrag", "/api/service/artifacts", "/api/service/artifacts/[id]"]
  required_role: "Administrator:in (admin), global, für Veröffentlichungen."
  role_scope: "Gesamte Instanz"
  prerequisites: "Vertrauenswürdiges XRAG-Paket; Service mit passender Dienstkonfiguration und Freigabetoken."
  status: "verfügbar"
  last_verified: "2026-11-08"
  source_files:
    [
      "apps/web/app/(settings)/settings/xrag/_components/XRAGUpload.tsx",
      "apps/web/app/(settings)/settings/xrag/_components/XRAGUploadProvider.tsx",
      "apps/web/app/(settings)/settings/xrag/_components/XRAGPublicationStatus.tsx",
      "apps/web/lib/resumeUpload.ts",
      "apps/web/app/(settings)/settings/xrag/_actions/submitXRAG.ts",
      "apps/web/app/api/service/artifacts/route.ts",
      "apps/web/app/api/service/artifacts/[id]/route.ts",
      "packages/database/src/xrag/publishArtifact.ts",
      "packages/database/src/xrag/processArtifactPublication.ts",
      "packages/database/src/xrag/getArtifactPublication.ts",
      "packages/database/src/xrag/cleanupArtifactPublications.ts",
      "apps/realtime/src/artifacts/worker.ts",
      "packages/service/src/artifactDownload.ts",
      "packages/service/src/activateArtifactDirectory.ts",
      "packages/service/src/artifacts.ts",
      "packages/xrag/src/archive.ts",
      "packages/service/src/installer.ts",
      "packages/xrag/update/bundleUpdate.mts",
    ]
---

# XRAG-Pakete bereitstellen

Über den privaten Dateikatalog verteilst du XRAG-Pakete an deine
[Services](../box-admin/index.md). Jeder Service bezieht die Pakete, die zu seiner
Plattform, Architektur und den ausgewählten Diensten passen. Vorübergehend offline
befindliche Maschinen können die Dateien nach ihrer Wiederverbindung beziehen.

![XRAG-Uploadbereich](../assets/xrag.png)

## Paket veröffentlichen

1. Prüfe Quelle, Zielversion und benötigte Dienste des Pakets. Setup-Pakete können Programme auf den Maschinen ausführen.
2. Öffne **Einstellungen → XRAG hochladen** als globale Administratorin oder globaler Administrator.
3. Ziehe die `.xrag.tar`-Datei in den Uploadbereich oder wähle **Hochladen**. Du kannst mehrere Dateien auswählen; sie werden nacheinander übertragen.
4. Warte auf den Veröffentlichungsstatus. Nach der Übertragung wird das Paket geprüft. Dafür muss das Browserfenster nicht geöffnet bleiben.
5. Prüfe die Installation auf den betreffenden Maschinen mit `npx schornai service logs --follow` oder in der Mac-App.

Eine abgeschlossene Übertragung bedeutet noch nicht, dass das Paket veröffentlicht
oder auf den Maschinen installiert ist. Der Uploadbereich zeigt den Status der
Veröffentlichung. Die letzten 100 Aufträge werden für bis zu 72 Stunden in diesem
Browser und Benutzerkonto gespeichert und nach einem Neuladen erneut abgefragt.
Bei deaktiviertem Browserspeicher gilt das nur für die geöffnete Seite.

Die Veröffentlichung akzeptiert Archive bis 200 GiB. Niedrigere Limits der
jeweiligen Storage-Installation gelten zusätzlich. Unter
[Cluster → Artefakte](../artifacts/index.md) kannst du veröffentlichte Dateien
prüfen und löschen. Bereits gelöschter Paketinhalt kann nicht erneut
veröffentlicht werden; erstelle bei Bedarf ein neues Paket.

### Upload fortsetzen

Wähle nach einem Abbruch dieselbe lokale Datei erneut aus. Der Browser kann die
Übertragung innerhalb von 24 Stunden fortsetzen, wenn Benutzerkonto, Dateiname,
Änderungsdatum und Dateigröße übereinstimmen. Ist die Uploadsitzung abgelaufen oder
der Browserspeicher gelöscht, beginnt die Übertragung neu.

Ein Veröffentlichungsauftrag läuft auch nach dem Schließen des Browsers oder
einem Serverneustart weiter. Vorübergehende Fehler werden bis zu fünfmal
bearbeitet. Bei einer endgültig fehlgeschlagenen Veröffentlichung prüfst du das
Paket und lädst es erneut hoch.

## Installation und Empfänger

Der Service gleicht den Katalog beim Start, nach Wiederverbindungen und bei
Änderungen ab. Mit `npx schornai service sync` kannst du den Abgleich manuell
anstoßen. Fehlgeschlagene Installationen werden mit wachsendem Abstand bis maximal
60 Sekunden erneut versucht. Bereits erfolgreich installierte Pakete werden nicht
erneut installiert.

| Pakettyp                     | Empfänger                                                  |
| ---------------------------- | ---------------------------------------------------------- |
| Setup/Update                 | Service-Instanzen mit passender Plattform und Architektur. |
| MLX-Whisper-Modell           | Maschinen mit `transcriber-mlx`.                           |
| Ollama-Modell                | Maschinen mit `ollama`.                                    |
| Zertifikat oder Site-URL     | Maschinen mit `supabase` oder `core`.                      |
| Allgemeine Dateien (`files`) | Maschinen mit einem in `targets` genannten Dienst.         |

Allgemeine Dateien werden unter `~/.aibox/assets/<name>/<Prüfsumme>/` abgelegt und
nicht ausgeführt. Die in `config.json` ausgewählten Dienste müssen vom Service
unterstützt werden.

Wähle ein veröffentlichtes Modell anschließend im Agenten, Transkriptor oder
Suchindex aus. Transcriber erhalten Aufträge erst, wenn die benötigten Gewichte
und die Konfiguration lokal vorhanden sind. Ein entfernter Ollama-Dienst kann
über `endpoints.ollama` angebunden werden. Nach Änderungen an seinen Modellen muss
der Realtime-Dienst seine Fähigkeiten neu ermitteln, gegebenenfalls durch einen
Neustart.

### Setup-Updates

Ein Setup-Paket ist eine `.xrag.tar`-Datei. Der Service installiert das zuletzt
veröffentlichte passende Setup für seine Plattform und Architektur. Dabei werden
die ausgewählten Dienste vorübergehend pausiert. Ein Rechnerneustart oder `sudo`
ist nicht erforderlich.

Setup-Updates laufen ausschließlich vorwärts. Nach einem Abbruch kann derselbe
Release erneut versucht werden; eine ältere Veröffentlichung wird nicht als
Ersatz installiert. Überholte Setup-Archive werden auf dem Server automatisch
entfernt. Pro Plattform und Architektur bleibt der aktuelle Release erhalten.
Modelle und andere Datenpakete werden dadurch nicht gelöscht.

Bei einer manuellen Installation werden die entpackten Laufzeitverzeichnisse
verbraucht. Entpacke das Archiv für einen erneuten Installationsversuch nochmals.
Eine unter `~/Applications` vorhandene optionale Mac-App wird ebenfalls
aktualisiert. Weitere Hinweise findest du in der
[Betriebsanleitung](../box-admin/index.md).

## Freigabe konfigurieren

In der privaten Umgebung der Web-App, des Realtime-Dienstes und jeder beziehenden
Maschine muss derselbe `SERVICE_API_TOKEN` mit mindestens 32 Zeichen stehen.
`sharing.url` in der Maschinenkonfiguration zeigt auf die Web-App. Verwende TLS
und vertraute Zertifikate für entfernte Rechner.

Der Token erlaubt das Lesen des Katalogs und der veröffentlichten Dateien sowie
Statusmeldungen des Services. Er erlaubt keine administrativen Änderungen. Ein
Transcriber benötigt daneben seine gesonderten Betriebszugangsdaten.

## Speicher und Wiederaufnahme auf Maschinen

Unterbrochene Downloads werden fortgesetzt und nach Abschluss anhand ihrer
Prüfsumme kontrolliert. Beschädigte Dateien werden verworfen. Zwei Minuten ohne
Datenfortschritt brechen einen Transfer ab; für einen laufenden Download gibt es
kein festes Stundenlimit.

Der Service prüft den freien Speicher vor Download und Entpacken. Beim Start und
vor dem Abgleich entfernt er verwaiste Arbeitsverzeichnisse und abgelaufene
Teildownloads. Bei Platzbedarf werden ältere Teildownloads zuerst entfernt.
Installierte Nutzdaten und die Datenbank bleiben erhalten. Unterbrochene
Verzeichniswechsel werden vor dem Start der Dienste repariert.

Im optionalen Abschnitt `artifacts` der `config.json` kannst du die Grenzen
anpassen:

| Einstellung         | Standard               | Bedeutung                                                |
| ------------------- | ---------------------- | -------------------------------------------------------- |
| `maxCacheBytes`     | 536870912000 (500 GiB) | Obergrenze für Downloads und reservierten Arbeitsbedarf. |
| `minFreeBytes`      | 5368709120 (5 GiB)     | Freie Reserve auf dem Dateisystem.                       |
| `maxExtractedBytes` | 429496729600 (400 GiB) | Maximale entpackte Nutzdaten pro Archiv.                 |
| `maxEntries`        | 1000000                | Maximale Zahl der Archiveinträge.                        |
| `retentionHours`    | 72                     | Aufbewahrung ungenutzter Teildownloads in Stunden.       |
| `idleTimeoutMs`     | 120000                 | Zeit ohne Downloadfortschritt in Millisekunden.          |

Auf dem Server werden ungenutzte Uploads und Arbeitsdateien nach 72 Stunden
bereinigt. Aktive Veröffentlichungsaufträge und benötigte veröffentlichte Dateien
bleiben erhalten. Fehlgeschlagene Löschungen werden erneut versucht.

## Fehler untersuchen

Notiere Paketname, Zeitpunkt und Fehlermeldung. Prüfe
`~/.aibox/logs/service.log` und für Setup-Ausgaben
`~/.aibox/logs/update/log_<Zeitstempel>.txt`. Der lokale Installationsstatus steht
in `~/.aibox/service-artifacts.json`.

Eine Prüfsumme bestätigt die Unverändertheit einer Datei, nicht die
Vertrauenswürdigkeit ihres Herausgebers. Sichere Daten und Konfiguration vor
Updates. Siehe [Sicherheit und Betrieb](../hilfe/sicherheit-und-betrieb.md).

## Zugehörige MCP-Werkzeuge

- `platform_asset_upload`: Profilbild, Logo oder XRAG-Paket bis 10 MiB hochladen. Mindeststufe: **Benutzer**.
- `platform_asset_upload_url`: Uploadadresse für Profilbild, Logo oder XRAG-Paket erhalten. Mindeststufe: **Benutzer**.
- `platform_artifact_publish`: Veröffentlichung eines hochgeladenen XRAG-Pakets einreihen; liefert eine Auftrags-ID. Mindeststufe: **Globaler Administrator**.
- `platform_artifact_publication_get`: Mit dieser Auftrags-ID den Status (`queued`, `processing`, `published`, `error`) und nach Veröffentlichung die Artefakt-Prüfsumme abfragen. Mindeststufe: **Globaler Administrator**. Bestätigt keine Installation auf Maschinen.

Jeder Aufruf prüft zusätzlich die Berechtigung für das eigene Konto bzw. die
betroffene Ressource. Die Zugriffsstufe verleiht keine Rechte. Voraussetzungen,
besondere Grenzen und der vollständige Werkzeugkatalog stehen unter
[Plattformzugriff](../agent/edit/plattformzugriff.md).
