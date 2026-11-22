---
title: "Informationen zu einer Dokumentenablage"
description: "Suchverfahren, Transkriptor und Arbeitsplatz einer Ablage prüfen."
lang: de
meta:
  app_urls: ["/app/documents/[documentRepositoryId]/info"]
  required_role: "Benutzer:in (user) oder höher im Arbeitsplatz der Ablage."
  role_scope: "Betroffener Arbeitsplatz"
  prerequisites: "Keine."
  status: "verfügbar"
  last_verified: "2026-11-22"
  source_files:
    [
      "apps/web/app/(main)/app/documents/[documentRepositoryId]/info/page.tsx",
      "apps/web/app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryInfo.tsx",
    ]
---

# Informationen zu einer Dokumentenablage

Öffne den Reiter **Info** innerhalb einer Ablage oder wähle **Infos** an ihrer Karte. Hier siehst du, wie die Ablage eingerichtet ist.

Unter der Ablagekarte öffnest du das Hauptverzeichnis oder änderst die Favoritenmarkierung. Wer den Arbeitsplatz administriert, kann die Ablage hier auch exportieren, einem XRAG-Paket hinzufügen, bearbeiten oder nach Bestätigung löschen.

Prüfe insbesondere:

- **Schlüsselwortsuche:** Ist das Verfahren aktiv?
- **Semantische Suche:** Ist sie aktiv und welches Embedding-Modell wird verwendet?
- **Transkriptor:** Ist ein Transkriptor für Audio- und Videodateien zugeordnet?
- **Arbeitsplatz:** Zu welchem Bereich gehört die Ablage?

Klappe die Informationsbereiche auf. Verweise wie **Zum Transkriptor** oder **Zum Arbeitsplatz** führen zur jeweiligen Ressource. Wird eine Zuordnung als unbekannt angezeigt, lass die Arbeitsplatzadministration das Modell beziehungsweise den Transkriptor und deine Zugriffsrechte prüfen.

Über **Dateien** gehst du zum Dateibestand zurück. Für Änderungen öffnest du mit ausreichenden Rechten **Bearbeiten** und die [Konfiguration der Ablage](edit.md).

## Zugehörige MCP-Werkzeuge

- `platform_repositories_list` liest die zugänglichen Konfigurationen ab der Stufe **Benutzer**. Mit `platform_favorites_update` änderst du auf derselben Stufe die Favoriten deines eigenen Kontos.
- `platform_repository_update` und `platform_repository_delete` ändern oder löschen die Konfiguration. Dafür brauchst du mindestens die Stufe **Workspace-Administrator** und Administratorrechte im betroffenen Arbeitsplatz.
- `platform_xrag_export` exportiert das Objekt, `platform_xrag_saved_package_add` fügt es deiner persönlichen Paketauswahl hinzu. Beide benötigen mindestens die Stufe **Workspace-Administrator** und Exportrechte für die ausgewählten Objekte.
