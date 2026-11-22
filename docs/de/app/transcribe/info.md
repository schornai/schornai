---
title: "Informationen zu einem Transkriptor"
description: "Modell, Prompt und Arbeitsplatz vor oder während einer Transkription nachschlagen."
lang: de
meta:
  app_urls:
    [
      "/app/transcribe/[transcriberId]",
      "/app/transcribe/[transcriberId]/[activityId]/info",
    ]
  required_role: "Benutzer:in (user) oder höher im Arbeitsplatz des Transkriptors."
  role_scope: "Betroffener Arbeitsplatz"
  prerequisites: "Keine."
  status: "verfügbar"
  last_verified: "2026-11-22"
  source_files:
    [
      "apps/web/app/_actions/storageQueueProcessFiles.ts",
      "apps/web/app/(main)/app/transcribe/[transcriberId]/page.tsx",
      "apps/web/app/(main)/app/transcribe/[transcriberId]/[activityId]/info/page.tsx",
    ]
---

# Informationen zu einem Transkriptor

Über **Infos** an einem Transkriptor siehst du seine aktuelle Konfiguration. Innerhalb einer Transkriptionsaktivität erreichst du dieselben Informationen über den Reiter **Info**.

Prüfe das ausgewählte Modell, den **Prompt** und den Arbeitsplatz. Der Prompt enthält häufig Fachbegriffe oder Schreibweisen, die bei dieser Art von Aufnahme wichtig sind. Ein unbekanntes Modell ist ein Anlass, die Zuordnung durch die Arbeitsplatzadministration prüfen zu lassen.

Unter der Karte startest du eine Transkription oder änderst die Favoritenmarkierung. Als Arbeitsplatzadministrator:in kannst du hier auch den Transkriptor exportieren, einem XRAG-Paket hinzufügen, bearbeiten oder nach Bestätigung löschen.

Von der Transkriptorkarte aus kannst du eine **Neue Transkription** beginnen, **Audio aufnehmen** oder die Konfiguration als Favorit markieren. Innerhalb einer Aktivität führt **Dateien** zurück zu ihren Medien und Transkripten.

Die Angaben zeigen die aktuelle Konfiguration; ältere Transkripte können mit anderen Einstellungen entstanden sein. Um eine Datei mit den aktuellen Einstellungen neu zu transkribieren, wähle im Reiter **Dateien** ihr Aktionsmenü und **Erneut verarbeiten**.

Zum Ändern öffnest du mit entsprechenden Rechten [Bearbeiten](edit.md).

## Zugehörige MCP-Werkzeuge

- `platform_transcribers_list` liest die zugänglichen Konfigurationen ab der Stufe **Benutzer**. Mit `platform_favorites_update` änderst du auf derselben Stufe die Favoriten deines eigenen Kontos.
- `platform_transcriber_update` und `platform_transcriber_delete` ändern oder löschen die Konfiguration. Dafür brauchst du mindestens die Stufe **Workspace-Administrator** und Administratorrechte im betroffenen Arbeitsplatz.
- `platform_xrag_export` exportiert das Objekt, `platform_xrag_saved_package_add` fügt es deiner persönlichen Paketauswahl hinzu. Beide benötigen mindestens die Stufe **Workspace-Administrator** und Exportrechte für die ausgewählten Objekte.
