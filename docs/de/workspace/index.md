---
title: "Arbeitsplätze finden"
description: "Arbeitsplätze durchsuchen, als Favorit markieren und die eigene Rolle erkennen."
lang: de
meta:
  app_urls: ["/workspace"]
  required_role: "Benutzer:in (user) oder höher im jeweiligen Arbeitsplatz."
  role_scope: "Betroffener Arbeitsplatz"
  prerequisites: "Keine."
  status: "verfügbar"
  last_verified: "2026-10-15"
  source_files:
    [
      "apps/web/app/(main)/workspace/page.tsx",
      "apps/web/app/(main)/workspace/_components/WorkspaceList.tsx",
    ]
---

# Arbeitsplätze finden

Ein **Arbeitsplatz** bündelt Agenten, Dokumentenablagen und Transkriptoren, zum Beispiel für ein Team oder ein Fachgebiet. Du kannst in mehreren Arbeitsplätzen unterschiedliche Rollen haben.

## Arbeitsplatz öffnen

1. Wähle **Arbeitsplätze** in der Seitenleiste.
2. Suche nach einem Arbeitsplatz oder wähle ihn in der Übersicht.
3. Öffne ihn über **Arbeitsplatz öffnen**. Die [Detailseite](details.md) zeigt seine Inhalte und deine Rolle.

![Arbeitsplatzkarte mit Beschreibung und Aktionen](../assets/arbeitsplatz.png)

## Übersicht anpassen

Unter **Optionen** wechselst du zwischen Kacheln und Tabelle, sortierst nach Namen oder gruppierst nach Favoriten und Anfangsbuchstaben. Mit **Ansicht speichern** behältst du die Einstellung für diese Übersicht; **Zurücksetzen** stellt die Standardansicht her. In der Tabelle findest du auch **Deine Rolle**.

Das Sternsymbol fügt den Arbeitsplatz deinen Favoriten hinzu oder entfernt ihn wieder.

## Leere Übersicht

Bei **Keine Arbeitsplätze** kontrolliere deine [Berechtigungen](../me/permissions.md) und bitte die Administration um eine Zuweisung. Bei **Keine Treffer** entferne zunächst den Suchbegriff.

Neue Arbeitsplätze legt die globale Administration unter [Einstellungen → Arbeitsplätze](../settings/workspace/index.md) an. Bitte sie um eine Zuweisung, wenn ein benötigter Arbeitsplatz fehlt.
