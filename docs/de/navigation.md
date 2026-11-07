---
title: "Alle Anleitungen"
description: "Vollständiges Inhaltsverzeichnis der Anwenderdokumentation."
lang: de
meta:
  app_urls: []
  required_role: "Keine zum Lesen; die jeweilige Anleitung nennt die benötigte App-Rolle."
  role_scope: "Dokumentation"
  prerequisites: "Keine."
  status: "verfügbar"
  last_verified: "2026-10-25"
  source_files: []
---

# Alle Anleitungen

## Einstieg

- [schorn.ai – Anwenderdokumentation](index.md)

## Anmeldung

- [Anmelden und abmelden](signin/index.md)
- [Passwort festlegen oder zurücksetzen](signin/reset.md)

## Agenten und Chats

- [Agenten finden und verwenden](agent/index.md)
- [Fähigkeiten eines Agenten ansehen](agent/details.md)
- [Einen Agenten erstellen](agent/new.md)
- [Agenten bearbeiten, kopieren und löschen](agent/edit/index.md)
- [Agentenrollen und Prompts](agent/edit/rollen.md)
- [Eine Dokumentenablage mit einem Agenten verbinden](agent/edit/dokumentenablagen.md)
- [Web-Zugriff konfigurieren](agent/edit/web.md)
- [Externe Werkzeuge über MCP anbinden](agent/edit/mcp.md)
- [Plattformzugriff und schorn.ai als MCP-Server](agent/edit/plattformzugriff.md)
- [Anleitungen und Nachrichtenvorschläge für einen Agenten](agent/edit/unterstuetzung.md)
- [Modelle und allgemeine Agenteneinstellungen](agent/edit/einstellungen.md)
- [Mit einem Agenten chatten](agent/chat/index.md)
- [Dateien und Aufnahmen im Chat](agent/chat/dateien.md)
- [Mehrere Nachrichten als Stapel verarbeiten](agent/chat/stapel.md)
- [Werkzeugaktionen prüfen und freigeben](agent/chat/freigaben.md)
- [Agenteninformationen im Gespräch](agent/chat/info.md)

## Verlauf

- [Verlauf: Chats und Transkriptionen wiederfinden](activity/index.md)

## Apps

- [Apps](app/index.md)
- [Dokumentenablagen](app/documents/index.md)
- [Eine Dokumentenablage erstellen](app/documents/new.md)
- [Eine Dokumentenablage konfigurieren](app/documents/edit.md)
- [Dateien hochladen, öffnen und organisieren](app/documents/files.md)
- [In Dokumenten suchen](app/documents/search.md)
- [Informationen zu einer Dokumentenablage](app/documents/info.md)
- [Transkription: Sprache in Text umwandeln](app/transcribe/index.md)
- [Einen Transkriptor erstellen](app/transcribe/new.md)
- [Transkriptoren bearbeiten, kopieren und löschen](app/transcribe/edit.md)
- [Informationen zu einem Transkriptor](app/transcribe/info.md)
- [Audio- und Videodateien transkribieren](app/transcribe/files.md)
- [Audio direkt im Browser aufnehmen](app/transcribe/aufnahme.md)
- [Transkripte prüfen, bearbeiten und exportieren](app/transcribe/transkription.md)

## Arbeitsplätze

- [Arbeitsplätze finden](workspace/index.md)
- [In einem Arbeitsplatz arbeiten](workspace/details.md)

## Profil

- [Profil und persönliche Einstellungen](me/index.md)
- [Rollen und Berechtigungen](me/permissions.md)
- [Persönliche Verbindungen](me/connections.md)
- [Neues Passwort gesetzt](me/reset-password-success.md)

## Administration

- [Administration der Instanz](settings/index.md)
- [Cluster-Übersicht](cluster/index.md)
- [Cluster → Service: Maschinen und Dienste](service/index.md)
- [Cluster → Artefakte](artifacts/index.md)
- [Modelle verwalten](settings/models.md)
- [OAuth-Apps und Suchverbindungen](settings/connections.md)
- [Benutzer:innen verwalten](settings/user/index.md)
- [Ein lokales Benutzerkonto anlegen](settings/user/new.md)
- [Benutzerprofil und Rechte verwalten](settings/user/details.md)
- [Arbeitsplätze administrieren](settings/workspace/index.md)
- [Einen Arbeitsplatz anlegen](settings/workspace/new.md)
- [Arbeitsplatzbeschreibung und Mitgliedschaften verwalten](settings/workspace/details.md)
- [Single Sign-on einrichten](settings/sso.md)
- [XRAG-Pakete hochladen](settings/xrag.md)
- [Darstellung und Farbvorlagen](settings/theme.md)

## Aufgaben

- [Cluster → Aufgabenstapel](tasks/index.md)

## Feedback

- [Feedback und Fehlerberichte](feedback/index.md)

## Hilfe

- [Häufige Fragen und Fehlerbehebung](hilfe/fehlerbehebung.md)
- [Begriffe und frühere Bezeichnungen](hilfe/begriffe.md)
- [Daten, Speicherorte und Freigaben](hilfe/daten-und-freigaben.md)
- [Sicherheit und Betrieb](hilfe/sicherheit-und-betrieb.md)

## Desktop-App

- [Die Desktop-App verwenden](desktop/index.md)

## CLI

- [schorn.ai CLI](cli/index.md)

## Service und Mac-App

- [Service und Mac-App](box-admin/index.md)
- [Core mit lokalem oder entferntem Supabase](box-admin/supabase.md)
- [Worker-Installation unter macOS](box-admin/worker-macos.md)
- [Worker-Installation unter Linux](box-admin/worker-linux.md)

## Zugehörige MCP-Werkzeuge

- `platform_favorites_get`: Eigene Favoriten lesen. Mindeststufe: **Benutzer**.
- `platform_favorites_update`: Favoriten und Sidebar-Sichtbarkeit speichern. Mindeststufe: **Benutzer**.
- `platform_view_preferences_get`: Gruppierung, Sortierung und Ansicht lesen. Mindeststufe: **Benutzer**.
- `platform_view_preferences_update`: Gruppierung, Sortierung und Ansicht speichern. Mindeststufe: **Benutzer**.

Jeder Aufruf prüft zusätzlich die Berechtigung für das eigene Konto bzw. die betroffene Ressource. Die Zugriffsstufe verleiht keine Rechte. Voraussetzungen, besondere Grenzen und der vollständige Werkzeugkatalog stehen unter [Plattformzugriff](agent/edit/plattformzugriff.md).
