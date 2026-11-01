---
title: "Einen Agenten erstellen"
description: "Einen neuen Agenten mit Arbeitsplatz, Modell und verständlichen Anweisungen einrichten."
lang: de
meta:
  app_urls: ["/agent/new"]
  required_role: "Arbeitsplatzadministrator:in (workspace-admin) oder Administrator:in (admin)."
  role_scope: "Betroffener Arbeitsplatz"
  prerequisites: "Verwaltbarer Arbeitsplatz und verfügbares Sprachmodell."
  status: "verfügbar"
  last_verified: "2026-10-15"
  source_files:
    [
      "apps/web/app/(main)/agent/new/page.tsx",
      "apps/web/app/(main)/agent/_components/AgentEditor.tsx",
      "apps/web/app/(main)/agent/_components/AgentEditorSettingsWorkspace.tsx",
    ]
---

# Einen Agenten erstellen

Du benötigst einen Arbeitsplatz, in dem du Agenten verwalten darfst, und ein verfügbares Sprachmodell. Beginne mit einer klar abgegrenzten Aufgabe; Werkzeuge und zusätzliche Rollen kannst du anschließend ergänzen.

## Schritt für Schritt

1. Öffne **Agenten → Neuer Agent**.
2. Wähle unter **Einstellungen** den **Arbeitsplatz** und ein **Modell**.
3. Vergib einen eindeutigen **Namen** und eine kurze **Beschreibung**. Wähle bei Bedarf Farbe und Icon.
4. Öffne **Rollen**. Eine erste Rolle ist vorbereitet. Formuliere ihren **Prompt** und bei mehreren Rollen einen verständlichen Namen und einen Hinweis für die Rollenauswahl.
5. Ergänze nur die benötigten [Datenquellen und Werkzeuge](edit/rollen.md).
6. Hinterlege unter **Unterstützung** eine kurze Anleitung und Beispielnachrichten.
7. Prüfe die **Übersicht** und wähle **Erstellen** beziehungsweise **Agent erstellen**.
8. Öffne am gespeicherten Agenten **Neuer Chat** und probiere typische Fragen aus.

## Beispiel für einen ersten Prompt

```text
Du unterstützt unser Team beim Zusammenfassen von Besprechungsnotizen.
Antworte auf Deutsch. Gliedere deine Antwort in Entscheidungen,
offene Fragen und nächste Schritte. Verwende nur die bereitgestellten
Informationen. Nenne fehlende Angaben ausdrücklich und erfinde keine
Verantwortlichen oder Termine.
```

Für Antworten aus einer Dokumentenablage [binde diese in der Rolle ein](edit/dokumentenablagen.md). Nenne im Prompt den dort gewählten Agentenpfad, zum Beispiel `/wissen`.

## Ergebnis und typische Probleme

Nach dem Erstellen öffnet sich die Agentenübersicht. Der Agent gehört zum gewählten Arbeitsplatz und kann von dessen berechtigten Benutzer:innen verwendet werden.

Ist kein Arbeitsplatz auswählbar, fehlt dir die erforderliche Verwaltungsrolle. Fehlt ein Modell, muss die Administration ein passendes bereitstellen. Behalte mindestens eine Rolle mit einem Prompt für die Aufgabe des Agenten.

Weiter: [Editor und Speichern](edit/index.md) · [Modelle und zusätzliche Funktionen](edit/einstellungen.md)
