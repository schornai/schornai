---
title: "In einem Arbeitsplatz arbeiten"
description: "Beschreibung, Dokumentation und verfügbare Inhalte eines Arbeitsplatzes öffnen."
lang: de
meta:
  app_urls: ["/workspace/[workspaceId]"]
  required_role: "Benutzer:in (user) oder höher im betreffenden Arbeitsplatz."
  role_scope: "Betroffener Arbeitsplatz"
  prerequisites: "Keine."
  status: "verfügbar"
  last_verified: "2026-10-18"
  source_files:
    [
      "apps/web/app/(main)/workspace/[workspaceId]/page.tsx",
      "apps/web/app/(main)/workspace/_components/WorkspaceIconGroupActions.tsx",
      "apps/web/app/(settings)/settings/workspace/[workspaceId]/page.tsx",
    ]
---

# In einem Arbeitsplatz arbeiten

Die Detailseite eines Arbeitsplatzes ist dein Einstieg in ein zusammengehöriges Angebot. Sie zeigt Name, Beschreibung und gegebenenfalls eine ausführliche Dokumentation. Darunter stehen die verfügbaren Agenten, Dokumentenablagen und Transkriptoren.

## Inhalte nutzen

1. Lies die Beschreibung des Arbeitsplatzes. Sie kann Hinweise zu Zielgruppe, Daten oder Arbeitsabläufen enthalten.
2. Wähle eine Karte: einen [Agenten](../agent/index.md), eine [Dokumentenablage](../app/documents/index.md) oder einen [Transkriptor](../app/transcribe/index.md).
3. Nutze die Symbole der Karte für Informationen, Favoriten oder einen neuen Chat beziehungsweise eine neue Transkription.
4. Unter **Deine Rolle** siehst du deine Berechtigung für diesen Arbeitsplatz.

Bei **Noch keine Inhalte** kann die Arbeitsplatzadministration einen [Agenten](../agent/new.md), eine [Dokumentenablage](../app/documents/new.md) oder einen [Transkriptor](../app/transcribe/new.md) anlegen und diesem Arbeitsplatz zuordnen.

## Arbeitsplatz bearbeiten

Mit **Bearbeiten** öffnest du die [Verwaltungsseite](../settings/workspace/details.md). Dafür brauchst du Arbeitsplatzadministratorrechte in diesem Arbeitsplatz oder globale Administratorrechte. Arbeitsplatzadministrator:innen können dort Name, Beschreibung und Dokumentation bearbeiten. **Mitgliedschaften, automatischer Beitritt und SSO-Zuweisungen bleiben ausschließlich der globalen Administration vorbehalten.** Wende dich für Änderungen daran an die globale Administration.
