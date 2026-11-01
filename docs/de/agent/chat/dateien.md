---
title: "Dateien und Aufnahmen im Chat"
description: "Unterlagen an Nachrichten anhängen und Gesprächsdateien wiederfinden."
lang: de
meta:
  app_urls:
    [
      "/agent/[agentId]/[activityId]",
      "/agent/[agentId]/[activityId]/files/[[...path]]",
    ]
  required_role: "Benutzer:in (user) oder höher; Zugriff auf das Gespräch. Für gemeinsame Ablagen gelten deren zusätzliche Rechte."
  role_scope: "Gespräch beziehungsweise Zielablage"
  prerequisites: "Für Audio- und Videoinhalte: ein in der Agentenrolle zugeordneter Transkriptor."
  status: "verfügbar"
  last_verified: "2026-10-17"
  source_files:
    [
      "apps/web/app/(main)/agent/[agentId]/[activityId]/files/_components/Folder.tsx",
      "apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatComposeMessageContext.tsx",
      "packages/realtime/src/documents/storage/createStorageProcessingTask.ts",
      "apps/web/app/_actions/storageSelectChatFile.ts",
      "packages/database/src/storage/_utils/storageToAgentPath.ts",
      "apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartToolStorageTransferFile.tsx",
    ]
---

# Dateien und Aufnahmen im Chat

Du kannst Unterlagen an eine Nachricht anhängen, damit der Agent sie bei der Bearbeitung berücksichtigt. Die Dateien eines Gesprächs findest du außerdem im Reiter **Dateien**.

## Eine Datei an die Nachricht anhängen

1. Öffne das Büroklammermenü **Dateien anhängen** und wähle **Dateien hochladen**.
2. Wähle eine oder mehrere Dateien aus.
3. Kontrolliere die angezeigten Anhänge und warte auf das Ende der Verarbeitung.
4. Formuliere die Aufgabe zu diesen Dateien und wähle **Senden**.

Solange **Dateien werden hochgeladen oder verarbeitet …** angezeigt wird, ist das Senden blockiert. Die App extrahiert dabei den Text aus Dokumenten beziehungsweise transkribiert Audio und Video.

## Eine vorhandene Datei auswählen

Wähle im Büroklammermenü **Vorhandene Datei auswählen**. Der Dialog zeigt die Dateien des bestehenden Gesprächs und zugängliche Dokumentenablagen. Wähle eine Ablage, öffne bei Bedarf einen Ordner und bestätige eine einzelne Datei. PDF-, Office-, Audio- und Videodateien müssen bereits erfolgreich verarbeitet sein.

Ist eine Ablagedatei in allen Rollen des Agenten über denselben eindeutigen Pfad erreichbar, wird sie direkt referenziert. Der Agent erhält den tatsächlich eingebundenen Pfad; es entsteht keine zusätzliche Datei. Fehlt eine solche gemeinsame Verbindung, wird eine Kopie mit eindeutigem Namen in den Gesprächsdateien angelegt. Die Quelldatei bleibt unverändert. Dateien dieses Gesprächs können unmittelbar ausgewählt werden.

Eine Referenz verwendet den aktuellen Inhalt der Quelldatei. Die Zugriffsrechte und Agentenverbindungen werden beim Verarbeiten der Nachricht erneut geprüft. Nach geänderten Verbindungen oder entzogenen Rechten kann der Anhang als nicht verfügbar gemeldet werden; wähle ihn dann erneut aus. Eine zuvor angelegte Gesprächskopie ist dagegen unabhängig von späteren Änderungen des Originals.

## Gesprächsdateien öffnen

Der Reiter **Dateien** zeigt Ordner, hochgeladene Unterlagen und gegebenenfalls vom Agenten gespeicherte Dateien. Die Bedienung entspricht der [Dateiansicht](../../app/documents/files.md): Suche im Ordner, Brotkrumennavigation und Ansichtsoptionen.

Dort kannst du auch UTF-8-Textdateien anlegen und einzelne Dateien umbenennen, nach Bestätigung löschen, herunterladen, in eine beschreibbare Dokumentenablage kopieren oder verschieben und erneut verarbeiten. Diese Änderungen gelten für den gemeinsamen Dateibestand dieser Aktivität. Die erneute Verarbeitung eines Transkripts ersetzt manuelle Textkorrekturen.

Hänge eine über den Reiter **Dateien** hochgeladene Datei anschließend über **Vorhandene Datei auswählen** an die gewünschte Nachricht an oder nenne ihren Pfad in der Aufgabe.

## Bilder und Medien

Für Fragen zu Bildinhalten braucht der Agent ein Modell mit Bildunterstützung. Prüfe diese Eigenschaft unter **Info → Modell**; die Arbeitsplatzadministration kann ein anderes Modell zuweisen.

Ist dem Agenten ein Transkriptor zugeordnet, werden Audio- und Videodateien automatisch transkribiert. Dann steht auch das Mikrofon für eine [direkte Aufnahme](../../app/transcribe/aufnahme.md) zur Verfügung.

## Unterschied zur Dokumentenablage

Gesprächsdateien gehören zum jeweiligen Chat. Eine über die Agentenrolle eingebundene Dokumentenablage ist eine separate, gemeinsame Wissensquelle. Schreibaktionen in dieser Ablage können auch für andere Personen sichtbar werden; prüfe entsprechende [Freigaben](freigaben.md).

Kopieren und Verschieben erscheinen im Chat als einklappbare Werkzeugzeilen mit Quelle, Ziel und Status. Klicke auf die Zeile, um Details und nach erfolgreicher Übertragung den Link zur Zieldatei zu öffnen. Die Werkzeugzeile zeigt auch ausstehende Freigaben und abgelehnte Übertragungen. Ein Fehler beim anschließenden Indexieren wird getrennt vom erfolgreichen Transfer angezeigt.

Beim Kopieren oder Verschieben durch den Agenten muss der Zielpfad den Dateinamen enthalten, zum Beispiel `/default/berichte/2026/hello.md`. Fehlende Zielordner werden automatisch angelegt, auch über mehrere Ebenen. Bestehende Dateien werden nicht überschrieben; belegt eine Datei einen benötigten Ordnerpfad, schlägt der Transfer fehl.
