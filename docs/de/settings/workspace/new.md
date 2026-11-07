---
title: "Einen Arbeitsplatz anlegen"
description: "Einen neuen Bereich mit Namen und Beschreibung erstellen."
lang: de
meta:
  app_urls: ["/settings/workspace/new"]
  required_role: "Administrator:in (admin), global."
  role_scope: "Gesamte Instanz"
  prerequisites: "Ein Name für den neuen Arbeitsplatz."
  status: "verfügbar"
  last_verified: "2026-10-15"
  source_files:
    [
      "apps/web/app/(settings)/settings/workspace/_components/WorkspaceCreator.tsx",
      "apps/web/app/(settings)/settings/workspace/_actions/createWorkspace.ts",
    ]
---

# Einen Arbeitsplatz anlegen

Ein Arbeitsplatz bildet den Rahmen für zusammengehörige Agenten, Dokumentenablagen, Transkriptoren und ihre Zugriffsrechte.

![Formular zum Anlegen eines Arbeitsplatzes](../../assets/arbeitsplatz-anlegen.png)

## Arbeitsplatz erstellen

1. Öffne **Einstellungen → Arbeitsplätze** und wähle **Arbeitsplatz erstellen**.
2. Trage einen **Namen** ein, zum Beispiel „Personalabteilung“.
3. Ergänze optional eine **Beschreibung**, zum Beispiel Zweck und zuständiges Team.
4. Wähle **Workspace anlegen**.
5. Nach erfolgreicher Anlage öffnet sich die Verwaltungsseite des neuen Arbeitsplatzes.

Mit **Abbrechen** kehrst du zur Übersicht zurück.

## Danach

Richte in der [Detailansicht](details.md) die Dokumentation und Berechtigungen ein. Entscheide ausdrücklich, ob alle angemeldeten Konten automatisch als Benutzer:innen beitreten sollen. Lege anschließend die benötigten Agenten oder Apps in diesem Arbeitsplatz an.

Prüfe mit einem vorgesehenen Mitglied unter **Profil → Berechtigungen** die Rolle und öffne anschließend den Arbeitsplatz, um die bereitgestellten Agenten und Apps zu testen.

## Zugehörige MCP-Werkzeuge

**Mindeststufe:** Globaler Administrator. `platform_workspace_create` legt einen Workspace mit Name und Beschreibung an. Die neue Kennung wird zurückgegeben.

Verbindung und gemeinsame Berechtigungsregeln: [Plattformzugriff](../../agent/edit/plattformzugriff.md).
