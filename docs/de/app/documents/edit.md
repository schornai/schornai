---
title: "Eine Dokumentenablage konfigurieren"
description: "Suchindex, Transkriptor und allgemeine Einstellungen einer Ablage ändern."
lang: de
meta:
  app_urls: ["/app/documents/[documentRepositoryId]/edit"]
  required_role: "Arbeitsplatzadministrator:in (workspace-admin) oder Administrator:in (admin)."
  role_scope: "Betroffener Arbeitsplatz"
  prerequisites: "Für semantische Suche: ein Embedding-Modell; für Audio und Video: ein Transkriptor."
  status: "verfügbar"
  last_verified: "2026-10-18"
  source_files:
    [
      "apps/web/app/_actions/storageQueueProcessFiles.ts",
      "apps/web/app/(main)/app/documents/_actions/updateDocumentRepository.ts",
      "apps/web/app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryEditor.tsx",
      "apps/web/app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryEditorFeaturesIndex.tsx",
      "apps/web/app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryEditorFeaturesTranscriber.tsx",
    ]
---

# Eine Dokumentenablage konfigurieren

Öffne **Bearbeiten** an einer Dokumentenablage. Der Editor gliedert sich in **Übersicht**, **Funktionen** und **Einstellungen**. Änderungen übernimmst du mit **Speichern** beziehungsweise **Dokumentenablage speichern**.

## Funktionen ändern

Unter **Suchindex** schaltest du Schlüsselwortsuche und semantische Suche unabhängig ein oder aus. Für die semantische Suche wählst du zusätzlich ein verfügbares Embedding-Modell. Werden beide Verfahren deaktiviert, ist die Ablage weiterhin ein Dateibereich, bietet aber keinen aktivierten Volltextsuch-Reiter.

Unter **Transkriptor** wählst du die Konfiguration für neue Audio- und Videodateien. Ein zugeordneter Transkriptor ermöglicht außerdem die direkte [Aufnahme](../transcribe/aufnahme.md).

Nach einem Modell- oder Transkriptorwechsel öffne eine vorhandene Datei und prüfe Textvorschau und Suchergebnisse. Um eine Datei mit der neuen Konfiguration zu verarbeiten, wähle in ihrem Aktionsmenü **Erneut verarbeiten**. Lade manuelle Textkorrekturen vorher herunter: Die erneute Verarbeitung ersetzt sie. Für die gesamte Ablage gibt es keinen gemeinsamen Neuverarbeitungsbefehl.

## Allgemeine Einstellungen

Unter **Einstellungen** änderst du Name, Beschreibung, Icon, Farbe und Arbeitsplatz. Ein Arbeitsplatzwechsel verändert den Zugangskontext. Prüfe deshalb bestehende Agentenverbindungen und die Berechtigungen des Zielarbeitsplatzes.

Rücksetzsymbole verwerfen einzelne Änderungen. **Änderungen verwerfen** setzt nach Bestätigung alle noch nicht gespeicherten Editoränderungen zurück.

## Kopieren und löschen

**Als neue Dokumentenablage speichern** kopiert die Konfiguration in eine leere Ablage. Übertrage die benötigten Dateien anschließend mit [Kopieren](files.md#kopieren-und-verschieben) oder lade sie in die neue Ablage hoch.

**Dokumentenablage löschen** entfernt die Ressource nach Bestätigung und kann in der Oberfläche nicht rückgängig gemacht werden. Lade benötigte Dateien vorher herunter und entferne die Verbindung aus betroffenen Agentenrollen. Für die Bereinigung verbliebener Storage-Objekte und Backups ist die Betriebsadministration zuständig.
