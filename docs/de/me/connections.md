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
  last_verified: "2026-11-07"
  source_files:
    - "apps/web/app/(settings)/me/connections/page.tsx"
    - "apps/web/app/(settings)/me/connections/_actions/disconnectMCP.ts"
    - "apps/web/lib/mcp/pendingApproval.ts"
    - "packages/database/src/mcp/listMCPOAuthConnections.ts"
    - "packages/database/src/mcp/deleteMCPOAuthConnection.ts"
    - "packages/database/src/platformMcp/listUserGrants.ts"
    - "packages/database/src/platformMcp/revokeUserGrant.ts"
    - "apps/web/app/(settings)/me/connections/_actions/revokePlatformMcp.ts"
    - "apps/web/app/(settings)/me/connections/_components/IncomingMCPConnections.tsx"
    - "apps/web/app/(settings)/me/connections/_components/PersonalMCPConnections.tsx"
    - "apps/web/app/(settings)/me/connections/_components/MCPDisconnectButton.tsx"
---

# Persönliche Verbindungen

Unter **Profil → Verbindungen** verwaltest du zwei Arten persönlicher OAuth-Verbindungen: eingehenden **Zugriff auf schorn.ai** und ausgehende **Verbindungen zu externen Diensten**. Andere Benutzer:innen sehen deine Verbindungen nicht. Statische HTTP-Header aus der Agentenkonfiguration erscheinen hier nicht.

Bereiche ohne Verbindungen werden vollständig ausgeblendet. Wenn weder eingehende noch ausgehende Verbindungen bestehen, erscheint ausschließlich der gemeinsame Leerzustand „Noch keine Verbindungen“.

## Zugriff auf schorn.ai

Hier stehen Anwendungen, denen du über `/mcp` Zugriff in deinem Namen erteilt hast. Jede Freigabe zeigt den Anwendungsnamen, die freigegebene Zugriffsstufe, den Endpunkt sowie Erstellungs- und Ablaufdatum in UTC. Abgelaufene Freigaben sind markiert. Mehrere Freigaben derselben Anwendung erscheinen einzeln; noch nicht abgeschlossene Anmeldungen erscheinen nicht.

Über das **X** und die Bestätigung **Zugriff widerrufen** entfernst du die jeweilige Freigabe. Alle zugehörigen Zugriffs- und Refresh-Tokens werden ungültig. Bereits laufende Aufrufe können noch abschließen. Die Anwendung muss beim nächsten Zugriff erneut deine Freigabe einholen. Andere Freigaben, Anwendungen und Benutzerkonten bleiben unverändert. Bei einem Fehler bleibt die Bestätigung offen und du kannst es erneut versuchen.

Du siehst und widerrufst ausschließlich deine eigenen Freigaben, auch als globale Administratorin oder globaler Administrator. Tokens, Token-Hashes und andere Zugangsdaten werden nicht angezeigt. Die Freigabe verwalten zu können erfordert nur ein angemeldetes Konto; eine zwischenzeitlich entzogene Workspace-Mitgliedschaft verhindert den Widerruf nicht.

## Verbindungen zu externen Diensten

Dieser Bereich zeigt die vollständigen MCP-Server-Adressen deiner ausgehenden Verbindungen. Zum Trennen wählst du das **X** und bestätigst **Verbindung trennen**.

Eine Verbindung entsteht im Chat: Erst wenn ein benötigtes MCP-Werkzeug eine Anmeldung verlangt, erscheint eine Werkzeugfreigabe mit **Mein Konto verbinden**. Nach der Anmeldung beim Anbieter kehrst du zum Chat zurück. Der wartende Aufruf wird automatisch fortgesetzt, sofern er noch offen ist. Eine abgelehnte, abgebrochene oder inzwischen erledigte Freigabe wird nicht erneut ausgeführt. Bei abgebrochener Anmeldung kannst du die noch offene Freigabe erneut verbinden oder ablehnen.

**Verbindung trennen** löscht die hier gespeicherten Tokens und offene Anmeldesitzungen für diese Server-Adresse. Das gilt für alle deine Agenten und Chats, die dieselbe MCP-URL verwenden. Beim nächsten benötigten Aufruf kannst du dich erneut verbinden. Bereits laufende Aufrufe können noch abschließen. Die Berechtigung beim Anbieter wird dadurch nicht widerrufen; entferne sie bei Bedarf zusätzlich in dessen Kontoeinstellungen.

Während des Trennens zeigt der Button den laufenden Vorgang an. Schlägt er fehl, erscheint eine Fehlermeldung und du kannst es erneut versuchen.

Zugangsdaten werden ausschließlich serverseitig gespeichert und niemals auf dieser Seite angezeigt.

Details zu Voraussetzungen und unterstützten Anbietern stehen unter [Externe Werkzeuge über MCP](../agent/edit/mcp.md).

## Zugehörige MCP-Werkzeuge

- `platform_personal_mcp_grants`: Eigene eingehende Plattformfreigaben mit Stufe und Ablaufdatum auflisten, ohne Zugangsdaten. Mindeststufe: **Benutzer**.
- `platform_personal_mcp_revoke`: Eine eigene eingehende Freigabe anhand ihrer `grantId` einschließlich aller Tokens widerrufen. Mindeststufe: **Benutzer**. Ein Client kann damit auch seinen eigenen Zugang beenden.
- `platform_personal_mcp_connections`: Eigene externe OAuth-Verbindungen auflisten. Mindeststufe: **Benutzer**.
- `platform_personal_mcp_disconnect`: Eigene externe OAuth-Verbindung trennen. Mindeststufe: **Benutzer**.

Jeder Aufruf prüft zusätzlich die Berechtigung für das eigene Konto bzw. die betroffene Ressource. Die Zugriffsstufe verleiht keine Rechte. Voraussetzungen, besondere Grenzen und der vollständige Werkzeugkatalog stehen unter [Plattformzugriff](../agent/edit/plattformzugriff.md).
