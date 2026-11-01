---
title: "Core mit lokalem oder entferntem Supabase"
description: "Eine gemeinsame Konfiguration für dieselbe Maschine, einen eigenen Supabase-Server und Supabase Cloud."
lang: de
meta:
  app_urls: ["/service"]
  required_role: "Betriebsadministration; Projektadministration der Supabase-Instanz"
  role_scope: "Gesamte Instanz"
  prerequisites: "Installierter Core; passendes Anwendungsschema und Auth-Hook im Supabase-Projekt."
  status: "verfügbar"
  last_verified: "2026-10-25"
  source_files:
    - "packages/service/src/config.ts"
    - "packages/service/src/environment.ts"
    - "packages/service/src/services.ts"
    - "packages/service/src/serviceCommands.ts"
    - "packages/database/src/auth/createClientWithClaims.ts"
    - "packages/xrag/update/container/docker-compose.yml"
    - "apps/proxy/nginx.conf.template"
    - "apps/web/app/api/auth/access-token/route.ts"
    - "packages/database/src/user/buildAccessToken.ts"
    - "supabase/config.toml"
    - "packages/xrag/update/container/supabase/overrides.yml"
---

# Core mit lokalem oder entferntem Supabase

`service` verwaltet die Prozesse einer Maschine. `core` ist die Dienstgruppe aus
Web-App, Realtime-Server und HTTPS-Proxy. Der Proxy stellt beide Anwendungen unter
einer Adresse bereit: Webseiten unter `/`, Realtime unter `/v2/realtime`.
Supabase ist eine davon unabhängige Verbindung zu Auth, Datenbank und Storage.

| Betrieb                  | Dienste auf dem Core-Rechner               | `endpoints.supabase`                                     |
| ------------------------ | ------------------------------------------ | -------------------------------------------------------- |
| Gemeinsam                | `core`, `supabase`                         | Entfällt; intern `http://kong:8000`                      |
| Eigener Supabase-Rechner | `core`; auf dem anderen Rechner `supabase` | Erreichbare Supabase-API, z. B. `https://db.example.com` |
| Supabase Cloud           | `core`                                     | Projekt-URL, z. B. `https://PROJECT.supabase.co`         |

`document-extractor`, `transcriber-mlx` und `ollama` lassen sich jeweils ergänzen
oder auf weitere Rechner verteilen. Ein entfernter Service-Rechner ist kein
Supabase-Tunnel: Core und Transcriber verbinden sich direkt zur konfigurierten
Supabase-API. `sharing.url` zeigt immer auf Core, unabhängig vom Datenbankstandort.

## Gemeinsame Verbindungskonfiguration

Nach `service init` die erzeugte Maschinenkennung behalten und in `config.json`
beispielsweise diese Felder setzen:

```json
{
  "services": ["core", "document-extractor"],
  "sharing": { "url": "https://core.example.com" },
  "endpoints": { "supabase": "https://PROJECT.supabase.co" }
}
```

Das ist ein Ausschnitt, keine vollständige Ersatzdatei. In die private
`~/.aibox/docker.env` gehören die zum selben Projekt gehörenden Schlüssel:

```dotenv
SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE
SUPABASE_SECRET_KEY=sb_secret_REPLACE
SUPABASE_JWT_SECRET=REPLACE_WITH_PROJECT_JWT_SIGNING_SECRET
SITE_URL=https://core.example.com
SUPABASE_AUTH_HOOK_SECRET=v1,whsec_REPLACE
REALTIME_SERVER_SECRET=REPLACE_WITH_SHARED_RANDOM_SECRET
SERVICE_API_TOKEN=REPLACE_WITH_SHARED_RANDOM_TOKEN
```

Beide Service-/Realtime-Geheimnisse benötigen mindestens 32 Zeichen ohne
Leerzeichen; auf allen beteiligten Rechnern denselben jeweiligen Wert verwenden.
Der Auth-Hook hat einen eigenen Signaturschlüssel. Dateirechte: `chmod 600
~/.aibox/docker.env`. Keine Schlüssel in `config.json` eintragen.

Service bildet die Schlüssel für Web und native Worker auf deren vorhandene
App-Variablen ab. Bestehende `ANON_KEY`/`SERVICE_ROLE_KEY` sowie
`SUPABASE_PUBLIC_ANON_KEY`, `SUPABASE_ANON_KEY` und `SUPABASE_SERVICE_ROLE_KEY`
funktionieren weiter. Die neuen Namen haben Vorrang. Publishable-/Secret-Keys
und Legacy-Keys werden nach demselben Verfahren an die Supabase-Clients übergeben.
Realtime- und Transcriber-Worker benötigen derzeit zusätzlich das JWT-Signiersecret
der Zielinstanz. `createClientWithClaims` erzeugt damit HS256-JWTs für Zugriffe mit
den Rechten des auftraggebenden Benutzers. `SUPABASE_JWT_SECRET` hat Vorrang vor
dem bestehenden `JWT_SECRET`; bei installierten Boxen wird dieser bisherige Wert
automatisch übernommen. API-Schlüssel ersetzen das Signiersecret nicht. Die
Zielinstanz muss diese HS256-JWTs akzeptieren; diese Voraussetzung gilt auch bei
Supabase Cloud. Die aktuelle Worker-Implementierung unterstützt einen Betrieb
allein mit Publishable-/Secret-Keys ohne passendes Signiersecret nicht.
Siehe auch [Supabase: API-Schlüssel](https://supabase.com/docs/guides/getting-started/api-keys).

Eine explizite `endpoints.supabase` hat Vorrang vor `SUPABASE_URL`. Ohne beide
verwendet Service nur dann die lokale API, wenn die Rolle `supabase` gewählt ist.
Für native Worker ist das Port 8085, für Core-Container die interne Docker-Adresse.
Bei einem entfernten Supabase sind kein lokaler Postgres oder Pooler auf Core nötig.
Das Signiersecret bleibt für die Worker erforderlich. Die Proxy-Routen `/auth` und `/sso` verwenden den Hostnamen des
Supabase-Ziels, TLS-SNI und Zertifikatsprüfung.

Auf einer separaten selbst betriebenen Supabase-Maschine setzt du beispielsweise
`SUPABASE_BIND_ADDRESS=10.0.0.6` und `SUPABASE_PORT=8085`. Core verwendet dann
`endpoints.supabase=http://10.0.0.6:8085` in einem geschützten privaten Netz oder
die HTTPS-Adresse eines davor eingerichteten TLS-Proxys. Nur die API muss für
Core erreichbar sein; Postgres und Pooler können an Loopback gebunden bleiben.
Die Supabase-Seite benötigt ihre eigene vollständige Serverkonfiguration aus
dem [Setup-Handbuch](../../../packages/xrag/update/SETUP.md); Core und Worker
übernehmen daraus die API-Schlüssel und das JWT-Signiersecret. Bei einer eigenen CA reicht
`NODE_EXTRA_CA_CERTS` für Node-Prozesse; Nginx benötigt die CA zusätzlich in seinem
Container-Truststore. Öffentliche, vertrauenswürdige TLS-Zertifikate funktionieren
ohne diese Ergänzung.

## Was macht der Auth-Hook?

Vor dem Ausstellen beziehungsweise Erneuern eines Access-Tokens ruft Supabase
`https://core.example.com/api/auth/access-token` auf. Die Web-App prüft die
Standard-Webhooks-Signatur und ergänzt `organization_roles` aus den
Anwendungsrollen, SAML-Zuordnungen und automatisch beitretbaren Arbeitsplätzen.
Darauf beruhen die Berechtigungen der Anwendung. Der Hook muss daher auch bei einer
externen Supabase-Instanz eingerichtet sein; nur URL und API-Keys reichen nicht.
Das entspricht dem [Custom Access Token Hook von Supabase](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook).

Im selbst betriebenen Compose-Stack ist `auth-hook` eine interne Nginx-Weiterleitung
im Netzwerkraum von Auth. Sie macht den signierten HTTP-Hook auf Auths Loopback
erreichbar und leitet ihn an Core weiter. Sie veröffentlicht keinen Port und
enthält keine eigene Rollenlogik. Bei getrennten Rechnern setzt du auf dem
Supabase-Rechner `AUTH_HOOK_URL=https://core.example.com`; der Pfad wird durchgereicht.
Core und Supabase brauchen denselben `SUPABASE_AUTH_HOOK_SECRET`.

Bei Supabase Cloud konfigurierst du im Dashboard unter **Authentication → Hooks**
den **Custom Access Token** als HTTPS-Hook mit der vollständigen Core-URL und
übernimmst dessen Signaturschlüssel in Core. Dort wird kein zusätzlicher
`auth-hook`-Container gestartet. Core muss für den Cloud-Dienst erreichbar sein.
In Supabase außerdem Site-URL und erlaubte Redirect-URLs auf die öffentliche
Core-Adresse einstellen; SMTP und gegebenenfalls SAML gehören zur Zielinstanz.

## Schema und Erstinstallation einer externen Instanz

Eine leere Supabase-Instanz enthält noch keine schorn.ai-Tabellen, RLS-Regeln oder
Storage-Buckets. Die Betriebsadministration muss die Migrationen aus
`supabase/migrations` des gleichen Releases auf das Ziel anwenden. Dafür den
direkten beziehungsweise Session-Pooler-Datenbankzugang aus der Zielinstanz
verwenden, nicht deren HTTP-API-URL. Ein Core-Start verändert keine externe Datenbank.
Die Migrations-CLI zunächst mit `npx --yes supabase@2.120.0 db push --help` prüfen;
den Ziel-DSN privat bereitstellen und vor `db push --include-all --db-url ...`
das Projekt und die Migrationsvorschau kontrollieren. Keine lokalen Demo-Seeds
oder `seed:reset` auf einem produktiven Projekt verwenden.

Die historische Bootstrap-Migration aktiviert das ungenutzte `pgjwt` nur noch,
wenn die Erweiterung auf dem Ziel verfügbar ist. Dadurch scheitert eine frische
Cloud-Installation nicht an dieser unter PostgreSQL 17 auslaufenden Erweiterung.
Bestehende Datenbanken werden durch diese Bootstrap-Anpassung nicht verändert.

Anschließend ein Benutzerkonto und eine globale Administratorrolle über die
Betriebsadministration anlegen und den HTTP-Hook aktivieren. Anmeldung und
Token-Erneuerung, Arbeitsplatzrechte, Datei-Upload und Realtime-Verbindung
prüfen. Ein Wechsel der URL verschiebt keine bestehenden Daten oder Benutzer.
Diese müssen bei einem Umzug separat migriert werden.

## Lokale Entwicklung und installierte Box

In der Entwicklung verwendet `supabase` unverändert `supabase/config.toml`:

```bash
npm run dev:service -- --services core,supabase,document-extractor
```

Die Auswahl gilt bei der ersten Erstellung; bestehende `config.json` bearbeiten.
Service lädt `supabase/.env` und `.env.local`, prüft den lokalen CLI-Status und
führt bei Bedarf `supabase start` aus. Eine vorher laufende Instanz bleibt beim
Stoppen erhalten. Eine von Service gestartete Instanz wird mit normalem
`supabase stop` einschließlich Datensicherung gestoppt, niemals mit Reset oder
`--no-backup`. Der erste Start einer neuen CLI-Datenbank lädt die konfigurierten
Migrationen und lokalen Demo-Seeds. Die Zugangsdaten der Apps müssen dazu passen.

Installierte Boxen verwenden den gepinnten selbst gehosteten Compose-Stack.
`supabase` startet ihn als eine Dienstgruppe; eine separate Rolle `database`
gibt es nicht. Compose bereitet intern zuerst das bestehende Postgres-Konfigurationsvolume
vor, wartet auf Postgres und startet die abhängigen Komponenten. Die Vorbereitung
erhält insbesondere vorhandene Schlüssel und ergänzt nur fehlende Image-Defaults.
Sie ist kein zusätzlicher manueller Installationsschritt. Anschließend laufen
die Anwendungsmigrationen. PostgreSQL 15, Volumes und Ports bestehender Boxen
werden beibehalten; ein Umstieg auf eine andere PostgreSQL-Hauptversion ist eine
separate Datenmigration. Der CLI-Entwicklungsstack verwendet dagegen PostgreSQL 17.
