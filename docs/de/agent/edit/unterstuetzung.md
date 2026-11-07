---
title: "Anleitungen und Nachrichtenvorschläge für einen Agenten"
description: "Eine verständliche Agentendokumentation und wiederverwendbare Einstiegsfragen hinterlegen."
lang: de
meta:
  app_urls: ["/agent/[agentId]/edit?view=docs"]
  required_role: "Arbeitsplatzadministrator:in (workspace-admin) oder Administrator:in (admin)."
  role_scope: "Betroffener Arbeitsplatz"
  prerequisites: "Hinweise zu Aufgaben, geeigneten Quellen und Kontaktpersonen für den Agenten."
  status: "verfügbar"
  last_verified: "2026-10-15"
  source_files:
    [
      "apps/web/app/(main)/agent/_components/AgentEditorDocs.tsx",
      "apps/web/app/(main)/agent/_components/AgentEditorDocsRecommendedMessage.tsx",
      "apps/web/app/(main)/agent/_components/AgentRecommendedMessage.tsx",
    ]
---

# Anleitungen und Nachrichtenvorschläge für einen Agenten

Im Reiter **Unterstützung** erklärst du anderen Personen, wofür ein Agent gedacht ist und wie sie ihn sinnvoll verwenden. Diese Inhalte sind Anwenderhinweise. Die Arbeitsanweisungen für das Modell gehören in den [Prompt der Rolle](rollen.md).

![Unterstützungsbereich mit Nachrichtenvorschlägen und Markdown-Dokumentation](../../assets/agent-unterstuetzung.png)

## Dokumentation schreiben

1. Öffne **Agent bearbeiten → Unterstützung**.
2. Beschreibe unter **Dokumentation** Zweck, geeignete Eingaben, Datenquellen und erwartetes Ausgabeformat.
3. Nutze bei Bedarf Markdown, etwa Überschriften, Listen, fett hervorgehobene Wörter und Beispiele.
4. Kontrolliere die Darstellung mit **Vorschau anzeigen**.
5. Speichere den Agenten.

Ein hilfreicher kurzer Text beantwortet: „Wobei hilft dieser Agent?“, „Welche Unterlagen braucht er?“ und „Was muss ich am Ergebnis selbst prüfen?“ Dokumentiere auch, ob der Agent externe Dienste aufrufen oder Dateien verändern kann.

## Vorschläge anlegen

Wähle unter **Vorgeschlagene Nachrichten** die Aktion **Nachricht hinzufügen**. Trage eine kurze **Bezeichnung** für die Karte und den vollständigen Text unter **Nachricht** ein. Schließe die Bearbeitung und speichere den Agenten.

Beispiel: Bezeichnung „Besprechung zusammenfassen“, Nachricht „Fasse die folgenden Notizen in Entscheidungen, offene Fragen und nächste Schritte zusammen. Frage nach, wenn Angaben fehlen.“

Die Vorschläge erscheinen in der Agenteninfo und im leeren Chat über der Texteingabe. Ein Klick übernimmt den vollständigen Nachrichtentext in das Eingabefeld und fokussiert es. Vorhandener Eingabetext wird ersetzt; gesendet wird erst mit **Senden** oder `Enter`.
