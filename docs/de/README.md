---
title: "Diese Dokumentation verwenden und pflegen"
description: "Portables Markdown-Format, Metadaten, Navigation und Hinweise für Website und Wissensbasis."
lang: de
meta:
  app_urls: []
  required_role: "Keine."
  role_scope: "Dokumentation"
  prerequisites: "Markdown-Reader; für eine Website ein Renderer mit YAML-Frontmatter und Tabellenunterstützung."
  status: "verfügbar"
  last_verified: "2026-10-15"
  source_files: ["AGENTS.md"]
---

# Diese Dokumentation verwenden und pflegen

Der Einstieg für Anwender:innen ist [index.md](index.md). Dieser Ordner enthält die deutschsprachige Dokumentation der schorn.ai-Web-App sowie kurze Anleitungen zu den mitgelieferten Desktop-Begleitprogrammen.

## Eigenständig nutzbares Paket

- Inhalte stehen in Markdown-Dateien mit YAML-Frontmatter.
- Abbildungen liegen lokal in `assets/`; kein Bild muss aus einem anderen Repositoryordner oder vom Internet geladen werden.
- Dokumentlinks sind relativ und zeigen auf `.md`-Dateien. Bilder haben beschreibende Alternativtexte.
- Tabellen und eingezäunte Codebeispiele verwenden verbreitete Markdown-Syntax. Für Tabellen braucht der Renderer eine GFM-kompatible Tabellenerweiterung.

Die Verzeichnisse folgen ungefähr den App-Bereichen `signin`, `agent`, `activity`, `app`, `workspace`, `me`, `settings`, `tasks` und `feedback`. Variable Kennungen werden nicht als echte Dokumentordner vervielfältigt: Beispielsweise erklärt `agent/chat/index.md` alle Gesprächsseiten unter `/agent/[agentId]/[activityId]`.

## Metadaten

Jede Seite hat `title`, `description`, `lang` und einen **`meta`-Abschnitt**:

| Feld            | Bedeutung                                                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `app_urls`      | Zugehörige App-Routen; Kennungen in eckigen Klammern sind Platzhalter. Leere Liste bei übergreifenden Anleitungen oder Begleitprogrammen. |
| `required_role` | Erforderliche Rolle in verständlicher Form; enthält gegebenenfalls getrennte Rechte zum Lesen und Ändern.                                 |
| `role_scope`    | Geltungsbereich, zum Beispiel Arbeitsplatz, eigenes Konto oder ganze Instanz.                                                             |
| `prerequisites` | Weitere Voraussetzungen wie Modell, Transkriptor oder Mikrofon.                                                                           |
| `status`        | Verfügbarkeit im dokumentierten Stand; Details und Grenzen stehen zusätzlich im Text.                                                     |
| `last_verified` | Datum des letzten Abgleichs der Seite mit dem Quellcode.                                                                                  |
| `source_files`  | Repositoryrelative Quellpfade für den Abgleich von Anleitung und Implementierung.                                                         |

`required_role` beschreibt die benötigte Berechtigung in der App. Falls die veröffentlichte Dokumentation selbst nur intern erreichbar sein soll, richte den Zugriffsschutz im verwendeten Webserver oder Dokumentationssystem ein.

## Als Website veröffentlichen

1. Verwende `index.md` als Einstieg und die Dokumentpfade als Grundlage für Websitepfade.
2. Lies das Frontmatter als Metadaten aus; rendere anschließend den Markdown-Inhalt.
3. Zeige auf Anwenderseiten mindestens Rolle, Geltungsbereich und Voraussetzungen aus `meta` an, damit diese Angaben beim Entfernen des Frontmatters sichtbar bleiben.
4. Schreibe `.md`-Links beim Erzeugen der Website konsistent auf deren veröffentlichte URLs um. `meta.app_urls` sind dagegen App-Adressen und nicht die Dokumentations-URLs.
5. Kopiere `assets/` mit und erhalte die relativen Bildverweise.
6. Nutze [Navigation](navigation.md) als Inhaltsverzeichnis. `README.md` und `_meta/` können aus der Anwendernavigation ausgeblendet werden.

## Als Wissensbasis für einen Agenten

Gib den ganzen Ordner weiter. Für reine Textsuche reichen die Markdown-Dateien; die Bilder ergänzen die Orientierung an der Oberfläche. Nutze `title`, `description`, Rollen und App-Routen für die Zuordnung von Fragen. Antworten zu Rollen, Löschung, externen Diensten und nicht fertiggestellten Funktionen sollten die Einschränkungen aus dem jeweiligen Kapitel berücksichtigen.

Prüfe bei einer Aktualisierung die in `meta.source_files` genannten Komponenten und Aktionen. Das Datum in `meta.last_verified` gilt je Seite. [Quellen und Grenzen](_meta/stand.md) nennen Funktionen, deren Beschreibung besonders sorgfältig mit dem Code abgeglichen werden muss.

## Pflege

Bei Änderungen an einer Route oder einem Ablauf aktualisiere die betreffende Anleitung, ihre Metadaten und die [Routenübersicht](_meta/routen.md). Bei UI-Änderungen prüfe auch die zugehörigen Bilder anhand des [Bildverzeichnisses](_meta/bilder.md).

Beschreibe konkrete Voraussetzungen, Aktionen, Ergebnisse und Fehlerbehebung. Streiche Sätze, die nur Selbstverständlichkeiten wiederholen. Benenne bei einer Einschränkung die betroffene Funktion und, sofern vorhanden, den alternativen Ablauf. Vermeide Arbeitsberichte wie „Für diese Aufgabe wurde …“ in Anwenderanleitungen.

Formatiere nur die geänderten Markdown-Dateien mit dem lokal installierten Prettier. Prüfe relative Links, Bildziele, Frontmatter, Quellpfade und Abdeckung der aktuellen Seiten. Neue Screenshots sind Dokumentationsmaterial; Änderungen an visuellen Testbaselines sind ein getrennter Vorgang.
