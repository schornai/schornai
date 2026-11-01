---
title: "Einen Transkriptor erstellen"
description: "Modell, Fachbegriffe und Arbeitsplatz für wiederkehrende Transkriptionen einrichten."
lang: de
meta:
  app_urls: ["/app/transcribe/new"]
  required_role: "Arbeitsplatzadministrator:in (workspace-admin) oder Administrator:in (admin)."
  role_scope: "Betroffener Arbeitsplatz"
  prerequisites: "Verwaltbarer Arbeitsplatz und verfügbares Transkriptionsmodell."
  status: "verfügbar"
  last_verified: "2026-10-17"
  source_files:
    [
      "apps/web/app/(main)/app/transcribe/new/page.tsx",
      "apps/web/app/(main)/app/transcribe/[transcriberId]/_components/TranscriberEditorPrompt.tsx",
      "apps/web/app/(main)/app/transcribe/[transcriberId]/_components/TranscriberEditorSettingsWorkspace.tsx",
    ]
---

# Einen Transkriptor erstellen

Lege einen Transkriptor an, wenn du eine wiederverwendbare Konfiguration für Aufnahmen benötigst, etwa für Interviews mit wiederkehrenden Fachbegriffen.

## Einrichtung

1. Öffne **Apps → Transkription → Neuer Transkriptor**.
2. Vergib unter **Einstellungen** Name und Beschreibung.
3. Wähle den Arbeitsplatz und ein verfügbares Transkriptionsmodell.
4. Passe bei Bedarf Farbe und Icon an.
5. Hinterlege unter **Prompt** wichtige Namen, Fachbegriffe und gewünschte Schreibweisen.
6. Prüfe die Übersicht und wähle **Erstellen** beziehungsweise **Transkriptor erstellen**.
7. Starte anschließend eine neue Transkription mit einer kurzen repräsentativen Aufnahme.

Ein einziges verfügbares Transkriptionsmodell wird vorausgewählt. Ist die Auswahl leer, bitte die Betriebsadministration, ein Transkriptionsmodell bereitzustellen.

## Einen hilfreichen Prompt formulieren

Trage im Prompt vor allem Namen und Fachbegriffe ein, deren Schreibweise das Modell erkennen soll. Für eine Zusammenfassung des fertigen Transkripts verwende anschließend einen Agenten.

```text
Fachbegriffe und Namen: schorn.ai, Dokumentenablage, Arbeitsplatz,
Projekt Nordstern, Frau Beispiel. Die Besprechung betrifft die
Einführung unseres internen Wissensmanagements.
```

Halte den Text passend zum tatsächlich gesprochenen Inhalt. Prüfe anschließend, ob Eigennamen und Fachbegriffe korrekt erkannt werden.

Weiter: [Konfiguration ändern](edit.md) · [Datei transkribieren](files.md)

Für das Erstellen brauchst du Arbeitsplatzadministratorrechte im gewählten Arbeitsplatz oder globale Administratorrechte.
