# Projektdokumentation

## Übersicht

Dieses Projekt ist ein Werkzeug für Markdown-Versionsdiffs.
Es unterstützt das Hinzufügen, Entfernen und Nachverfolgen von Zeilen.
Komplexe Szenarien werden vollständig unterstützt.

## Funktionen

- MDV-Format parsen
- MDV-Format serialisieren
- Versionen wiederherstellen
- Diffs berechnen und speichern

## Installation

npm install @schornio/markdown-changelog
npm install --save-dev @types/node

## Konfiguration

Keine Konfiguration erforderlich.

# CHANGELOG

## Version 2

2026-02-01T11:00:00.000Z

| action | row | change                                                 |
| ------ | --- | ------------------------------------------------------ |
| add    | 7   | `Komplexe Szenarien werden vollständig unterstützt.`   |
| delete | 20  | `## Bekannte Einschränkungen`                          |
| add    | 21  | `## Konfiguration`                                     |
| delete | 22  | `Nur einfache Textinhalte werden derzeit unterstützt.` |
| add    | 23  | `Keine Konfiguration erforderlich.`                    |

## Version 1

2026-02-01T10:00:00.000Z

| action | row | change                                                                   |
| ------ | --- | ------------------------------------------------------------------------ |
| delete | 6   | `Es unterstützt das Hinzufügen und Entfernen von Zeilen.`                |
| add    | 6   | `Es unterstützt das Hinzufügen, Entfernen und Nachverfolgen von Zeilen.` |
| add    | 13  | `- Diffs berechnen und speichern`                                        |
| add    | 19  | `npm install --save-dev @types/node`                                     |
