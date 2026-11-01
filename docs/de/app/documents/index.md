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
  last_verified: "2026-10-15"
  source_files:
    [
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
