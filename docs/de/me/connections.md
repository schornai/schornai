---
title: "Persönliche Verbindungen"
description: "OAuth-Verbindungen ansehen und trennen."
lang: de
meta:
  app_urls: ["/me/connections"]
  required_role: "Angemeldetes Konto; keine zusätzliche Arbeitsplatzrolle."
  role_scope: "Eigenes Konto"
  prerequisites: "Für eine neue Verbindung: Zugriff auf einen Agenten mit OAuth-fähigem MCP-Dienst."
  status: "verfügbar"
  last_verified: "2026-10-24"
  source_files:
    - "apps/web/app/(settings)/me/connections/page.tsx"
    - "apps/web/app/(settings)/me/connections/_actions/disconnectMCP.ts"
    - "apps/web/lib/mcp/pendingApproval.ts"
    - "packages/database/src/mcp/listMCPOAuthConnections.ts"
    - "packages/database/src/mcp/deleteMCPOAuthConnection.ts"
---

# Persönliche Verbindungen

Unter **Profil → Verbindungen** siehst du deine gespeicherten OAuth-Verbindungen mit ihrer vollständigen MCP-Server-Adresse. Andere Benutzer:innen sehen deine Verbindungen nicht. Statische HTTP-Header aus der Agentenkonfiguration erscheinen hier nicht.

Eine Verbindung entsteht im Chat: Erst wenn ein benötigtes MCP-Werkzeug eine Anmeldung verlangt, erscheint eine Werkzeugfreigabe mit **Mein Konto verbinden**. Nach der Anmeldung beim Anbieter kehrst du zum Chat zurück. Der wartende Aufruf wird automatisch fortgesetzt, sofern er noch offen ist. Eine abgelehnte, abgebrochene oder inzwischen erledigte Freigabe wird nicht erneut ausgeführt. Bei abgebrochener Anmeldung kannst du die noch offene Freigabe erneut verbinden oder ablehnen.

**Verbindung trennen** löscht die hier gespeicherten Tokens und offene Anmeldesitzungen für diese Server-Adresse. Das gilt für alle deine Agenten und Chats, die dieselbe MCP-URL verwenden. Beim nächsten benötigten Aufruf kannst du dich erneut verbinden. Bereits laufende Aufrufe können noch abschließen. Die Berechtigung beim Anbieter wird dadurch nicht widerrufen; entferne sie bei Bedarf zusätzlich in dessen Kontoeinstellungen.

Während des Trennens zeigt der Button den laufenden Vorgang an. Schlägt er fehl, erscheint eine Fehlermeldung und du kannst es erneut versuchen.

Die leere Ansicht erklärt, wie du deine erste Verbindung im Chat herstellst. Zugangsdaten werden ausschließlich serverseitig gespeichert und niemals auf dieser Seite angezeigt.

Details zu Voraussetzungen und unterstützten Anbietern stehen unter [Externe Werkzeuge über MCP](../agent/edit/mcp.md).

## Zugehörige MCP-Werkzeuge

- `platform_personal_mcp_connections`: Eigene externe OAuth-Verbindungen auflisten. Mindeststufe: **Benutzer**.
- `platform_personal_mcp_disconnect`: Eigene externe OAuth-Verbindung trennen. Mindeststufe: **Benutzer**.

Jeder Aufruf prüft zusätzlich die Berechtigung für das eigene Konto bzw. die betroffene Ressource. Die Zugriffsstufe verleiht keine Rechte. Voraussetzungen, besondere Grenzen und der vollständige Werkzeugkatalog stehen unter [Plattformzugriff](../agent/edit/plattformzugriff.md).
