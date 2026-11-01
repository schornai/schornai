---
title: "Sicherheit und Betrieb"
description: "Voraussetzungen für geschützte Anmeldung, Echtzeitverbindungen und den Betrieb der Box."
lang: de
meta:
  app_urls: []
  required_role: "Globale Administration für Konfiguration und Updates; Host-Administration für Betriebssystemeinstellungen."
  role_scope: "Gesamte Instanz und Box-Host"
  prerequisites: "Zugriff auf die private Betriebskonfiguration und eine gesicherte Wartungssitzung."
  status: "verfügbar"
  last_verified: "2026-10-24"
  source_files:
    [
      "apps/web/app/api/auth/access-token/route.ts",
      "apps/web/lib/storageDownloadResponse.ts",
      "packages/realtime/src/server/createRealtimeAuthentication.ts",
      "packages/database/src/user/buildAccessToken.ts",
      "packages/xrag/update/scripts/securitySecrets.ts",
      "packages/xrag/update/container/docker-compose.yml",
      "packages/xrag/update/container/supabase/overrides.yml",
      "packages/service/src/installer.ts",
      "packages/xrag/update/SETUP.md",
      "packages/xrag/update/database/migration/migrate-entrypoint.sh",
      "packages/xrag/update/container/volumes/api/kong-entrypoint.sh",
      "packages/database/src/storage/validatePath.ts",
    ]
---

# Sicherheit und Betrieb

Plane für das Update eine Wartungssitzung. Sichere Datenbank und private
Konfiguration und aktualisiere Web-App, Realtime-Server, Transcriber und
Datenbankmigrationen gemeinsam.

Beim Start nach einem Update werden alle noch nicht in der Migrationshistorie
registrierten Migrationen ausgeführt. Das gilt auch für nachgelieferte Dateien,
deren Zeitstempel vor bereits ausgeführten Migrationen liegt. Bereits registrierte
Migrationen werden übersprungen; ein erneuter Lauf setzt bei den noch fehlenden
Migrationen fort.

Die Web-App startet unabhängig vom Ergebnis des Migrationsdienstes. Bei SQL-Fehlern
oder einer widersprüchlichen Migrationshistorie bricht der Migrationslauf ab;
Funktionen, die das fehlende Datenbankschema benötigen, können dann fehlschlagen.
Prüfe in der [Mac-App oder über die Service-CLI](../box-admin/index.md#mac-app-und-logs)
die Ausgaben des Supabase-Starts und Meldungen mit dem Absender **migrate**.
Bereits erfolgreich ausgeführte Migrationen werden nicht automatisch zurückgerollt.
Die Betriebsadministration muss die Ursache beheben und die Migration erneut ausführen;
ein Datenbank-Reset oder automatisches Umschreiben der Historie findet nicht statt.

Die Sicherheitsmigration prüft, dass eine Aktivitätskennung nicht mehreren
unterschiedlichen Gesprächen oder Transkriptionsvorgängen zugeordnet ist. Bei
bestehenden Konflikten stoppt sie ohne automatische Datenlöschung. Die
Betriebsadministration kann die betroffenen Datensätze mit
`supabase/diagnostics/activity_parent_conflicts.sql` ermitteln und muss die
richtige Zuordnung vor einem erneuten Migrationsversuch klären.

## Geschützte Anmeldung und Echtzeitverbindungen

Konfiguriere für Supabase Auth und Web-App denselben privaten
`SUPABASE_AUTH_HOOK_SECRET`.
Docker Compose übergibt ihn als `GOTRUE_HOOK_CUSTOM_ACCESS_TOKEN_SECRETS` an Auth.
Fehlt der Schlüssel oder stimmt er nicht überein, kann die Anmeldung beziehungsweise
Sitzungserneuerung nicht abgeschlossen werden. In der lokalen Entwicklung heißt
die entsprechende Supabase-Variable `CUSTOM_ACCESS_TOKEN_SECRETS`.

Web-App, Realtime-Server und Transcriber benötigen zusätzlich denselben privaten
`REALTIME_SERVER_SECRET` mit mindestens 32 Zeichen ohne Leerzeichen. Auf der Box
steht er in `~/.aibox/docker.env`; in der lokalen Entwicklung trägst du denselben
Wert in die `.env`-Dateien der drei Anwendungen ein. Erzeuge einen neuen Wert mit
`openssl rand -hex 32`.

Wenn Dateiübertragungen, Dateiänderungen oder Verarbeitungsaufträge an einer
abgelehnten Verbindung zum Hintergrunddienst scheitern, prüfe
`REALTIME_SERVER_SECRET` in der Konfiguration von Web-App, Realtime-Server und
Transcriber. Korrigiere fehlende oder abweichende Werte und starte die betroffenen
Dienste neu.

Die Ersteinrichtung erzeugt beide Schlüssel zufällig und unabhängig voneinander.
Der Updater ergänzt fehlende Schlüssel in bestehenden `docker.env`-Dateien und
beschränkt deren Dateirechte auf das Betriebskonto. Bestehende gültige Schlüssel
bleiben erhalten. Bei **Invalid REALTIME_SERVER_SECRET** ersetze den betreffenden Wert durch einen
zufälligen Schlüssel mit mindestens 32 Zeichen ohne Leerzeichen. Bei
**Invalid SUPABASE_AUTH_HOOK_SECRET** verwende das Format
`v1,whsec_<Base64-Schlüssel>` mit einem separaten Schlüssel aus
`openssl rand -base64 32`. Übernimm Änderungen in alle betroffenen Dienste und
starte sie neu. Beschränke den Zugriff auf Konfiguration und Backups auf die
Betriebsadministration.

Melde dich nach dem Update neu an und prüfe unter **Profil → Berechtigungen**
deine Rollen. Bereits ausgestellte Sitzungstoken behalten ihre bisherigen
Rechte bis zur Erneuerung. Bei Verdacht auf unberechtigten Zugriff muss die
Administration betroffene Sitzungen widerrufen und Zugangsschlüssel erneuern.

## Dateien und Netzwerk

HTML- und SVG-Originale werden heruntergeladen. Zum Lesen ihres Textinhalts in
der App verwende die verarbeitete Vorschau. Öffne heruntergeladene Originale
nur, wenn du ihrer Quelle vertraust; lokale Programme können enthaltene Skripte
ausführen.

Für schreibende Agentenwerkzeuge braucht die Person mindestens die Bearbeiterrolle
im Arbeitsplatz der Ablage und die Agentenverbindung einen Schreibmodus. Prüfe
bei einer abgelehnten Schreibaktion beide Einstellungen unter
[Agent bearbeiten → Rollen → Dokumentenablage](../agent/edit/dokumentenablagen.md).

Die Datenbankzugänge und der direkte Supabase-Gateway-Port des mitgelieferten
Compose-Setups sind nur an die Loopback-Adresse des Hosts gebunden. Externe
Clients verwenden den vorgesehenen HTTPS-Proxy. Für benötigten administrativen
Fernzugriff ist eine gesicherte Verbindung zum Host erforderlich. Der lokale
Entwicklungsproxy und Tika sind ebenfalls nicht für andere Rechner freigegeben.

Bei Zertifikatsfehlern prüfe den Hostnamen der aufgerufenen URL gegen das Zertifikat.
Für eine eigene Zertifizierungsstelle setze `NODE_EXTRA_CA_CERTS` auf deren
PEM-Datei und starte den betroffenen Node-Dienst neu.

## Host und Wartung

Die mitgelieferten Node-Dienste verwenden Node 24.22.0; für Datei-Extraktion wird
Tika 4.1 eingesetzt. Aktualisiere Tika und die Anwendungen gemeinsam. Die Box
bleibt auf PostgreSQL 15 und erhält dort das aktuelle Wartungsrelease; dieses
Update nimmt keinen automatischen Wechsel auf eine neue PostgreSQL-Hauptversion
vor. Ein solcher Wechsel benötigt eine gesonderte Datenmigration.

Prüfe auf dem Mac-Host folgende Einstellungen:

- **Benutzer:innen & Gruppen:** automatische Anmeldung ausschalten und ein
  individuelles Passwort für das Betriebskonto setzen.
- **Datenschutz & Sicherheit → FileVault:** Laufwerksverschlüsselung einschalten.
- **Sperrbildschirm:** Passwort sofort nach Beginn des Bildschirmschoners oder
  Ausschalten des Displays verlangen.
- Administrationsbefehle mit Passwortbestätigung ausführen; vorhandene
  uneingeschränkte `NOPASSWD`-Regeln durch die Host-Administration entfernen lassen.

FileVault erfordert nach einem Neustart die Entsperrung durch eine berechtigte
Person. Plane diesen Schritt für Stromausfälle und betreute Wartungssitzungen ein.
Der Service kann die Entsperrung des Rechners nicht übernehmen.

Weiter: [Rollen](../me/permissions.md) · [Daten und Freigaben](daten-und-freigaben.md)
· [Fehlerbehebung](fehlerbehebung.md)

## Service-Freigabe

Web-App, Realtime-Dienst und alle Service, die ihren Dateikatalog beziehen, verwenden
denselben privaten `SERVICE_API_TOKEN` mit mindestens 32 Zeichen. Dieser
Schlüssel ist von `REALTIME_SERVER_SECRET` und `SUPABASE_AUTH_HOOK_SECRET`
unabhängig. Der neue Installer ergänzt fehlende Schlüssel; bei mehreren
Maschinen muss die Betriebsadministration die gemeinsamen Werte gezielt
verteilen. Der Freigabetoken erlaubt Lesezugriff auf veröffentlichte XRAG-Dateien
und die beiden Yjs-Dokumente für Artefaktänderungen und Maschinenstatus. Service
melden ihren Status über validierte Nachrichten unter ihrer konfigurierten
Maschinen-ID. Sie dürfen weder Artefakte veröffentlichen oder löschen noch
beliebige Yjs-Dokumente bearbeiten. Der gemeinsame Schlüssel bildet eine
Vertrauensgruppe; er ist keine getrennte Identitätsprüfung pro Maschine.

Der neue Service-Updater verwendet weder `sudo` noch einen automatischen
Rechner-Neustart. Er ersetzt nur Dateien des Betriebskontos und pausiert die
ausgewählten Dienste. Bereits installierte Mac-Apps werden unter
`~/Applications` aktualisiert. Alte Setup-Pakete sind mit diesem Ablauf nicht
kompatibel. Siehe [Service und Mac-App](../box-admin/index.md).
