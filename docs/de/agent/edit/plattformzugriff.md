---
title: "schorn.ai über Plattformwerkzeuge und MCP verwenden"
description: "Plattformzugriff für Agenten konfigurieren und externe KI-Anwendungen per OAuth verbinden."
lang: de
meta:
  app_urls:
    [
      "/agent/[agentId]/edit?view=roles",
      "/mcp",
      "/mcp/editor",
      "/mcp/workspace",
      "/mcp/admin",
      "/oauth/authorize",
    ]
  required_role: "Benutzer:in bis globale Administrator:in, abhängig vom Werkzeug. Agentenkonfiguration: Workspace-Administrator:in."
  role_scope: "Eigenes Konto, berechtigte Workspaces oder ganze Instanz."
  prerequisites: "Aktuelle Datenbankmigrationen; für Chats und Dateioperationen ein erreichbarer Realtime-Dienst und passende Worker. Externe Clients benötigen Streamable HTTP und OAuth mit PKCE (S256)."
  status: "verfügbar"
  last_verified: "2026-11-07"
  source_files:
    - "apps/web/app/(main)/agent/_components/AgentEditorRolePlatformAccess.tsx"
    - "apps/web/app/(main)/agent/_components/AgentEditorRoleTools.tsx"
    - "apps/web/app/(main)/agent/_components/AgentEditorRole.tsx"
    - "apps/web/lib/platformMcp/handleRequest.ts"
    - "apps/web/lib/platformMcp/authenticate.ts"
    - "apps/web/app/oauth/authorize/_actions/authorizePlatformMcp.ts"
    - "packages/database/src/mcp/platformAccess.ts"
    - "packages/database/src/mcp/platformAgentPolicy.ts"
    - "apps/web/app/(main)/agent/[agentId]/[activityId]/_components/PlatformToolPreview.tsx"
    - "packages/realtime/src/platform/tools.ts"
    - "packages/realtime/src/platform/storageTools.ts"
    - "packages/realtime/src/platform/chatTools.ts"
    - "packages/realtime/src/platform/adminTools.ts"
    - "packages/realtime/src/platform/settingsTools.ts"
    - "packages/realtime/src/platform/profileTools.ts"
    - "packages/realtime/src/platform/workflowTools.ts"
    - "packages/realtime/src/platform/monitoringTools.ts"
    - "tests/fixtures/platform-mcp-coverage.json"
---

# schorn.ai über Plattformwerkzeuge und MCP verwenden

Mit Plattformwerkzeugen kann eine KI schorn.ai-Daten lesen und erlaubte Aktionen ausführen. Interne Agenten und externe MCP-Clients verwenden denselben Werkzeugkatalog und dieselben fachlichen Berechtigungen.

## Im Agenten-Editor aktivieren

1. Öffne **Agent bearbeiten → Rollen** und die gewünschte Rolle.
2. Wähle unter **Werkzeuge** den Eintrag **schorn.ai Plattform Zugang**.
3. Es erscheint der Tab **Plattformzugriff**. Dort kannst du das Werkzeug ein- oder ausschalten und für jede Stufe **Automatisch**, **Freigabe erforderlich** oder **Aus** wählen.
4. Speichere den Agenten.

Die Voreinstellung für neu hinzugefügten Plattformzugriff ist:

| Stufe                   | Verhalten             |
| ----------------------- | --------------------- |
| Benutzer                | Automatisch           |
| Editor                  | Automatisch           |
| Workspace-Administrator | Freigabe erforderlich |
| Globaler Administrator  | Aus                   |

Die Regeln gelten pro Stufe unabhängig und auch für lesende Aktionen. **Automatisch** führt erlaubte Aufrufe ohne Rückfrage aus, einschließlich schreibender und löschender Aktionen. **Freigabe erforderlich** wartet auf deine Entscheidung. **Aus** entfernt die Werkzeuge dieser Stufe; eine Freigabe kann sie nicht wieder einschalten. Das Erteilen einer Werkzeugfreigabe über `platform_chat_tool_approval` benötigt auch bei automatischen Benutzeraktionen eine Bestätigung, damit ein Agent Freigaben nicht selbst umgehen kann. Ablehnungen dürfen automatisch erfolgen. Kombinierte Werkzeuge richten sich nach der tatsächlich angeforderten Aktion: Ein Theme-Upload benötigt zum Beispiel die Admin-Regel, ein eigenes Profilbild die Benutzer-Regel.

Bestehende Agenten ohne diese Regeln behalten ihre bisherige Zugriffsgrenze; die bisher verfügbaren Stufen verlangen eine Freigabe. Es werden keine zusätzlichen automatischen Schreibrechte vergeben. Die Regeln kannst du jederzeit im Plattformzugriff-Tab anpassen.

Es gelten immer zusätzlich die Berechtigungen der ausführenden Person für die konkrete Ressource. Eine Einstellung oder Freigabe verleiht keine neuen Rechte. Die unabhängigen Regeln im Agenten ändern nicht die kumulativen externen MCP-Endpunkte.

Im Chat zeigen Plattformaktionen verständliche Titel, Status und aufklappbare Vorschauen. Agenten und Dokumentenablagen erscheinen in ihrer Info-Ansicht, Dateiaktionen mit Pfad, Dateikacheln und der vorhandenen Datei-/Transkriptvorschau samt Link zur Datei. Vor einer Freigabe siehst du die geplanten Daten; danach das Ergebnis. Die Vorschauen zeigen Momentaufnahmen. Agenten- und Ablagekarten enthalten keine Bearbeitungsaktionen; Dateien verwenden die vorhandenen Dateiaktionen mit deren Berechtigungsprüfung. Passwörter und Zugangsdaten werden darin ausgeblendet; ausgegebene einmalige Reset-Schlüssel und Zugangsmails bleiben für ihre Übergabe sichtbar.

## Externe KI-Anwendung verbinden

Trage in deinem MCP-Client eine der folgenden Adressen mit der Domain deiner Instanz ein:

| Endpunkt                          | Stufe                   | Zusätzliche Möglichkeiten                                                                                |
| --------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `https://DEINE-BOX/mcp`           | Benutzer                | Ressourcen auflisten, Dokumente lesen und suchen, Chats starten und lesen, eigene Aktivitäten bearbeiten |
| `https://DEINE-BOX/mcp/editor`    | Editor                  | Dateien schreiben, hochladen, kopieren, verschieben, löschen und verarbeiten                             |
| `https://DEINE-BOX/mcp/workspace` | Workspace-Administrator | Agenten, Ablagen und Transkriptoren verwalten; Workspace-Beschreibung und Dokumentation bearbeiten       |
| `https://DEINE-BOX/mcp/admin`     | Globaler Administrator  | Workspaces anlegen, Benutzerrechte, Modelle, Provider-Verbindungen und Artefakte verwalten               |

Der Client erkennt über die MCP-Antwort die OAuth-Anmeldung. Melde dich mit deinem schorn.ai-Konto an und prüfe auf der Freigabeseite den Namen der Anwendung, die Zugriffsstufe, den MCP-Endpunkt und die Rückleitungsadresse. **Ablehnen** erteilt keinen Zugriff. **Freigeben** erlaubt der Anwendung die Werkzeuge dieser Stufe innerhalb deiner bestehenden Berechtigungen.

Eine Freigabe ist an genau einen Endpunkt gebunden. Ein Token für `/mcp` funktioniert nicht bei `/mcp/admin`. Auch ein globaler Administrator gibt am Benutzer-Endpunkt nur Benutzerzugriff frei. Beim Start eines weiteren Agenten bleibt diese Begrenzung erhalten.

Das Zugriffstoken ist eine Stunde gültig. Danach muss der Client erneut eine Freigabe einholen; Refresh-Tokens werden derzeit nicht ausgegeben. Clients können ein Token über den in den OAuth-Metadaten angegebenen Widerrufsendpunkt zurückziehen. MCP-Tokens sind keine Supabase-Sitzungstokens und funktionieren nicht direkt an der Datenbank-API. Kontosperren und aktuelle Rollen werden bei externen MCP-Anfragen geprüft.

Externe Clients entscheiden selbst, wann sie zusätzlich vor einzelnen Werkzeugaufrufen nachfragen. Die Bestätigung im schorn.ai-Chat gilt für interne Plattformwerkzeuge.

## Voraussetzungen und Grenzen

- Die Migration `platform_mcp_oauth` muss installiert sein. Die Anwendung benötigt ihre vorhandene Supabase- und Realtime-Serverkonfiguration; es ist kein separater MCP-Port erforderlich.
- Produktive Rückleitungsadressen müssen HTTPS verwenden. Für lokale Clients sind HTTP-Adressen auf `localhost`, `127.0.0.1` und `::1` erlaubt. Fragmente und Zugangsdaten in der URL werden abgewiesen.
- Dateiwerkzeuge akzeptieren eine `repositoryId` oder eine `storage`-Referenz aus `platform_activity_create`. Beide Angaben gleichzeitig sind ungültig. Die Varianten `platform_activity_*` erlauben Benutzer:innen eigene bzw. freigegebene Chat- und Transkriptionsdateien zu bearbeiten, aber keine Dokumentenablagen. Textänderungen verwenden Dateisperren, Konfliktprüfung und Indexierung wie der Editor. Gib bei einer Änderung den zuvor gelesenen Text als `expectedText` mit.
- Der Base64-Dateiupload ist auf 1 MiB begrenzt. Größere Dateien können über die von `platform_file_upload_url` bzw. `platform_activity_file_upload_url` ausgegebene Uploadadresse übertragen werden; anschließend startet das passende Verarbeitungswerkzeug die Extraktion oder Transkription. Profilbilder, Logos und XRAG-Pakete lassen sich mit `platform_asset_upload` bis 10 MiB oder mit `platform_asset_upload_url` größer übertragen. Die Suche verwendet den aktivierten Schlüsselwortindex und bei `semantic` zusätzlich den konfigurierten Embedding-Index.
- Chat-Aufrufe kehren nach dem Einreihen zurück. Lies anschließend mit `platform_chat_read` den Status und die Antworten. Ein beschäftigter Chat nimmt keinen weiteren Aufruf an.
- Benutzeranlage, Reset-Schlüssel und Passwortsetzen sind als Werkzeuge verfügbar. Reset-Schlüssel und Passwörter sind vertrauliche Werkzeugdaten; interne Chats können Ein- und Ausgaben im Verlauf speichern. SSO-Passwörter verwaltet weiterhin der Identitätsanbieter.
- Theme-Änderungen aus internen Agenten werden beim nächsten Laden der Seite gelesen. `platform_theme_update` ersetzt Farben/Logos und beide Vorlagengruppen zusammen; lies zuvor die gespeicherten Werte mit `platform_theme_get`.
- SSO-Verwaltung verwendet denselben einzelnen SAML-Anbieter wie die Oberfläche. Ein MCP-Aufruf ersetzt weder die persönliche SSO-Anmeldung noch die Zustimmung bei einem externen OAuth-Anbieter.
- Audioaufnahme benötigt Mikrofonzugriff im Client. MCP kann die aufgenommene Datei hochladen und transkribieren; der Server kann kein Mikrofon eines entfernten Clients einschalten.
- Lokale Installation, OS-Dienststeuerung der CLI/Mac-App und Browserdarstellung (Sprache, Hell/Dunkel) gehören zum jeweiligen Client beziehungsweise Rechner. Der Plattformserver hat dafür keinen Zugriff auf das Betriebssystem oder den Browser. Die zentral gemeldeten Dienstzustände sind über `platform_services_status` verfügbar.
- Anmeldung und OAuth-Zustimmung bleiben Protokollschritte vor dem Werkzeugzugriff. Zum Abmelden einer MCP-Verbindung verwendet der Client den OAuth-Widerrufsendpunkt; eine Browsersitzung ist davon unabhängig.

## Zugehörige Werkzeuge

Die folgenden Namen sind die tatsächlichen MCP-Werkzeugnamen. Jede höhere Stufe enthält auch alle Werkzeuge der niedrigeren Stufen. Der jeweilige Workspace muss zusätzlich zugänglich sein.

<!-- platform-tool-catalog -->

| Werkzeug                                         | Mindeststufe            | Zweck                                                                                | Zusätzliche Berechtigung / Grenze                                                                                           |
| ------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `platform_activities_list`                       | Benutzer                | Eigenen Verlauf lesen                                                                | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_activity_create`                       | Benutzer                | Chat- oder Transkriptionsaktivität anlegen                                           | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_activity_delete`                       | Benutzer                | Aktivität aus dem Verlauf entfernen                                                  | Eigenes Konto bzw. Zugriff auf die betroffene Ressource; entfernt Verlaufseinträge, stoppt keine laufende Aufgabe           |
| `platform_activity_file_delete`                  | Benutzer                | Datei oder Ordner einschließlich Index löschen (Aktivitätsdateien)                   | Nur zugängliche Chat-/Transkriptionsdateien; keine Ablagen                                                                  |
| `platform_activity_file_process`                 | Benutzer                | Extraktion, Indexierung oder Transkription starten (Aktivitätsdateien)               | Nur zugängliche Chat-/Transkriptionsdateien; keine Ablagen                                                                  |
| `platform_activity_file_transfer`                | Benutzer                | Datei kopieren, verschieben oder umbenennen (Aktivitätsdateien)                      | Nur zugängliche Chat-/Transkriptionsdateien; keine Ablagen                                                                  |
| `platform_activity_file_upload`                  | Benutzer                | Datei bis 1 MiB als Base64 hochladen und verarbeiten (Aktivitätsdateien)             | Nur zugängliche Chat-/Transkriptionsdateien; keine Ablagen                                                                  |
| `platform_activity_file_upload_url`              | Benutzer                | Uploadadresse für größere Dateien erhalten (Aktivitätsdateien)                       | Nur zugängliche Chat-/Transkriptionsdateien; keine Ablagen                                                                  |
| `platform_activity_file_write`                   | Benutzer                | Textdatei anlegen oder mit Konfliktprüfung ändern (Aktivitätsdateien)                | Nur zugängliche Chat-/Transkriptionsdateien; keine Ablagen                                                                  |
| `platform_activity_folder_create`                | Benutzer                | Ordner anlegen (Aktivitätsdateien)                                                   | Nur zugängliche Chat-/Transkriptionsdateien; keine Ablagen                                                                  |
| `platform_activity_transcription_segment_update` | Benutzer                | Transkriptsegment korrigieren oder prüfen (Aktivitätsdateien)                        | Nur zugängliche Chat-/Transkriptionsdateien; keine Ablagen                                                                  |
| `platform_activity_update`                       | Benutzer                | Aktivität umbenennen oder anheften                                                   | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_agent_get`                             | Benutzer                | Eine Agentenkonfiguration lesen                                                      | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_agents_list`                           | Benutzer                | Agenten und Konfigurationen lesen                                                    | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_asset_upload`                          | Benutzer                | Profilbild, Logo oder XRAG-Paket bis 10 MiB hochladen                                | Eigenes Profilbild: Benutzer; Logos, XRAG und fremde Profilbilder: Admin                                                    |
| `platform_asset_upload_url`                      | Benutzer                | Uploadadresse für Profilbild, Logo oder XRAG-Paket erhalten                          | Eigenes Profilbild: Benutzer; Logos, XRAG und fremde Profilbilder: Admin                                                    |
| `platform_chat_abort`                            | Benutzer                | Generierung stoppen und Nachrichten pausieren                                        | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_chat_draft_files`                      | Benutzer                | Anhänge eines pausierten Entwurfs ersetzen                                           | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_chat_draft_update`                     | Benutzer                | Pausierten Entwurf anlegen, ändern oder entfernen                                    | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_chat_drafts`                           | Benutzer                | Nachrichtenstapel lesen                                                              | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_chat_file_select`                      | Benutzer                | Datei für einen Chat auswählen oder in den Chat kopieren                             | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_chat_read`                             | Benutzer                | Chatnachrichten und Zustand lesen                                                    | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_chat_send`                             | Benutzer                | Nachricht mit Anhängen und optionalem Nachdenken senden                              | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_chat_submit_batch`                     | Benutzer                | Pausierte Nachrichten als Stapel absenden                                            | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_chat_tool_approval`                    | Benutzer                | Exakte offene Werkzeuganfrage freigeben oder ablehnen                                | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_documents_search`                      | Benutzer                | Volltext- und semantische Suche                                                      | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_favorites_get`                         | Benutzer                | Eigene Favoriten lesen                                                               | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_favorites_update`                      | Benutzer                | Favoriten und Sidebar-Sichtbarkeit speichern                                         | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_file_download`                         | Benutzer                | Kurzlebige Downloadadresse für Originaldatei erhalten                                | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_file_read`                             | Benutzer                | Extrahierten Inhalt, Textversionen und Transkript lesen                              | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_files_list`                            | Benutzer                | Dateien und Ordner auflisten                                                         | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_models_list`                           | Benutzer                | Modellmetadaten ohne Zugangsschlüssel lesen                                          | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_permissions_get`                       | Benutzer                | Eigene Berechtigungen und Werkzeugstufe lesen                                        | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_personal_mcp_connections`              | Benutzer                | Eigene externe OAuth-Verbindungen auflisten                                          | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_personal_mcp_disconnect`               | Benutzer                | Eigene externe OAuth-Verbindung trennen                                              | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_profile_avatar_update`                 | Benutzer                | Eigenes Profilbild setzen oder zurücksetzen                                          | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_profile_get`                           | Benutzer                | Eigenes Profil und Anmeldemethode lesen                                              | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_profile_name_update`                   | Benutzer                | Eigenen Profilnamen ändern                                                           | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_profile_password_reset`                | Benutzer                | Passwort mit gültigem Reset-Schlüssel setzen                                         | Eigenes E-Mail-Konto; fremdes Konto zusätzlich Adminstufe und globale Adminrechte. Immer gültiger Reset-Schlüssel; kein SSO |
| `platform_repositories_list`                     | Benutzer                | Dokumentenablagen lesen                                                              | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_transcribers_list`                     | Benutzer                | Transkriptoren lesen                                                                 | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_view_preferences_get`                  | Benutzer                | Gruppierung, Sortierung und Ansicht lesen                                            | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_view_preferences_update`               | Benutzer                | Gruppierung, Sortierung und Ansicht speichern                                        | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_workspaces_list`                       | Benutzer                | Zugängliche Workspaces lesen                                                         | Eigenes Konto bzw. Zugriff auf die betroffene Ressource                                                                     |
| `platform_file_delete`                           | Editor                  | Datei oder Ordner einschließlich Index löschen                                       | Editor im betroffenen Workspace                                                                                             |
| `platform_file_process`                          | Editor                  | Extraktion, Indexierung oder Transkription starten                                   | Editor im betroffenen Workspace                                                                                             |
| `platform_file_transfer`                         | Editor                  | Datei kopieren, verschieben oder umbenennen                                          | Editor im betroffenen Workspace                                                                                             |
| `platform_file_upload`                           | Editor                  | Datei bis 1 MiB als Base64 hochladen und verarbeiten                                 | Editor im betroffenen Workspace                                                                                             |
| `platform_file_upload_url`                       | Editor                  | Uploadadresse für größere Dateien erhalten                                           | Editor im betroffenen Workspace                                                                                             |
| `platform_file_write`                            | Editor                  | Textdatei anlegen oder mit Konfliktprüfung ändern                                    | Editor im betroffenen Workspace                                                                                             |
| `platform_folder_create`                         | Editor                  | Ordner anlegen                                                                       | Editor im betroffenen Workspace                                                                                             |
| `platform_transcription_segment_update`          | Editor                  | Transkriptsegment korrigieren oder prüfen                                            | Editor im betroffenen Workspace                                                                                             |
| `platform_agent_create`                          | Workspace-Administrator | Agent anlegen                                                                        | Administrator im betroffenen Workspace                                                                                      |
| `platform_agent_delete`                          | Workspace-Administrator | Agent löschen                                                                        | Administrator im betroffenen Workspace                                                                                      |
| `platform_agent_update`                          | Workspace-Administrator | Agent einschließlich Rollen und Werkzeugen ändern                                    | Administrator im betroffenen Workspace                                                                                      |
| `platform_repository_create`                     | Workspace-Administrator | Ablage anlegen                                                                       | Administrator im betroffenen Workspace                                                                                      |
| `platform_repository_delete`                     | Workspace-Administrator | Ablage löschen                                                                       | Administrator im betroffenen Workspace                                                                                      |
| `platform_repository_update`                     | Workspace-Administrator | Ablage und Indexkonfiguration ändern                                                 | Administrator im betroffenen Workspace                                                                                      |
| `platform_transcriber_create`                    | Workspace-Administrator | Transkriptor anlegen                                                                 | Administrator im betroffenen Workspace                                                                                      |
| `platform_transcriber_delete`                    | Workspace-Administrator | Transkriptor löschen                                                                 | Administrator im betroffenen Workspace                                                                                      |
| `platform_transcriber_update`                    | Workspace-Administrator | Transkriptor und Verarbeitung konfigurieren                                          | Administrator im betroffenen Workspace                                                                                      |
| `platform_workspace_documentation_update`        | Workspace-Administrator | Workspace-Dokumentation ändern                                                       | Administrator im betroffenen Workspace                                                                                      |
| `platform_workspace_update`                      | Workspace-Administrator | Workspace-Name und Beschreibung ändern                                               | Administrator im betroffenen Workspace                                                                                      |
| `platform_artifact_delete`                       | Globaler Administrator  | Artefakt und Katalogeintrag entfernen                                                | Globale Administratorrechte                                                                                                 |
| `platform_artifact_publish`                      | Globaler Administrator  | Hochgeladenes XRAG-Paket veröffentlichen                                             | Globale Administratorrechte                                                                                                 |
| `platform_artifacts_list`                        | Globaler Administrator  | Veröffentlichte Artefakte lesen                                                      | Globale Administratorrechte                                                                                                 |
| `platform_connection_delete`                     | Globaler Administrator  | Gemeinsame Verbindung löschen                                                        | Globale Administratorrechte                                                                                                 |
| `platform_connection_save`                       | Globaler Administrator  | Gemeinsame Verbindung anlegen oder ändern                                            | Globale Administratorrechte                                                                                                 |
| `platform_connections_list`                      | Globaler Administrator  | Gemeinsame Verbindungen ohne Geheimnisse lesen                                       | Globale Administratorrechte                                                                                                 |
| `platform_model_connection_update`               | Globaler Administrator  | Modellverbindung ändern                                                              | Globale Administratorrechte                                                                                                 |
| `platform_model_create`                          | Globaler Administrator  | Externes Modell registrieren                                                         | Globale Administratorrechte                                                                                                 |
| `platform_model_delete`                          | Globaler Administrator  | Modellregistrierung löschen                                                          | Globale Administratorrechte                                                                                                 |
| `platform_model_metadata_update`                 | Globaler Administrator  | Modellname und Beschreibung ändern                                                   | Globale Administratorrechte                                                                                                 |
| `platform_models_discover`                       | Globaler Administrator  | Verfügbare Modelle eines Providers ermitteln                                         | Globale Administratorrechte                                                                                                 |
| `platform_services_status`                       | Globaler Administrator  | Maschinen, Dienstzustand und Auslastung lesen                                        | Globale Administratorrechte                                                                                                 |
| `platform_sso_create`                            | Globaler Administrator  | SAML-Anbieter aus Metadaten anlegen                                                  | Globale Administratorrechte                                                                                                 |
| `platform_sso_delete`                            | Globaler Administrator  | SAML-Anbieter entfernen                                                              | Globale Administratorrechte                                                                                                 |
| `platform_sso_get`                               | Globaler Administrator  | SAML-Anbieter und Attributzuordnung lesen                                            | Globale Administratorrechte                                                                                                 |
| `platform_sso_mapping_update`                    | Globaler Administrator  | SAML-Attribute zuordnen                                                              | Globale Administratorrechte                                                                                                 |
| `platform_sso_metadata`                          | Globaler Administrator  | Service-Provider-Metadaten als XML abrufen                                           | Globale Administratorrechte                                                                                                 |
| `platform_tasks_list`                            | Globaler Administrator  | Aufgabentypen und Zustände lesen                                                     | Globale Administratorrechte                                                                                                 |
| `platform_theme_get`                             | Globaler Administrator  | Gespeicherte Farben, Logos und Nachrichtenvorlagen lesen                             | Globale Administratorrechte                                                                                                 |
| `platform_theme_update`                          | Globaler Administrator  | Theme, Begrüßung und Zugangsvorlagen gemeinsam speichern                             | Globale Administratorrechte                                                                                                 |
| `platform_user_admin_update`                     | Globaler Administrator  | Globale Administratorrolle ändern                                                    | Globale Administratorrechte                                                                                                 |
| `platform_user_avatar_update`                    | Globaler Administrator  | Profilbild einer anderen Person ändern                                               | Globale Administratorrechte                                                                                                 |
| `platform_user_create`                           | Globaler Administrator  | E-Mail-Konto mit einmaligem Einrichtungsschlüssel anlegen                            | Globale Administratorrechte; Ergebnis enthält einen vertraulichen Reset-Schlüssel                                           |
| `platform_user_name_update`                      | Globaler Administrator  | Profilnamen einer Person ändern                                                      | Globale Administratorrechte                                                                                                 |
| `platform_user_permission_update`                | Globaler Administrator  | Workspace-Mitgliedschaft ändern                                                      | Globale Administratorrechte                                                                                                 |
| `platform_user_reset_key`                        | Globaler Administrator  | Einmaligen Reset-Schlüssel neu ausstellen                                            | Globale Administratorrechte; Ergebnis enthält einen vertraulichen Reset-Schlüssel                                           |
| `platform_users_list`                            | Globaler Administrator  | Benutzerverzeichnis lesen                                                            | Globale Administratorrechte                                                                                                 |
| `platform_workspace_autojoin_update`             | Globaler Administrator  | Automatischen Workspace-Beitritt einstellen                                          | Globale Administratorrechte                                                                                                 |
| `platform_workspace_create`                      | Globaler Administrator  | Workspace anlegen                                                                    | Globale Administratorrechte                                                                                                 |
| `platform_workspace_sso_mapping_update`          | Globaler Administrator  | SAML-Gruppen auf Workspace-Rollen abbilden                                           | Globale Administratorrechte                                                                                                 |
| `platform_workspace_users`                       | Globaler Administrator  | Benutzerverzeichnis mit Workspace-Rollen lesen                                       | Globale Administratorrechte                                                                                                 |
| `platform_user_get`                              | Globaler Administrator  | Profil, globale Administratorrolle und Workspace-Mitgliedschaften einer Person lesen | Globale Administratorrechte                                                                                                 |

### Zugangsmail und Agentenkopien

`platform_user_access_message` erstellt als globaler Administrator einen Mailentwurf mit Betreff, Text und Reset-URL. Übergib E-Mail-Adresse, optional Vor- und Nachnamen sowie `resetKey` und `expires` aus `platform_user_create` beziehungsweise `platform_user_reset_key` (`passwordResetKey` als `resetKey`). `applicationUrl` ist die öffentliche URL dieser schorn.ai-Instanz. `language` (Standard `de`) und `timeZone` (Standard `UTC`, beispielsweise `Europe/Vienna`) bestimmen die Ausgabe. Gespeicherte Vorlagen, Sprach-Fallback und Platzhalter entsprechen der Oberfläche. Fehlende oder ungültige Vorlagen verwenden dieselben Standardtexte. Der Entwurf enthält den vertraulichen Schlüssel; das Werkzeug versendet keine Nachricht und stellt keinen neuen Schlüssel aus.

`platform_agent_create` akzeptiert zusätzlich `copyFromAgentId`. Lies zuerst den Quellagenten, ändere den Namen und gegebenenfalls die Ablageeinbindungen und übergib die angepasste Konfiguration zusammen mit der Quell-ID. Für Quelle und Ziel sind Workspace-Administratorrechte erforderlich. Behalte Rollen-IDs, MCP-IDs und MCP-URLs bei; `null` als Headerwert übernimmt das hinterlegte Geheimnis ausschließlich serverseitig. Geänderte URLs benötigen neue Zugangsdaten. Die Antwort enthält nur die neue Agenten-ID, keine Geheimnisse.

Die Werkzeuge `platform_agent_create` und `platform_agent_update` speichern die Freigaberegeln in `roles[].toolPlatformAccess.approvals` mit den Schlüsseln `user`, `editor`, `workspace`, `admin` und den Werten `auto`, `ask`, `off`. Die Agentenkonfiguration bleibt Workspace-Administratoren vorbehalten; die Regeln gewähren keine zusätzlichen Benutzerrechte.
