---
title: "Eine Dokumentenablage erstellen"
description: "Arbeitsplatz, Suchverfahren und automatische Transkription für eine neue Ablage auswählen."
lang: de
meta:
  app_urls: ["/app/documents/new"]
  required_role: "Arbeitsplatzadministrator:in (workspace-admin) oder Administrator:in (admin)."
  role_scope: "Betroffener Arbeitsplatz"
  prerequisites: "Verwaltbarer Arbeitsplatz; optional Embedding-Modell und Transkriptor."
  status: "verfügbar"
  last_verified: "2026-10-15"
  source_files:
    [
      "apps/web/app/(main)/app/documents/new/page.tsx",
      "apps/web/app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryEditorFeatures.tsx",
    ]
---

# Eine Dokumentenablage erstellen

Eine neue Ablage braucht einen Namen und einen Arbeitsplatz. Suchverfahren und ein optionaler Transkriptor bestimmen, wie ihre Inhalte später genutzt werden können.

## Ablage anlegen

1. Öffne **Apps → Dokumentenablagen → Neue Dokumentenablage**.
2. Wähle unter **Einstellungen** den Arbeitsplatz und trage **Name** und **Beschreibung** ein.
3. Wähle bei Bedarf Farbe und Icon.
4. Öffne **Funktionen**. Die **Schlüsselwortsuche** ist bei einer neuen Ablage vorbereitet.
5. Aktiviere bei Bedarf **Semantische Suche** und wähle ein verfügbares **Embedding-Modell**.
6. Wähle einen **Transkriptor**, wenn hochgeladene Audio- und Videodateien automatisch verschriftlicht werden sollen.
7. Prüfe die Übersicht und wähle **Erstellen** beziehungsweise **Dokumentenablage erstellen**.
8. Öffne **Dateien**, lade eine Beispielunterlage hoch und prüfe nach der Verarbeitung die Vorschau und Suche.

![Einstellungen für Schlüsselwortsuche, semantische Suche und Embedding-Modell](../../assets/ablage-suchindex.png)

## Welche Suchfunktion passt?

**Schlüsselwortsuche** eignet sich für Namen, Bezeichnungen und konkrete Wörter. **Semantische Suche** sucht nach inhaltlicher Ähnlichkeit und benötigt ein Embedding-Modell. Du kannst beide Verfahren aktivieren; die [Volltextsuche](search.md) verwendet dann die eingeschalteten Verfahren.

Wenn kein passendes Modell oder kein Transkriptor auswählbar ist, muss die zuständige Administration diese Ressource zuerst bereitstellen.

Für die Nutzung durch einen Agenten richte anschließend eine [Verbindung in dessen Rolle](../../agent/edit/dokumentenablagen.md) ein.
