---
title: "Dokumentenablagen"
description: "Gemeinsame Dateien als Wissensbasis organisieren und durchsuchen."
lang: de
meta:
  app_urls: ["/app/documents", "/app/documents/[documentRepositoryId]"]
  required_role: "Benutzer:in (user) oder höher zum Lesen; Bearbeiter:in (editor) für gemeinsame Dateien; Arbeitsplatzadministrator:in für die Konfiguration."
  role_scope: "Betroffener Arbeitsplatz"
  prerequisites: "Keine."
  status: "verfügbar"
  last_verified: "2026-11-21"
  source_files:
    [
      "apps/web/app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryInfo.tsx",
      "apps/web/app/(main)/app/documents/page.tsx",
      "apps/web/app/(main)/app/documents/[documentRepositoryId]/page.tsx",
      "apps/web/app/(main)/app/documents/[documentRepositoryId]/_components/TabsDocumentRepository.tsx",
    ]
---

# Dokumentenablagen

Eine **Dokumentenablage** sammelt Dateien eines Arbeitsplatzes. Sie kann von Menschen durchsucht und als Wissensquelle mit Agenten verbunden werden.

## Ablage finden und öffnen

1. Öffne **Apps → Dokumentenablagen**.
2. Suche nach Name, Beschreibung oder zugeordnetem Transkriptor.
3. Öffne die gewünschte Ablage. Ihre Einstiegsadresse führt automatisch in den Reiter **Dateien**.

Über die Aktionen an der Karte erreichst du **Infos**, **Als Favorit** und mit entsprechenden Rechten **Bearbeiten**. Unter **Optionen** kannst du die Liste als Kacheln oder Tabelle darstellen, nach Namen sortieren und beispielsweise nach Arbeitsplatz, Favoriten oder Transkriptor gruppieren.

## Die drei Bereiche einer Ablage

| Bereich                    | Zweck                                                             |
| -------------------------- | ----------------------------------------------------------------- |
| [Dateien](files.md)        | Dateien hochladen, Ordner öffnen und verarbeitete Inhalte ansehen |
| [Volltextsuche](search.md) | Text innerhalb der Dateien der gesamten Ablage finden             |
| [Info](info.md)            | Arbeitsplatz, Suchverfahren und Transkriptor prüfen               |

Der Reiter **Volltextsuche** ist verfügbar, wenn mindestens ein Suchindex aktiviert ist.

## Eine Wissensbasis aufbauen

Arbeitsplatzadministrator:innen legen die [Ablage und Suchfunktionen](new.md) an. Bearbeiter:innen laden geeignete Unterlagen hoch. Nach der Verarbeitung können diese durchsucht werden. Soll ein Agent damit arbeiten, muss die Ablage zusätzlich [in seiner Rolle verbunden](../../agent/edit/dokumentenablagen.md) werden.

Bei fehlenden Ablagen prüfe deine [Berechtigungen](../../me/permissions.md). Bei fehlenden Suchergebnissen prüfe zunächst, ob die Datei bereits lesbaren Inhalt enthält.

## Als XRAG exportieren

Workspace-Administrator:innen können das Objekt unter **Info → XRAG exportieren** einzeln herunterladen. Für einen gemeinsamen Download mit weiteren Ressourcen wählst du **Zu XRAG-Paket hinzufügen** und bestätigst die gewünschten verbundenen Objekte. Der Export enthält die Konfiguration und alle Dateien der Ablage. Unter **Bearbeiten → Einstellungen** kannst du den lesbaren globalen Identifier ändern. Er wird aus dem Titel in kebab-case erzeugt. Die globale ID bleibt bei Import und erneutem Export erhalten, sodass getrennt übertragene Objekte wieder verbunden werden können.

Unter [XRAG Import und Export](../../settings/xrag.md) findest du die Schritte zum Importieren, zur Bestätigung vorhandener Objekte und zum Erstellen oder Entpacken von Sammelarchiven.

## Zugehörige MCP-Werkzeuge

- `platform_xrag_export`: Ein Objekt mit `kind: "documentRepository"` exportieren, optional mit Modellarchiven. Mindeststufe: **Workspace-Administrator**; Administratorrechte im Workspace des Objekts. Downloadlink zehn Minuten gültig; Die Modelldateien müssen auf dem Core-Host lesbar sein oder als veröffentlichtes Archiv vorliegen.
- `platform_xrag_related_objects` und `platform_xrag_saved_package_add` ermitteln die verbundenen Ressourcen und übernehmen die gewählte Auswahl in ein eigenes Paket. Mindeststufe **Workspace-Administrator** mit Exportrechten für jedes ausgewählte Objekt.
- `platform_xrag_identity_get` / `platform_xrag_identity_set`: Globalen Identifier lesen bzw. initialisieren oder mit Prüfung der bisherigen ID ändern. Mindeststufe: **Workspace-Administrator**; Administratorrechte im betroffenen Workspace. Bereits exportierte Archive bleiben unverändert.

Import- und Sammelwerkzeuge sowie ihre Grenzen sind unter [XRAG](../../settings/xrag.md#zugehörige-mcp-werkzeuge) dokumentiert.
