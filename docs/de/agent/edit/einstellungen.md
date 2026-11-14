---
title: "Modelle und allgemeine Agenteneinstellungen"
description: "Name, Arbeitsplatz, Aussehen, Nachdenken und Transkriptor festlegen."
lang: de
meta:
  app_urls: ["/agent/[agentId]/edit?view=settings"]
  required_role: "Arbeitsplatzadministrator:in (workspace-admin) oder Administrator:in (admin)."
  role_scope: "Betroffener Arbeitsplatz"
  prerequisites: "Für Modellwechsel: ein bereitgestelltes Sprachmodell."
  status: "verfügbar"
  last_verified: "2026-11-12"
  source_files:
    [
      "apps/web/app/(main)/agent/_components/AgentEditorSettings.tsx",
      "apps/web/app/(main)/agent/_components/AgentEditorSettingsModel.tsx",
      "apps/web/app/(main)/agent/_components/AgentEditorSettingsAdditionalFunctions.tsx",
      "apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatComposeMessageSelected.tsx",
      "apps/realtime/src/chat/worker.ts",
    ]
---

# Modelle und allgemeine Agenteneinstellungen

Im Reiter **Einstellungen** legst du die gemeinsamen Eigenschaften des Agenten fest. Speichere Änderungen anschließend mit **Agent speichern**.

## Name, Beschreibung und Arbeitsplatz

Wähle einen Namen, der die Aufgabe erkennen lässt, und eine kurze Beschreibung. Farbe und Icon helfen bei der Wiedererkennung. Der Arbeitsplatz bestimmt, für welchen Personenkreis der Agent verfügbar ist. In der Auswahl stehen Arbeitsplätze, in denen du die benötigten Verwaltungsrechte hast.

## Standardmodell und Nachdenken

Das gewählte Modell wird verwendet, solange eine Agentenrolle es nicht überschreibt. Verfügbar sind lokale Sprachmodelle und die von Administrator:innen unter [Modelle](../../settings/models.md) hinzugefügten externen Sprachmodelle. Externe Modelle übertragen Gesprächsinhalte an den konfigurierten Anbieter. Fehlt das gewünschte Modell, bitte die globale Administration, es unter **Modelle** einzurichten beziehungsweise über [XRAG](../../settings/xrag.md) bereitzustellen.

![Modellauswahl mit Einstellung für Nachdenken](../../assets/agent-modell.png)

| Einstellung                        | Bedeutung                                                           |
| ---------------------------------- | ------------------------------------------------------------------- |
| **Nachdenken**                     | Standardmäßig eingeschaltet; die Nachricht kann die Auswahl ändern. |
| **Nicht nachdenken**               | Standardmäßig ausgeschaltet; die Nachricht kann die Auswahl ändern. |
| **Verpflichtend Nachdenken**       | Die Konfiguration erzwingt Nachdenken für das verwendete Modell.    |
| **Verpflichtend nicht Nachdenken** | Die Konfiguration schaltet Nachdenken verbindlich aus.              |

Eine abweichende Einstellung der gewählten Agentenrolle hat Vorrang vor der allgemeinen Einstellung. Bei einer verpflichtenden Vorgabe kannst du die Einstellung für einzelne Nachrichten nicht umschalten.

## Zusätzliche Funktionen

**Dateien hochladen** steuert die Dateianhänge und Drag-and-drop in der Chat-Eingabe. **Stapelverarbeitung** steuert den Stapel-Button und das gemeinsame Starten mehrerer Entwürfe. Bereits vorhandene Anhänge und Entwürfe bleiben erhalten.

Für **Selbstlöschende Chats** stehen drei Einstellungen zur Wahl:

- **Nicht verfügbar:** Neue Chats bieten keinen Schalter zum Einschalten.
- **Standardmäßig aus:** Im Chat kann die Funktion eingeschaltet werden.
- **Standardmäßig an:** Neue Chats erhalten beim Anlegen eine Löschfrist von 12 Stunden. Benutzer:innen können sie im Chat ausschalten.

Die Voreinstellung verändert bestehende Chats nicht. Ein bereits aktiver Timer lässt sich auch nach dem Deaktivieren der Agentenfunktion ausschalten. Jeder neue Einschaltvorgang startet eine feste Frist von 12 Stunden; neue Nachrichten verlängern sie nicht.

Ein zugeordneter **Transcriber** ermöglicht die Verarbeitung von Audio- und Videodateien und die Aufnahmefunktion im Chat. **Ziel verfolgen** und **Nachtschicht** sind derzeit nicht verfügbar.

Weiter: [Chat bedienen](../chat/index.md) · [Transkriptor konfigurieren](../../app/transcribe/edit.md)

## Zugehörige MCP-Werkzeuge

`platform_agent_get` liest die Konfiguration ab Stufe **Benutzer** mit Zugriff auf den Agenten. `platform_agent_update` speichert die Zusatzfunktionen ab Stufe **Arbeitsplatzadministrator** mit Verwaltungsrechten im betroffenen Arbeitsplatz. `additionalFunctions.fileUpload` und `batch` sind boolesch; `disappearingChats` verwendet `false` (nicht verfügbar), `true` (standardmäßig aus) oder `"default-on"` (standardmäßig an). `platform_chat_expiration_set` schaltet die Frist für tatsächliche Chat-Teilnehmer:innen ab Stufe **Benutzer** mit `seconds: 43200` ein und mit `null` aus; Einschalten erfordert die aktivierte Agentenfunktion. Die Browserdarstellung der Stapelverwaltung ist kein eigenes MCP-Werkzeug; `platform_chat_send` sendet einzelne Nachrichten.
