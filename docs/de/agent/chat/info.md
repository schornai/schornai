---
title: "Agenteninformationen im Gespräch"
description: "Im laufenden Chat Modell, Rollen, Werkzeuge und Dokumentation nachschlagen."
lang: de
meta:
  app_urls:
    [
      "/agent/[agentId]/[activityId]/info",
      "/agent/[agentId]/[activityId]/documentation",
    ]
  required_role: "Benutzer:in (user) oder höher; Zugriff auf den Agenten und das Gespräch."
  role_scope: "Arbeitsplatz des Agenten und zugängliches Gespräch"
  prerequisites: "Keine."
  status: "verfügbar"
  last_verified: "2026-11-07"
  source_files:
    [
      "apps/web/app/(main)/agent/[agentId]/[activityId]/info/page.tsx",
      "apps/web/app/(main)/agent/[agentId]/[activityId]/documentation/page.tsx",
      "packages/realtime/src/platform/tools.ts",
      "apps/web/app/(main)/agent/[agentId]/[activityId]/_components/TabsChat.tsx",
    ]
---

# Agenteninformationen im Gespräch

Wähle im Gespräch den Reiter **Info**, wenn du wissen möchtest, mit welchem Agenten du arbeitest. Dort findest du seine aktuelle Übersicht und die hinterlegte Dokumentation.

Klappe die Informationsbereiche auf, um Modell, Prompt, Rollen, angebundene Ablagen und Werkzeuge zu prüfen. Die [Agentenübersicht](../details.md) erklärt die einzelnen Angaben.

**Dokumentation** steht zwischen **Dateien** und **Info**, wenn beim Agenten ein Dokumentationstext hinterlegt ist. Der Reiter zeigt den vollständigen Text mit Markdown-Formatierung. Bei fehlender oder nur aus Leerraum bestehender Dokumentation erscheint er nicht; die direkte Dokumentationsadresse liefert dann „Nicht gefunden“.

Über **Chat** kehrst du in dasselbe Gespräch zurück. **Dateien** öffnet dessen Dateien. Ein Bearbeitungslink führt zur gemeinsamen Agentenkonfiguration und benötigt die Rolle Arbeitsplatzadministrator:in oder globale Administratorrechte.

Die angezeigten Informationen spiegeln die aktuelle Konfiguration wider. Wurde der Agent zwischenzeitlich geändert, müssen sie nicht den Einstellungen einer früheren Antwort entsprechen. Für die konkrete Antwort sind zusätzlich die darin angezeigten Werkzeugaufrufe und Quellen wichtig.

## Zugehörige MCP-Werkzeuge

`platform_agent_get` liest die aktuelle Konfiguration einschließlich `documentation` eines zugänglichen Agenten. Mindeststufe: **Benutzer**; erforderlich ist Zugriff auf den Agenten im jeweiligen Arbeitsplatz. Die Dokumentation gehört zum Agenten und ist keine historische Kopie für das Gespräch. Die Navigation zwischen Reitern ist eine Browserfunktion und benötigt kein eigenes Werkzeug.
