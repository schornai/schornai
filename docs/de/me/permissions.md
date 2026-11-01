---
title: "Rollen und Berechtigungen"
description: "Zugriffsrollen, Agentenrollen und Werkzeugfreigaben unterscheiden."
lang: de
meta:
  app_urls: ["/me/permissions"]
  required_role: "Angemeldetes Konto; keine zusätzliche Arbeitsplatzrolle."
  role_scope: "Eigenes Konto und jeweiliger Arbeitsplatz"
  prerequisites: "Keine."
  status: "verfügbar"
  last_verified: "2026-10-24"
  source_files:
    [
      "apps/web/app/(settings)/_components/Sidebar.tsx",
      "apps/web/app/(settings)/settings/workspace/[workspaceId]/_components/WorkspaceEditorPermissions.tsx",
      "apps/web/lib/supabase/getWorkspaceAdminContext.ts",
      "apps/web/app/(settings)/me/permissions/page.tsx",
      "apps/web/lib/hasPermission.ts",
      "packages/database/src/user/buildAccessToken.ts",
      "apps/web/app/(settings)/settings/workspace/[workspaceId]/page.tsx",
      "apps/web/app/(settings)/settings/_actions/updatePermission.ts",
      "supabase/migrations/20261010151139_agent_workspace_permissions.sql",
      "supabase/migrations/20261024104106_workspace_visibility_from_jwt.sql",
      "apps/web/app/(main)/app/transcribe/_components/TranscriberIconGroupActions.tsx",
    ]
---

# Rollen und Berechtigungen

Unter **Profil → Berechtigungen** findest du deine Rolle je Arbeitsplatz. Eine Rolle gilt nur für den jeweiligen Arbeitsplatz; globale Administrator:innen haben darüber hinaus Zugriff auf die Verwaltung der Instanz.

## Arbeitsplatzrollen

| Rolle                                                | Was sie im regulären Bedienablauf ermöglicht                                                                                                                                                                      |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nicht berechtigt**                                 | Kein Zugriff auf die Inhalte dieses Arbeitsplatzes.                                                                                                                                                               |
| **Benutzer:in** (`user`)                             | Agenten verwenden, eigene Chats und Transkriptionen bearbeiten, freigegebene Ablagen und deren Inhalte lesen und durchsuchen.                                                                                     |
| **Bearbeiter:in** (`editor`)                         | Zusätzlich Dateien und verarbeitete Inhalte in gemeinsamen Dokumentenablagen bearbeiten, soweit die jeweilige Funktion angeboten wird.                                                                            |
| **Arbeitsplatzadministrator:in** (`workspace-admin`) | Zusätzlich Agenten, Dokumentenablagen und Transkriptoren anlegen, konfigurieren und löschen sowie Name, Beschreibung und Dokumentation des eigenen Arbeitsplatzes bearbeiten.                                     |
| **Administrator:in** (`admin`)                       | Zugriff auf alle Arbeitsplätze sowie Benutzer- und Mitgliederverwaltung, automatischer Beitritt, SSO-Zuweisungen, Arbeitsplatzverwaltung, Modelle, XRAG sowie Cluster mit Service, Aufgabenstapel und Artefakten. |

Bei den Rollenangaben in den Metadaten dieser Dokumentation sind höhere Rollen eingeschlossen, sofern kein anderer Geltungsbereich angegeben ist. Eigene Chatdateien benötigen beispielsweise keine Bearbeiterrolle für eine gemeinsame Ablage.

Als Arbeitsplatzadministrator:in öffnest du über **Arbeitsplätze → dein Arbeitsplatz → Bearbeiten** dessen Verwaltung. Dort kannst du Name, Beschreibung und Dokumentation ändern. **Mitgliederverwaltung:** Lokale Rollen, automatischer Beitritt und SSO-Zuweisungen werden ausschließlich von globalen Administrator:innen verwaltet.

## Drei verschiedene Bedeutungen von „Rolle“ und „Freigabe“

- **Deine Arbeitsplatzrolle** bestimmt, welche Bereiche und Inhalte du nutzen oder ändern darfst.
- Eine **Agentenrolle** legt Prompt, Modell und Werkzeuge für eine Teilaufgabe der KI fest. Sie verleiht dir keine Benutzerrechte.
- Eine **Werkzeugfreigabe im Chat** erlaubt einen konkreten Aufruf, etwa das Speichern einer Datei. Sie ändert deine Arbeitsplatzrolle ebenfalls nicht.

## Zugriff erhalten oder ändern

Für lokale Konten legt die globale Administration neue Arbeitsplatzzuweisungen unter [Benutzer:innen](../settings/user/details.md) oder [Arbeitsplätze](../settings/workspace/details.md) an. Auch Rollen bestehender lokaler Mitglieder kann ausschließlich die globale Administration ändern. Bei SSO werden Anmeldegruppen und die dafür eingerichteten Zuweisungen verwendet. Ist **Automatisch Benutzer:in** für einen Arbeitsplatz aktiv, erhalten angemeldete Konten dort die Benutzerrolle.

Rollenänderungen werden bei der Erneuerung der Sitzung oder einer erneuten Anmeldung wirksam. Melde dich neu an, wenn die erwartete Rolle noch nicht angezeigt wird.

Maßgeblich sind die wirksamen Rollen deiner aktuellen Sitzung. Auch ohne direkte lokale Rollenzuweisung werden Arbeitsplätze aus automatischem Beitritt oder SSO angezeigt; du kannst dort mit der Benutzerrolle neue Agentenchats starten.

Fehlt nach einer SSO-Anmeldung eine Rolle, lass die Gruppenmitgliedschaft beim Anmeldeanbieter und die [SSO-Zuweisung des Arbeitsplatzes](../settings/workspace/details.md#sso-gruppen-zuweisen) prüfen.

## Keine Berechtigungen

Eine leere Liste erklärt, warum keine Agenten oder Apps verfügbar sind. Bitte die Administration um Zugang zu einem benannten Arbeitsplatz. Globale Administrator:innen können bei einer neuen Instanz zunächst einen [Arbeitsplatz anlegen](../settings/workspace/new.md).

Wird eine Aktion trotz passender angezeigter Rolle abgelehnt, notiere die betroffene Ressource und die Fehlermeldung für die Administration. Weitere Schritte stehen unter [Fehlerbehebung](../hilfe/fehlerbehebung.md).
