---
title: "Arbeitsplätze administrieren"
description: "Arbeitsplatzliste öffnen und organisatorische Bereiche verwalten."
lang: de
meta:
  app_urls: ["/settings/workspace"]
  required_role: "Administrator:in (admin), global."
  role_scope: "Gesamte Instanz"
  prerequisites: "Keine."
  status: "verfügbar"
  last_verified: "2026-10-18"
  source_files:
    [
      "apps/web/app/(settings)/settings/workspace/[workspaceId]/page.tsx",
      "apps/web/app/(settings)/settings/workspace/page.tsx",
      "apps/web/app/(settings)/settings/workspace/_components/WorkspaceListOptionsDropdown.tsx",
    ]
---

# Arbeitsplätze administrieren

Unter **Einstellungen → Arbeitsplätze** verwaltest du die organisatorischen Bereiche der Instanz. Diese Verwaltungsübersicht ist von der [Arbeitsplatzübersicht für Anwender:innen](../../workspace/index.md) getrennt.

## Arbeitsplatz auswählen

Suche den gewünschten Arbeitsplatz und öffne seine [Detailseite](details.md). Die Liste zeigt Namen und Beschreibungen. Unter **Optionen** kannst du nach Namen sortieren, nach Anfangsbuchstaben gruppieren und die Ansicht speichern.

Über **Arbeitsplatz erstellen** beziehungsweise **Neuer Arbeitsplatz** öffnest du das [Anlegeformular](new.md).

## Was zum Arbeitsplatz gehört

Agenten, Dokumentenablagen und Transkriptoren sind einem Arbeitsplatz zugewiesen. Die Berechtigung einer Person kann je Arbeitsplatz unterschiedlich sein. Verwende daher aussagekräftige Namen und eine Beschreibung, die Zweck und Zielgruppe erklärt.

In der Detailansicht pflegst du Beschreibung, Dokumentation, automatischen Beitritt, lokale Berechtigungen und SSO-Zuweisungen. Globale Administrator:innen können alle Arbeitsplätze verwalten. Arbeitsplatzadministrator:innen können auf der Detailseite ihres eigenen Arbeitsplatzes nur Name, Beschreibung und Dokumentation bearbeiten; Mitgliedschaften, automatischer Beitritt und SSO-Zuweisungen bleiben der globalen Administration vorbehalten. Eine allgemeine Schaltfläche zum Löschen eines Arbeitsplatzes wird hier nicht angeboten.
