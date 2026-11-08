---
title: "Quellstand, Abgrenzung und bekannte Grenzen"
description: "Nachweise für die redaktionelle Pflege und verlässliche Einordnung des dokumentierten Funktionsumfangs."
lang: de
meta:
  app_urls: []
  required_role: "Keine zum Lesen; Verwaltungsaktionen richten sich nach den Fachkapiteln."
  role_scope: "Redaktion und Wissensbasis"
  prerequisites: "Keine."
  status: "verfügbar"
  last_verified: "2026-10-15"
  source_files:
    ["apps/web/app", "tests/visual/storybook.visual.spec.mjs", "AGENTS.md"]
---

# Quellstand, Abgrenzung und bekannte Grenzen

## Grundlage

Diese Dokumentation wurde am **15. Oktober 2026** aus dem vorhandenen Quellcode, den deutschen Oberflächentexten und den visuellen Storybook-Referenzen erstellt. Ausgangspunkt war Git-Commit `7354b84168e3405fd3441f913dbc086e1e8a2a0d` mit dem vorhandenen Arbeitsstand.

Die Seiten folgen den App-Routen. Gleiche geänderte Abläufe anhand der jeweiligen `meta.source_files` ab und aktualisiere `meta.last_verified` nur nach diesem Abgleich. Ältere Produktnamen sind im [Glossar](../hilfe/begriffe.md) erklärt.

## Umfang

Erfasst sind alle gegenwärtigen `page.tsx`-Routen unter `apps/web/app`, ihre bedienbaren Funktionen und die Abläufe der Desktop-App, Service-CLI und Mac-App. Die ergänzenden Betriebsanleitungen beschreiben Service-Konfiguration, lokale und entfernte Supabase-Instanzen sowie Worker-Installationen auf macOS und Linux. Interne API-Routen werden nicht als eigene Benutzerkapitel dargestellt; die Service-Schnittstellen sind im XRAG-Kapitel erklärt.

Die [Routenübersicht](routen.md) ordnet jede Web-Seite einer Anleitung zu. Die Abbildungen zeigen Storybook-Beispieldaten; ihre Story-IDs stehen im [Bildverzeichnis](bilder.md).

## Besonders wichtige Einschränkungen

| Thema                                               | Dokumentierter Stand                                                                                                                                                                                                  | Maßgebliche Quelle                                                                                             |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Agenten verwalten                                   | Erstellen, Ändern und Löschen verlangen Arbeitsplatzadministratorrechte.                                                                                                                                              | `supabase/migrations/20261010151139_agent_workspace_permissions.sql`                                           |
| Agenten-Nachrichtenvorschlag                        | Karten erzeugen eine zusätzliche `/chat/`-Pfadkomponente, für die keine entsprechende Seitenroute existiert. Manueller Einstieg über „Neuer Chat“ ist beschrieben.                                                    | `AgentRecommendedMessage.tsx` und aktuelle Routen                                                              |
| Datei- und Stapelschalter im Agenten                | Die Eingabekomponente zeigt diese Bedienelemente unabhängig von den Konfigurationsschaltern.                                                                                                                          | `AgentEditorSettingsAdditionalFunctions.tsx`, `ChatComposeMessageSelected.tsx`                                 |
| Ziel verfolgen, Nachtschicht, selbstlöschende Chats | Keine aktive Bedienoberfläche im derzeitigen Editor.                                                                                                                                                                  | `AgentEditorSettingsAdditionalFunctions.tsx`                                                                   |
| Taschenrechner, Chat Erweiterung                    | Verfügbar; Antwortvorschläge ergänzen einen Entwurf, manuelle Titel bleiben erhalten, Berechnungen verwenden begrenzte reelle Gleitkommaarithmetik.                                                                   | `AgentEditorRoleTools.tsx`                                                                                     |
| Farbvorlagen                                        | Lokale Vorschau ohne angeschlossenen dauerhaften Speichervorgang.                                                                                                                                                     | `ColorPickerHueSlider.tsx`, `ColorPickerProvider.tsx`                                                          |
| Verlauf löschen                                     | Entfernt Aktivitätseinträge; kein vollständiger Lösch- oder Abbruchablauf.                                                                                                                                            | `apps/web/app/(main)/_actions/deleteActivity.ts`, `packages/realtime/src/documents/activity/deleteActivity.ts` |
| Allgemeine Dateiverwaltung                          | Textdateien, Umbenennen, Datei- und Ordnerlöschung, Downloads, Verarbeitung sowie Kopieren/Verschieben einzelner Dateien sind verfügbar. Kopieren/Verschieben ganzer Ordner oder mehrerer Dateien gleichzeitig fehlt. | `StorageViewOptionsDropdown.tsx`, `StorageViewTable.tsx`, `StorageFilePreview.tsx`                             |
| Benutzerverwaltung                                  | Keine allgemeine UI zum Sperren oder Löschen von Konten. Reset-Schlüssel können für bestehende lokale Konten neu ausgestellt werden.                                                                                  | Benutzerseiten unter `apps/web/app/(settings)/settings/user`                                                   |
| Desktopverbindung                                   | Beide Verbindungsbuttons nutzen denselben Ablauf; gespeicherte Vertrauensauswahl ist nur im laufenden Prozess vorhanden.                                                                                              | `packages/desktop-app/src/renderer/App.tsx`, `packages/desktop-app/src/main/setupIPC.ts`                       |

Wenn sich eine dieser Funktionen ändert, aktualisiere die betroffene Anleitung, diese Tabelle und die jeweiligen Metadaten.

## Verifikation und ihre Reichweite

Die redaktionelle Prüfung umfasst Seitenrouten, Komponenten, relevante Aktionen und Rollenregeln. Alle eingebundenen Abbildungen wurden visuell kontrolliert. Die Dokumentationsbilder wurden mit kompaktem Bildausschnitt aus dem vorhandenen statischen Storybook mit beispielhaften Formulareingaben erzeugt. Bildherkunft und Story-ID stehen im [Bildverzeichnis](bilder.md).

Prüfe nach redaktionellen Änderungen lokale Links, Bilddateien, Frontmatter, Quellpfade und Routenabdeckung. Rendere geänderte Tabellen und Bildabschnitte zur Sichtkontrolle. Funktionale Testergebnisse der App stehen getrennt in den [Testhinweisen](../../../TESTING.md) und den datierten Security-Reviews unter `docs/`.
