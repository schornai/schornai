---
title: "Aufgabenstapel beobachten"
description: "Hintergrundaufgaben und ihre Verarbeitungszustände einordnen."
lang: de
meta:
  app_urls: ["/tasks"]
  required_role: "Administrator:in (admin), global."
  role_scope: "Gesamte Instanz"
  prerequisites: "Laufender Realtime-Server für aktuelle Warteschlangenstände."
  status: "verfügbar"
  last_verified: "2026-10-25"
  source_files:
    [
      "apps/web/app/(settings)/_components/Sidebar.tsx",
      "apps/web/app/(settings)/tasks/_components/TaskTable.tsx",
      "packages/realtime/src/documents/taskQueue/_types.ts",
      "packages/database/src/realtime/getRealtimeDocumentPermission.ts",
    ]
---

# Aufgabenstapel beobachten

Der **Aufgabenstapel** zeigt Hintergrundarbeit der Instanz. Er ist eine technische Statusansicht für Administrator:innen und unterscheidet sich vom persönlichen [Verlauf](../activity/index.md).

![Aufgabenstapel mit den Spalten Typ und Status; Beispiel ohne aktive Aufgaben](../assets/aufgaben.png)

Öffne **Cluster → Aufgabenstapel** in der Verwaltungsnavigation. Die Tabelle aktualisiert sich über die laufende Verbindung. Wenn keine Aufgaben vorliegen, erscheint **Keine aktiven Aufgaben gefunden**.

Diese Ansicht ist nur lesbar. Starte Chat-Anfragen, Dateiverarbeitung oder Transkriptionen in den jeweiligen App-Bereichen.

## Typen einordnen

| Typ                                    | Bedeutung                                            |
| -------------------------------------- | ---------------------------------------------------- |
| `chat`                                 | Bearbeitung eines Gesprächsschritts                  |
| `agent-select-role`                    | Auswahl einer passenden Agentenrolle                 |
| `model-do-generate`, `model-do-stream` | Modellausgabe, gegebenenfalls fortlaufend übertragen |
| `model-do-embed`                       | Berechnung für semantische Verarbeitung              |
| `process-file`                         | Verarbeitung einer Datei zu lesbarem Inhalt          |
| `transcribe`                           | Verschriftlichung von Audio oder Video               |

## Zustände einordnen

| Status     | Bedeutung                                          |
| ---------- | -------------------------------------------------- |
| `pending`  | Wartet auf Übernahme                               |
| `claimed`  | Wurde von einer Verarbeitungskomponente übernommen |
| `finished` | Abgeschlossen                                      |
| `aborting` | Abbruch wurde angefordert                          |
| `aborted`  | Abgebrochen                                        |
| `error`    | Fehler bei der Verarbeitung                        |

Aufgaben lassen sich hier nicht löschen, neu starten oder priorisieren. Einen Chat brichst du im Gespräch ab; eine Datei startest du über ihr Aktionsmenü mit **Erneut verarbeiten** neu.

Bleibt eine Aufgabe auf `pending`, prüfe die benötigten Dienste: Realtime und Modellserver für Chats, Tika für Dokumentextraktion, Mac-Transcriber und Whisper-Modell für Audio/Video. Bei `error` öffne den betroffenen Chat oder die Datei und lies die Fehlermeldung. Notiere Typ, Status, Zeitpunkt und Ressourcenadresse und suche damit in den [Box-Admin-Protokollen](../box-admin/index.md).
