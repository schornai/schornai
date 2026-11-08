---
title: "Bildverzeichnis und Herkunft"
description: "Nachvollziehbare Herkunft der lokal eingebundenen Dokumentationsbilder."
lang: de
meta:
  app_urls: []
  required_role: "Keine."
  role_scope: "Dokumentation"
  prerequisites: "Keine."
  status: "verfügbar"
  last_verified: "2026-10-25"
  source_files:
    [
      "tests/visual/storybook.visual.spec.mjs",
      "tests/visual/playwright.config.mjs",
      "apps/web/.storybook/context-fixtures.ts",
    ]
---

# Bildverzeichnis und Herkunft

Alle Bilder liegen unter `assets/` und werden beim Veröffentlichen mitkopiert. Sie zeigen die Komponentenoberfläche mit Storybook-Beispieldaten. Verwende bei der Einrichtung die URLs, Modelle und Arbeitsplätze deiner eigenen Instanz.

Die ursprünglichen Abbildungen wurden am 15. und 16. Oktober 2026 aus dem lokalen Storybook mit Chrome auf macOS aufgenommen. Später ergänzte Ansichten und deren Prüfstand stehen in der Tabelle. Der Bildausschnitt umfasst die jeweils beschriebenen Bedienelemente mit einem kleinen Rand; leere Flächen der Storybook-Seite sind ausgespart. Speichere Dokumentationsaufnahmen unter `docs/de/assets/`. Die Linux-CI-Referenzbilder unter `tests/visual/__screenshots__/linux/` werden separat mit `npm run storybook:visual` geprüft und nur bei bestätigten UI-Änderungen aktualisiert.

Anzeigen wie „Beispiel“, ein unbekanntes Modell oder ein vorgegebener Uploadstatus stammen aus den Testdaten. Die begleitende Anleitung beschreibt den Bedienablauf und dessen Voraussetzungen.

| Abbildung                                                          | Story-ID                                                                                     | Herkunft / Zustand                                                                                           |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [ablage-suchindex.png](../assets/ablage-suchindex.png)             | `web-main-app-documents-documentrepositoryid-documentrepositoryeditorfeaturesindex--default` | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [agent-ablagen.png](../assets/agent-ablagen.png)                   | `web-main-agent-agenteditorroledocumentrepositorymounts--default`                            | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [agent-editor.png](../assets/agent-editor.png)                     | `web-main-agent-agenteditor--mode-update`                                                    | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [agent-mcp.png](../assets/agent-mcp.png)                           | `web-main-agent-agenteditorrolemcps--default`                                                | Neue Aufnahme aus lokalem Storybook; Name und URL mit fiktivem MCP-Beispiel ausgefüllt.                      |
| [agent-modell.png](../assets/agent-modell.png)                     | `web-main-agent-agenteditorsettingsmodel--default`                                           | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [agent-rollen.png](../assets/agent-rollen.png)                     | `web-main-agent-agenteditorroles--default`                                                   | Linux-ARM64-Storybook, hell, Deutsch; Rollenübersicht (2026-11-08).                                          |
| [agent-unterstuetzung.png](../assets/agent-unterstuetzung.png)     | `web-main-agent-agenteditordocs--default`                                                    | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [agent-web.png](../assets/agent-web.png)                           | `web-main-agent-agenteditorrolewebaccess--fetch-whitelist`                                   | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [agenten.png](../assets/agenten.png)                               | `web-main-agent-agentlist--view-table`                                                       | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [anmeldung.png](../assets/anmeldung.png)                           | `web-signin-passwordsignin--default`                                                         | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [arbeitsplatz-anlegen.png](../assets/arbeitsplatz-anlegen.png)     | `web-settings-settings-workspace-workspacecreator--default`                                  | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [arbeitsplatz-sso.png](../assets/arbeitsplatz-sso.png)             | `web-settings-settings-workspace-workspaceeditorssomappings--default`                        | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [arbeitsplatz.png](../assets/arbeitsplatz.png)                     | `web-main-workspace-workspacecard--default`                                                  | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [aufgaben.png](../assets/aufgaben.png)                             | `web-settings-tasks-tasktable--default`                                                      | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [aufnahme.png](../assets/aufnahme.png)                             | `web-audiorecorder--preview`                                                                 | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [benutzer-anlegen.png](../assets/benutzer-anlegen.png)             | `web-settings-settings-user-createuser--default`                                             | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [benutzerliste.png](../assets/benutzerliste.png)                   | `web-settings-settings-user-userlist--default`                                               | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [berechtigungen.png](../assets/berechtigungen.png)                 | `web-settings-settings-user-userid-usereditpermissionlisttable--default`                     | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [chat-eingabe.png](../assets/chat-eingabe.png)                     | `web-main-agent-agentid-activityid-chatcomposemessage--message-paused`                       | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [chat-freigabe.png](../assets/chat-freigabe.png)                   | `web-main-agent-agentid-activityid-chattoolapprovalstoragewritefile--opened`                 | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [chat-stapel.png](../assets/chat-stapel.png)                       | `web-main-agent-agentid-activityid-chatcomposemessagebatch--default`                         | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [chat-websuche.png](../assets/chat-websuche.png)                   | `web-main-agent-agentid-activityid-chatmessageparttoolwebsearch--search`                     | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [datei-optionen.png](../assets/datei-optionen.png)                 | `web-storageviewoptionsdropdown--menu-opened`                                                | Neue kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                 |
| [dateien.png](../assets/dateien.png)                               | `web-storageview--success`                                                                   | Neue kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                 |
| [farbvorschau.png](../assets/farbvorschau.png)                     | `web-settings-settings-theme-colorpickerhueslider--default`                                  | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [favoriten.png](../assets/favoriten.png)                           | `web-main-dashboardfavorites--default`                                                       | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [feedback.png](../assets/feedback.png)                             | `web-feedback-errorlogs--populated`                                                          | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [navigation.png](../assets/navigation.png)                         | `web-main-sidebar--default`                                                                  | Neue kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                 |
| [passwort-zuruecksetzen.png](../assets/passwort-zuruecksetzen.png) | `web-signin-resetpassword--default`                                                          | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [profil.png](../assets/profil.png)                                 | `web-settings-editoravatar--default`                                                         | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [sso-anbieter.png](../assets/sso-anbieter.png)                     | `web-settings-settings-sso-addssoprovider--dialog-opened`                                    | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [sso-attribute.png](../assets/sso-attribute.png)                   | `web-settings-settings-sso-editsamlattributemapping--default`                                | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [transkript-bearbeiten.png](../assets/transkript-bearbeiten.png)   | `web-transcription-transcriptionsegmenteditor--default`                                      | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [transkription.png](../assets/transkription.png)                   | `web-transcription-storagefilepreviewtranscription--file-content-segments-multiple`          | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [transkriptor-prompt.png](../assets/transkriptor-prompt.png)       | `web-main-app-transcribe-transcriberid-transcribereditorprompt--default`                     | Neue Aufnahme aus lokalem Storybook; Prompt mit Fachbegriffen für eine Beispielbesprechung ausgefüllt.       |
| [transkriptoren.png](../assets/transkriptoren.png)                 | `web-main-app-transcribe-transcriberlist--view-table`                                        | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [verlauf.png](../assets/verlauf.png)                               | `web-main-activity-activitylisttable--default`                                               | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [volltextsuche.png](../assets/volltextsuche.png)                   | `web-storagesearchresult--default`                                                           | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [xrag.png](../assets/xrag.png)                                     | `web-settings-settings-xrag-xragupload--default`                                             | Kompakte Aufnahme aus lokalem Storybook, hell, Deutsch.                                                      |
| [modelle-lokal.png](../assets/modelle-lokal.png)                   | `web-settings-models-modelsoverview--cards`                                                  | Gemeinsame Übersicht mit Storybook-Beispieldaten, Deutsch, hell; aufgenommen am 16. Oktober 2026.            |
| [modelle-extern.png](../assets/modelle-extern.png)                 | `web-settings-models-modelsoverview--grouped-by-origin`                                      | Tabellenansicht nach intern/extern, Storybook-Beispieldaten, Deutsch, hell; aufgenommen am 16. Oktober 2026. |
| [cluster.png](../assets/cluster.png)                               | `web-settings-cluster-clusteroverview--default`                                              | Übersicht mit drei Verwaltungszielen, Deutsch, hell; am 25. Oktober 2026 mit Code und Story abgeglichen.     |
| [service.png](../assets/service.png)                               | `web-settings-service-servicedashboard--default`                                             | Maschinenkacheln mit laufendem und offline befindlichem Rechner, Deutsch, hell; am 25. Oktober 2026 geprüft. |
| [artefakte.png](../assets/artefakte.png)                           | `web-settings-artifacts-artifactdashboard--attachments`                                      | Artefakte als Kacheln mit Storybook-Beispieldaten, Deutsch, hell; am 25. Oktober 2026 geprüft.               |

## Bilder aktualisieren

Prüfe zuerst den zugehörigen Ablauf im aktuellen Code beziehungsweise in der laufenden Oberfläche. Übernimm danach eine geeignete visuelle Referenz oder erstelle eine neue Aufnahme mit unkritischen Beispieldaten. Wähle den Bildausschnitt direkt bei der Aufnahme so, dass er die relevante Komponente vollständig mit einem kleinen Rand zeigt. Vermeide leere Vollseitenflächen und angeschnittene Bedienelemente. Kontrolliere Bildinhalt, Sprache, sichtbare Fehlermeldungen, Alternativtext und die Darstellung in einer gerenderten Anleitung. Passe dieses Verzeichnis sowie die betroffene Anleitung an.
