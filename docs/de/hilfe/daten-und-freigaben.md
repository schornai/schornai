---
title: "Daten, Speicherorte und Freigaben"
description: "Gemeinsame Ablagen, Gesprächsdateien, externe Zugriffe und Löschaktionen unterscheiden."
lang: de
meta:
  app_urls: []
  required_role: "Je nach Aktion; siehe Rollenangabe der jeweiligen Anleitung."
  role_scope: "Jeweiliger Speicherort und verwendeter Dienst"
  prerequisites: "Keine."
  status: "verfügbar"
  last_verified: "2026-10-15"
  source_files:
    [
      "apps/web/app/(main)/_actions/deleteActivity.ts",
      "apps/realtime/src/chat/tools/web/webFetch.ts",
      "apps/realtime/src/chat/tools/web/webSearch.ts",
      "apps/web/app/_components/transcription/StorageFilePreviewTranscription.tsx",
    ]
---

# Daten, Speicherorte und Freigaben

Bevor du Unterlagen hochlädst oder eine Werkzeugaktion bestätigst, prüfe den betroffenen Speicherort und die Aufgabe. Die Oberfläche verbindet mehrere Bereiche, die unterschiedliche Zugriffsrechte haben.

## Wo Inhalte verwendet werden

| Bereich                                   | Einordnung                                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Dateien eines Chats**                   | Dem jeweiligen Gespräch zugeordnet; können als Nachrichtenanhang oder über Werkzeuge genutzt werden.          |
| **Dateien einer Transkriptionsaktivität** | Medien und Ergebnisse des betreffenden Vorgangs.                                                              |
| **Dokumentenablage**                      | Gemeinsame Wissensquelle eines Arbeitsplatzes; Änderungen können andere Benutzer:innen und Agenten betreffen. |
| **Agentenkonfiguration**                  | Prompts, Modelle und Verbindungen; kann Zugangsdaten für externe Dienste enthalten.                           |
| **Feedbacktext**                          | Die bewusst zusammengestellte Rückmeldung einschließlich ausgewählter Fehlermeldungen.                        |

Eine Arbeitsplatzrolle gibt Zugriff auf die gemeinsamen Ressourcen des Arbeitsplatzes. Gespräche und Transkriptionsaktivitäten sind zusätzlich auf die jeweils berechtigten Personen beschränkt.

## Externe Dienste

**Web Search** übermittelt Suchbegriffe an den gewählten Suchanbieter. **Web Fetch** ruft die angegebene Website auf. **MCP** übermittelt Werkzeugaufrufe an den angebundenen Dienst. Bei einem externen Sprachmodell werden Gesprächsinhalte und gegebenenfalls Anhänge an dessen Anbieter gesendet. Prüfe vor dem Hochladen vertraulicher Unterlagen unter **Agent → Info** das Modell und die angebundenen Werkzeuge; frage die Administration, ob diese Dienste für die Unterlagen freigegeben sind.

Eine Werkzeugfreigabe betrifft die angezeigte Aktion. Prüfe bei Schreibvorgängen Pfad und Inhalt, bei Webaktionen URL oder Suchanfrage. **Abbrechen** stoppt eine Generierung, macht bereits ausgeführte externe oder gespeicherte Aktionen jedoch nicht rückgängig.

## Löschen richtig einordnen

- **Favorit entfernen** und **Lösen** entfernen nur persönliche Markierungen.
- **Löschen im Verlauf** entfernt den Aktivitätseintrag. Gesprächs- und Dateidaten bleiben gespeichert; laufende Verarbeitung wird fortgesetzt.
- **Datei löschen** entfernt die gewählte Datei einschließlich verarbeitetem Inhalt und Suchindexeinträgen.
- **Ordner löschen** entfernt den gewählten Ordner einschließlich seiner Inhalte nach Bestätigung. Lade benötigte Dateien vorher herunter.
- Entferne vor dem Löschen einer Ablage oder eines Transkriptors deren Verbindungen aus Agenten und anderen Ablagen, die sie verwenden.

Für die Löschung gespeicherter Gesprächsdaten, verbliebener Storage-Objekte und Backups wende dich an die Betriebsadministration. Nenne die betroffene Aktivität oder Ablage und den gewünschten Umfang der Löschung. Eine automatische Löschfrist für Chats ist nicht einstellbar.

## Ergebnisse prüfen

Öffne bei einer KI-Antwort die genannten Quellen und vergleiche insbesondere Zahlen, Namen und Termine mit dem Original. Höre diese Stellen in einem Transkript nach, korrigiere den Abschnitt und wähle anschließend **Speichern & als geprüft markieren**.

Weiter: [Rollen](../me/permissions.md) · [Werkzeugfreigaben](../agent/chat/freigaben.md) · [Feedback prüfen](../feedback/index.md)
