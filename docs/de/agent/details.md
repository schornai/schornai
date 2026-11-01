---
title: "Fähigkeiten eines Agenten ansehen"
description: "Informationen zu Prompt, Rollen, Modell, Datenquellen und Dokumentation lesen."
lang: de
meta:
  app_urls: ["/agent/[agentId]"]
  required_role: "Benutzer:in (user) oder höher im Arbeitsplatz des Agenten."
  role_scope: "Betroffener Arbeitsplatz"
  prerequisites: "Für einen neuen Chat: ein verfügbares Sprachmodell in der Agentenkonfiguration."
  status: "verfügbar"
  last_verified: "2026-10-15"
  source_files:
    [
      "apps/web/app/(main)/agent/[agentId]/page.tsx",
      "apps/web/app/(main)/agent/_components/AgentInfo.tsx",
      "apps/web/app/(main)/agent/_components/AgentRecommendedMessage.tsx",
    ]
---

# Fähigkeiten eines Agenten ansehen

Über **Infos** öffnest du die Übersicht eines Agenten. Sie hilft dir zu beurteilen, ob der Agent für deine Aufgabe geeignet ist und auf welche Daten er zugreifen kann.

## Was die Übersicht erklärt

- **Prompt:** die Anweisungen, nach denen der Agent arbeitet.
- **Rollen:** seine Teilaufgaben und gegebenenfalls abweichende Modelle oder Werkzeuge.
- **Dokumentenablagen:** eingebundene Wissensquellen und deren Lese- beziehungsweise Schreibmodus.
- **Externe Werkzeuge (MCP)** und **Web-Zugriff:** angebundene Dienste und aktivierte Internetfunktionen.
- **Modell:** das verwendete KI-Modell, gegebenenfalls Kontextgröße und Bildfähigkeiten.
- **Dokumentation** und **Vorschläge:** Hinweise und Beispielnachrichten für die Benutzung.
- **Arbeitsplatz:** der organisatorische Bereich, zu dem der Agent gehört.

Klappe die Informationsbereiche auf, um die eingerichteten Verbindungen zu sehen. Wird eine Ablage als unbekannt angezeigt, lass die Arbeitsplatzadministration die Zuordnung und deine Leserechte an dieser Ablage prüfen.

## Mit einem Beispiel beginnen

Lies eine vorgeschlagene Nachricht und verwende ihren Text als Ausgangspunkt. Im dokumentierten Stand kann der direkte Klick auf eine Vorschlagskarte auf eine nicht vorhandene Chatadresse führen. Öffne in diesem Fall **Neuer Chat** am Agenten und übernimm den Vorschlag manuell in das Eingabefeld.

## Informationen im laufenden Chat

Der Reiter [Info](chat/info.md) bietet die Agenteninformationen auch innerhalb eines Gesprächs. Nach einer Änderung am Agenten zeigt auch dieser Reiter die neuen Einstellungen; frühere Konfigurationen lassen sich hier nicht abrufen.

Zum Ändern der Konfiguration brauchst du die Rolle Arbeitsplatzadministrator:in oder globale Administratorrechte. Details findest du unter [Agent bearbeiten](edit/index.md).
