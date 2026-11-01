---
title: "Audio- und Videodateien transkribieren"
description: "Eine neue Transkriptionsaktivität starten und vorhandene Medien hochladen."
lang: de
meta:
  app_urls:
    [
      "/app/transcribe/[transcriberId]/[activityId]",
      "/app/transcribe/[transcriberId]/[activityId]/files/[[...path]]",
    ]
  required_role: "Benutzer:in (user) oder höher; Zugriff auf Transkriptor und Aktivität."
  role_scope: "Transkriptor und zugängliche Aktivität"
  prerequisites: "Verfügbarer Transkriptor mit Modell und eine unterstützte Audio- oder Videodatei."
  status: "verfügbar"
  last_verified: "2026-10-17"
  source_files:
    [
      "apps/web/app/(main)/app/transcribe/_components/TranscriberIconGroupActions.tsx",
      "apps/web/app/(main)/app/transcribe/[transcriberId]/[activityId]/files/_components/Folder.tsx",
      "packages/realtime/src/documents/storage/createStorageProcessingTask.ts",
      "packages/realtime/src/documents/storage/transferStorageFile.ts",
    ]
---

# Audio- und Videodateien transkribieren

Verwende diesen Ablauf für eine bereits vorhandene Aufnahme. Für eine neue Browseraufnahme siehe [Audio aufnehmen](aufnahme.md).

## Vom Upload zum Text

1. Öffne **Apps → Transkription** und wähle einen passenden Transkriptor.
2. Klicke auf **Neue Transkription**. Die App öffnet einen neuen Dateibereich mit eigener Aktivitätskennung.
3. Wähle **Datei hochladen** oder ziehe die Audio- beziehungsweise Videodateien in die Ansicht.
4. Warte auf das Ende von Upload und Verarbeitung.
5. Öffne eine verarbeitete Datei. Ihre Vorschau zeigt das Transkript mit Mediaplayer.
6. [Prüfe und korrigiere das Ergebnis](transkription.md), bevor du es weiterverwendest.

## Mehrere Dateien und Wiederfinden

Du kannst mehrere Medien in einer Aktivität sammeln. Mit Ordnern und Ansichtsoptionen organisierst du sie wie in der [allgemeinen Dateiansicht](../documents/files.md). Über den [Verlauf](../../activity/index.md) kannst du die Transkription später wieder öffnen.

Die gemeinsamen Dateiaktionen erlauben außerdem neue Textdateien, Umbenennen, Einzeldatei-Löschen und den getrennten Download von Original und verarbeitetem Text. **Erneut verarbeiten** startet die Transkription nach Bestätigung neu und ersetzt vorhandene manuelle Textkorrekturen; solange eine Verarbeitung läuft, werden keine weiteren parallelen Verarbeitungen derselben Datei gestartet.

Über **Kopieren** oder **Verschieben** im Aktionsmenü einer Datei überträgst du sie in eine Dokumentenablage mit eigenen Schreibrechten. Wähle einen vorhandenen Zielordner. Original und Transkript einschließlich manueller Korrekturen werden übernommen; der Suchindex wird aus diesem Text aufgebaut, ohne das Medium erneut zu transkribieren. Beim Verschieben wird die Quelle nach erfolgreicher Übertragung entfernt. Bestehende Zieldateien werden nicht überschrieben. Weitere Einzelheiten und mögliche Teilfehler beschreibt die [Dateiverwaltung](../documents/files.md#kopieren-und-verschieben).

Unter **Info** findest du das verwendete Transkriptionsmodell und den Prompt mit Fachbegriffen.

## Wenn kein Transkript erscheint

Prüfe den Verarbeitungsstatus und ob ein Transkriptionsmodell verfügbar ist. Bei einer großen Datei oder ausgelasteten Instanz kann die Verarbeitung länger dauern. Wenn Text vorhanden ist, der Browser die Aufnahme aber nicht abspielen kann, lade über **Original herunterladen** die Datei herunter und öffne sie in einem passenden Mediaplayer.

Bei einem dauerhaften Fehler notiere Dateityp, ungefähre Länge und die Meldung für die Administration.

Verwende für eine Zusammenfassung des fertigen Textes anschließend einen geeigneten Agenten. Der Transkriptor selbst dient der Verschriftlichung.
