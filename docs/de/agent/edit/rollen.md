---
title: "Agentenrollen und Prompts"
description: "Teilaufgaben, automatische Rollenauswahl und Werkzeuge eines Agenten konfigurieren."
lang: de
meta:
  app_urls: ["/agent/[agentId]/edit?view=roles", "/agent/new?view=roles"]
  required_role: "Arbeitsplatzadministrator:in (workspace-admin) oder Administrator:in (admin)."
  role_scope: "Betroffener Arbeitsplatz"
  prerequisites: "Eine Aufgabenbeschreibung und bei abweichender Modellauswahl ein verfügbares Sprachmodell."
  status: "verfügbar"
  last_verified: "2026-10-24"
  source_files:
    [
      "apps/web/app/(main)/agent/_components/AgentEditorRole.tsx",
      "apps/web/app/(main)/agent/_components/AgentEditorRoleSettings.tsx",
      "apps/web/app/(main)/agent/_components/AgentEditorRoleTools.tsx",
      "apps/realtime/src/chat/selectRole.ts",
    ]
---

# Agentenrollen und Prompts

Eine **Agentenrolle** definiert das Verhalten der KI für einen bestimmten Aufgabentyp. Sie ist unabhängig von der Arbeitsplatzrolle einer Person. Ein Agent kann eine oder mehrere Rollen besitzen.

![Rollenbereich im Agenteneditor](../../assets/agent-rollen.png)

## Eine Rolle einrichten

1. Öffne im Agenteneditor **Rollen**.
2. Verwende eine vorhandene Rolle oder wähle **Rolle hinzufügen**.
3. Formuliere im Reiter **Prompt** Aufgabe, Antwortformat, Datenbasis und Grenzen.
4. Unter den Einstellungen der Rolle vergibst du einen **Namen** und einen **Hinweis für die Rollenauswahl**.
5. Ergänze unter **Werkzeuge** die benötigten Verbindungen.
6. Speichere den gesamten Agenten.

Bei mehreren Rollen wählt der Agent für eine neue Nachricht eine passende Rolle. Der Hinweis für die Rollenauswahl erklärt, wann diese Rolle zuständig ist. Beispiel: „Für Fragen nach internen Abläufen und Zuständigkeiten; nutze die Wissensablage.“ Der eigentliche Prompt erklärt anschließend, wie die Rolle antworten soll.

## Modelle pro Rolle

Unter **Modell überschreiben** kannst du ein anderes Modell als das Standardmodell des Agenten auswählen. **Nicht überschreiben** übernimmt die allgemeine Einstellung. Auch die Nachdenken-Einstellung lässt sich pro Rolle abweichend setzen.

## Verfügbare Werkzeuge

- [Dokumentenablage anbinden](dokumentenablagen.md): Wissen lesen, suchen und je Freigabemodus schreiben.
- [Internet-Zugriff](web.md): Webseiten abrufen oder über einen Suchanbieter suchen.
- [Externes Werkzeug (MCP) anbinden](mcp.md): Funktionen eines eingerichteten externen Dienstes bereitstellen.

**Chat Erweiterung**, **Taschenrechner** und **schorn.ai Plattform Zugang** sind im aktuellen Werkzeug-Auswahlbereich deaktiviert. Für diese noch nicht verfügbaren Werkzeuge erscheinen keine Rollen-Tabs, auch wenn ältere Konfigurationen entsprechende Einträge enthalten.

## Rolle entfernen

Öffne die Einstellungen der Rolle, wähle **Rolle löschen** und bestätige. Speichere anschließend den Agenten. Entferne nicht alle Rollen: Ohne eine verwendbare Rolle kann der Agent keine Aufgabe bearbeiten.

Eine gute Kontrolle ist ein neuer Chat mit einer passenden und einer unpassenden Anfrage. So erkennst du, ob Rollenauswahl und Prompt die gewünschte Abgrenzung vermitteln.
