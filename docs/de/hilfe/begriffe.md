---
title: "Begriffe und frühere Bezeichnungen"
description: "Die wichtigsten Begriffe der schorn.ai-Oberfläche nachschlagen."
lang: de
meta:
  app_urls: []
  required_role: "Keine."
  role_scope: "Allgemeines Nachschlagewerk"
  prerequisites: "Keine."
  status: "verfügbar"
  last_verified: "2026-10-15"
  source_files:
    [
      "apps/web/app/i18n/locales/de/common.json",
      "apps/web/app/i18n/locales/de/settings.json",
      "packages/service/src/config.ts",
      "apps/web/app/i18n/locales/de/agent.json",
      "apps/web/app/i18n/locales/de/documentRepository.json",
      "apps/web/app/i18n/locales/de/transcriber.json",
    ]
---

# Begriffe und frühere Bezeichnungen

| Begriff                           | Bedeutung                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Instanz / Box**                 | Die schorn.ai-Umgebung deiner Organisation mit eigener Adresse, Konfiguration und verfügbaren Ressourcen.          |
| **Arbeitsplatz / Workspace**      | Organisatorischer Bereich für Agenten, Ablagen und Transkriptoren samt Rollen. Früher „Organisation“.              |
| **Agent**                         | Konfigurierter KI-Assistent für eine oder mehrere Aufgaben. Früher „Chatbot“.                                      |
| **Agentenrolle**                  | Teilkonfiguration eines Agenten mit Prompt, Modelloptionen und Werkzeugen.                                         |
| **Arbeitsplatzrolle**             | Zugriffsrecht einer Person: Benutzer:in, Bearbeiter:in oder Arbeitsplatzadministrator:in.                          |
| **Administrator:in**              | Globale Verwaltungsrolle für die gesamte Instanz.                                                                  |
| **Prompt**                        | Anweisungen an ein Modell; bei Transkriptoren Hinweise zur Erkennung von Begriffen und Schreibweisen.              |
| **Modell / LLM**                  | Sprachmodell für Textantworten; je nach Modell auch für Bildauswertung oder Werkzeugaufrufe.                       |
| **Nachdenken**                    | Einstellung zur vertieften Verarbeitung, sofern das Modell sie unterstützt; kann optional oder verpflichtend sein. |
| **Kontextgröße**                  | Umfang der Informationen, die ein Modell in einem Verarbeitungsschritt berücksichtigen kann.                       |
| **Token**                         | Verarbeitungseinheit eines Textmodells: ein Wort, Wortteil oder Satzzeichen.                                       |
| **Aktivität**                     | Ein im Verlauf verzeichneter Arbeitsvorgang, etwa ein Chat oder eine Transkription.                                |
| **Nachrichtenstapel**             | Mehrere vorbereitete Nachrichten innerhalb eines Chats, die nacheinander verarbeitet werden.                       |
| **Favorit**                       | Persönliche Markierung einer Ressource für den schnellen Zugriff.                                                  |
| **Anheften**                      | Persönliche Hervorhebung eines konkreten Verlaufseintrags.                                                         |
| **Dokumentenablage / Repository** | Gemeinsamer Dateibereich und mögliche Wissensquelle für Agenten.                                                   |
| **Gesprächsdateien**              | Dateien eines einzelnen Chats, getrennt von gemeinsamen Ablagen.                                                   |
| **Textextraktion**                | Verarbeitung einer Datei, um ihren Inhalt für Vorschau, Suche und KI verfügbar zu machen.                          |
| **Suchindex**                     | Aufbereitung von Inhalten für ein Suchverfahren.                                                                   |
| **Schlüsselwortsuche**            | Suche nach Wörtern und konkreten Bezeichnungen in verarbeiteten Inhalten.                                          |
| **Semantische Suche**             | Suche nach inhaltlicher Ähnlichkeit mithilfe eines Embedding-Modells.                                              |
| **Embedding-Modell**              | Modell, das Text in Zahlenvektoren für die semantische Suche umwandelt.                                            |
| **Transkriptor**                  | Gespeicherte Konfiguration für die Verschriftlichung von Audio und Video.                                          |
| **Transkript**                    | Der aus einer Aufnahme erzeugte Text samt Abschnitten und Zeitangaben.                                             |
| **SRT**                           | Textdateiformat für Untertitel mit nummerierten Abschnitten und Zeitmarken.                                        |
| **Web Fetch**                     | Abruf, Speicherung und Verarbeitung einer konkreten HTTP(S)-Adresse.                                               |
| **Web Search**                    | Suchanfrage an einen konfigurierten Suchanbieter.                                                                  |
| **Whitelist**                     | Liste erlaubter Hosts für Web Fetch; gilt nicht automatisch für Web Search oder MCP.                               |
| **MCP**                           | Schnittstelle, über die ein externer Dienst dem Agenten Werkzeuge bereitstellt.                                    |
| **SSO / Single Sign-on**          | Anmeldung über einen vorhandenen Organisationsanbieter.                                                            |
| **SAML**                          | Das für die SSO-Anbindung verwendete Austauschverfahren.                                                           |
| **Cluster**                       | Administrationsbereich für Service, Aufgabenstapel und veröffentlichte Artefakte.                                  |
| **Service**                       | Prozess pro Maschine, der ausgewählte Dienste startet, überwacht und passende Artefakte installiert.               |
| **Core**                          | Dienstgruppe aus Web-App, Realtime-Server und HTTPS-Proxy.                                                         |
| **Artefakt**                      | Im privaten Dateikatalog veröffentlichtes XRAG-Paket, das passende Service-Instanzen beziehen können.              |
| **XRAG**                          | Paketformat zur Installation von Modellen, Ressourcen und Softwareupdates.                                         |
| **Aufgabenstapel**                | Administrative Übersicht der Hintergrundverarbeitung; kein persönlicher Verlauf.                                   |

In älteren Anleitungen können außerdem „Text-Datenbank“ oder „Datenbank“ für heutige Dokumentenablagen stehen. Orientiere dich bei der Bedienung an den aktuellen Bereichen [Agenten](../agent/index.md), [Apps](../app/index.md) und [Arbeitsplätze](../workspace/index.md).
