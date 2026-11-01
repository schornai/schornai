---
title: "Die Desktop-App verwenden"
description: "Eine schorn.ai-Box im lokalen Netzwerk auswählen und die Web-App im Desktopfenster öffnen."
lang: de
meta:
  app_urls: []
  required_role: "Keine für die Boxauswahl; anschließend gelten Anmeldung und Arbeitsplatzrollen der Web-App."
  role_scope: "Desktopprogramm und anschließend ausgewählte Instanz"
  prerequisites: "Bereitgestellte Desktop-App und erreichbare Box im lokalen Netzwerk."
  status: "verfügbar"
  last_verified: "2026-10-15"
  source_files:
    [
      "packages/desktop-app/src/renderer/App.tsx",
      "packages/desktop-app/src/renderer/components/FindBoxesScreen.tsx",
      "packages/desktop-app/src/renderer/components/FoundBoxTableRow.tsx",
      "packages/desktop-app/src/main/setupIPC.ts",
    ]
---

# Die Desktop-App verwenden

Die Desktop-App ist ein eigener Zugang zur schorn.ai-Web-App. Sie sucht nach Boxen im lokalen Netzwerk und öffnet die gewählte Instanz im Anwendungsfenster.

## Eine Box auswählen

1. Starte die bereitgestellte Desktop-App.
2. In **Box finden** werden gefundene Boxen mit **Adresse** und Zertifikat-Fingerabdruck angezeigt.
3. Verwende bei Bedarf **Nach Boxen suchen**, um die Suche erneut zu starten.
4. Wähle die von deiner Administration benannte Box. Prüfe bei Unsicherheit Adresse und Fingerabdruck mit ihr.
5. Verbinde dich über die angebotene Verbindungsaktion und [melde dich an](../signin/index.md).

**Einmal verbinden** und **Immer verbinden** speichern die Auswahl nur bis zum Beenden der App. Wähle die Box nach einem vollständigen Neustart erneut aus.

## Box wechseln

Über das Steckersymbol in der oberen Leiste kehrst du zur Boxauswahl zurück. Die Sitzung in der bisherigen Instanz bleibt dabei bestehen. Wähle vorher **Abmelden** im Kontomenü, wenn eine andere Person das Gerät übernimmt.

Wenn keine Box gefunden wird, prüfe mit der Administration Netzwerkverbindung und Erreichbarkeit. Eine manuelle Adresseingabe wird in diesem Suchfenster nicht angeboten. Du kannst die bekannte Adresse der Instanz alternativ in einem unterstützten Browser öffnen.

Nach der Verbindung gelten die übrigen Kapitel dieser Dokumentation: [Agenten](../agent/index.md), [Dokumentenablagen](../app/documents/index.md) und [Transkription](../app/transcribe/index.md).
