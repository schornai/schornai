---
title: "Administration der Instanz"
description: "Benutzer:innen, Arbeitsplätze, SSO, XRAG und Darstellung verwalten."
lang: de
meta:
  app_urls: ["/settings"]
  required_role: "Administrator:in (admin), global."
  role_scope: "Gesamte Instanz"
  prerequisites: "Keine."
  status: "verfügbar"
  last_verified: "2026-10-25"
  source_files:
    [
      "apps/web/app/(settings)/settings/workspace/[workspaceId]/page.tsx",
      "apps/web/app/(settings)/settings/page.tsx",
      "apps/web/app/(settings)/_components/Sidebar.tsx",
    ]
---

# Administration der Instanz

Globale Administrator:innen öffnen die **Einstellungen** über das Kontomenü oder die Verwaltungsnavigation. Arbeitsplatzadministrator:innen erreichen die Verwaltung ihres eigenen Arbeitsplatzes über **Arbeitsplätze → Arbeitsplatz öffnen → Bearbeiten**.

Die Kachelübersicht enthält auch **Verbindungen** für die zentralen OAuth-Apps und Suchzugänge.

| Bereich                             | Aufgabe                                                               |
| ----------------------------------- | --------------------------------------------------------------------- |
| [Benutzer:innen](user/index.md)     | Lokale Konten anlegen, Profile und Rechte verwalten                   |
| [Arbeitsplätze](workspace/index.md) | Bereiche anlegen, beschreiben und Berechtigungen zuweisen             |
| [Verbindungen](connections.md)      | OAuth-Apps und Staan-/Brave-Suchzugänge zentral verwalten             |
| [SSO Anbieter](sso.md)              | Einen SAML-2.0-Anbieter und Attributzuordnungen einrichten            |
| [XRAG hochladen](xrag.md)           | Bereitgestellte Pakete zur Installation oder Aktualisierung übergeben |
| [Darstellung](theme.md)             | Vorhandene Farbwerte ansehen und lokal ausprobieren                   |

## Einen neuen Bereich für ein Team vorbereiten

1. [Arbeitsplatz anlegen](workspace/new.md).
2. Lokale [Konten anlegen](user/new.md) oder den vorgesehenen SSO-Zugang einrichten.
3. Personen die passenden Arbeitsplatzrollen zuweisen.
4. Einen [Transkriptor](../app/transcribe/new.md), eine [Dokumentenablage](../app/documents/new.md) und/oder einen [Agenten](../agent/new.md) nach Bedarf bereitstellen.
5. Den Ablauf mit einem Konto der tatsächlich vorgesehenen Benutzerrolle prüfen.

Unter [Modelle](models.md) in der Verwaltungsnavigation oder im Kontomenü siehst du lokale Modellinformationen und richtest externe Sprachmodelle ein. Lokale Modelle und Softwareupdates stellt die Betriebsadministration über [XRAG](xrag.md) bereit.

Die Begleitprogramme [Desktop-App](../desktop/index.md) und [Service und Mac-App](../box-admin/index.md) sind separat beschrieben. Hinweise für Wartung und Konfiguration findest du unter [Sicherheit und Betrieb](../hilfe/sicherheit-und-betrieb.md).

Unter [Cluster](../cluster/index.md) findest du eine Kachelübersicht zu [Service](../service/index.md), [Aufgabenstapel](../tasks/index.md) und [Artefakten](../artifacts/index.md). Dieselben Ziele stehen als Unterpunkte in der Navigation.
