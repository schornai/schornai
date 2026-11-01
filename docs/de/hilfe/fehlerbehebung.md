---
title: "Häufige Fragen und Fehlerbehebung"
description: "Zugriff, Chats, Uploads, Suche, Aufnahmen und Administration gezielt prüfen."
lang: de
meta:
  app_urls: []
  required_role: "Je nach betroffenem Bereich; Diagnosen zur eigenen Nutzung benötigen keine zusätzliche Rolle."
  role_scope: "Jeweilige Ressource"
  prerequisites: "Für eine Fehlermeldung an die Administration: betroffene Adresse, Zeitpunkt und genauer Meldungstext."
  status: "verfügbar"
  last_verified: "2026-10-18"
  source_files:
    [
      "apps/web/app/(settings)/settings/workspace/[workspaceId]/_components/WorkspaceEditorPermissions.tsx",
      "apps/web/app/(settings)/settings/user/[userId]/_components/UserResetKey.tsx",
      "apps/web/app/_actions/storageQueueProcessFiles.ts",
      "apps/web/app/i18n/locales/de/agent.json",
      "apps/web/app/i18n/locales/de/common.json",
      "apps/web/app/i18n/locales/de/transcriber.json",
      "apps/web/app/i18n/locales/de/signIn.json",
      "apps/web/app/(settings)/settings/workspace/[workspaceId]/page.tsx",
    ]
---

# Häufige Fragen und Fehlerbehebung

Beginne mit dem betroffenen Ablauf und der genauen Meldung. Notiere Zeitpunkt, Ressource und den letzten erfolgreichen Schritt. So lässt sich unterscheiden, ob der Zugriff fehlt, eine Verarbeitung wartet oder nur die Anzeige betroffen ist.

## Ich bin angemeldet, sehe aber keine Agenten oder Apps

Öffne [Profil → Berechtigungen](../me/permissions.md). Du brauchst mindestens die Benutzerrolle in einem Arbeitsplatz mit verfügbaren Inhalten. Prüfe außerdem Suchbegriffe in der Übersicht. Nach einer neuen Zuweisung melde dich erneut an.

## „Kein Zugriff auf diesen Agenten“ oder eine nicht gefundene Seite

Prüfe, ob der Agent noch existiert und du Zugriff auf seinen Arbeitsplatz hast. Verwende die Agentenübersicht statt eines möglicherweise veralteten Links. Fehlt nach einer Rollenänderung weiter der Zugriff, gib der Administration die betroffene URL und deine sichtbare Rolle.

Wenn der Fehler nach dem Klick auf eine **vorgeschlagene Nachricht** auftritt, starte über **Neuer Chat** an der Agentenkarte und übernimm den Vorschlagstext manuell.

## „Senden“ ist nicht verfügbar

Prüfe die Nachrichteneingabe: Werden Dateien noch hochgeladen oder verarbeitet? Läuft bereits eine Antwort? Wartet der Agent auf eine Werkzeugfreigabe? Schließe den offenen Schritt ab. Bei einem dauerhaft fehlerhaften Anhang hilft ein leerer neuer Chat ohne diesen Anhang, um die Ursache einzugrenzen.

## Der Agent antwortet nicht oder arbeitet ungewöhnlich lange

Prüfe zuerst [Werkzeugfreigaben](../agent/chat/freigaben.md) und den Status im [Verlauf](../activity/index.md). Modelle und Dateiwerkzeuge benötigen verfügbare Verarbeitungskapazität. Die Administration kann den [Aufgabenstapel](../tasks/index.md) kontrollieren. Verwende **Abbrechen**, wenn du die laufende Generierung stoppen möchtest; das entfernt bereits gespeicherte Ergebnisse nicht.

## Die KI kennt eine hochgeladene Datei nicht

Öffne die Datei und kontrolliere ihren verarbeiteten Inhalt. Bei Audio und Video muss ein passender Transkriptor zugeordnet sein. Hänge die Datei im Chat an die passende Nachricht an oder benenne den Speicherort. Für gemeinsame Ablagen muss der Agent zusätzlich eine Verbindung zu dieser Quelle haben.

## Eine Datei bleibt auf „Noch nicht verarbeitet“ oder „Fehler“

Öffne das Original und prüfe, ob es lesbar beziehungsweise abspielbar ist. Kontrolliere bei Audio und Video den zugeordneten Transkriptor. Wähle dann im Aktionsmenü der Datei **Erneut verarbeiten**. Lade vorhandene manuelle Textkorrekturen vorher herunter; sie werden ersetzt. Fehlt die Aktion in einer gemeinsamen Ablage, prüfe deine Bearbeiterrolle. Scheitert die Verarbeitung erneut, gib der Administration Dateipfad, Dateityp und Fehlermeldung.

## Die Volltextsuche findet nichts

Öffne die richtige Ablage, probiere einen sicher enthaltenen Begriff und kontrolliere den Text der Datei. Prüfe unter **Info**, ob ein Suchindex aktiv ist. Semantische Suche benötigt ein verfügbares Embedding-Modell. Nach einem Wechsel des Indexmodells verarbeite eine betroffene Datei erneut und wiederhole die Suche. Sichere zuvor manuelle Textkorrekturen.

## Die Aufnahme startet nicht

Verwende HTTPS oder lokal `localhost`. Prüfe Mikrofonrechte für Browser und Betriebssystem sowie das ausgewählte Gerät. Eine leere Aufnahme muss wiederholt werden. Bei einem reinen Uploadfehler kannst du die Vorschau behalten und das Speichern erneut versuchen. Siehe [Audio aufnehmen](../app/transcribe/aufnahme.md).

## Das Transkript lässt sich nicht speichern

Prüfe deine Schreibrechte am Speicherort. Bei einem Konflikt wurde derselbe Abschnitt inzwischen geändert: Kopiere deinen Entwurf, lade die Ansicht neu und gleiche die Änderungen ab. Bei einem gewöhnlichen Speicherfehler bleibt der Entwurf erhalten und du kannst erneut speichern.

## Der SRT-Download fehlt

Speichere oder verwirf zuerst die aktive Abschnittsbearbeitung und warte auf die abgeschlossene Transkription. Hast du das Transkript über **Optionen → Bearbeiten** als Gesamttext korrigiert, verwende **Verarbeiteten Text herunterladen**: Diese Gesamttextfassung bietet keinen SRT-Export. Für SRT bearbeite stattdessen die einzelnen zeitmarkierten Abschnitte.

## Die Websuche oder ein Webseitenabruf scheitert

Für die Suche müssen Anbieter und Schlüssel eingerichtet sein. Für Fetch müssen Zielhost und Weiterleitungen zu den Domainregeln passen; eine leere Whitelist sperrt alles. Ein gespeicherter Download kann trotzdem ohne lesbaren Text bleiben. Prüfe die Werkzeugmeldung und die [Web-Konfiguration](../agent/edit/web.md).

## Ich kann einen Arbeitsplatz nicht administrieren

Prüfe unter **Profil → Berechtigungen**, ob du in genau diesem Arbeitsplatz **Arbeitsplatzadministrator:in** bist. Melde dich nach einer neuen Zuweisung erneut an und öffne **Arbeitsplätze → Arbeitsplatz öffnen → Bearbeiten**. Dort kannst du Name, Beschreibung und Dokumentation bearbeiten. Die globale Einstellungsübersicht sowie Mitgliedschaften, automatischer Beitritt und SSO-Zuweisungen bleiben globalen Administrator:innen vorbehalten. Diese Bedienelemente erscheinen nicht für Arbeitsplatzadministrator:innen. Wende dich für Änderungen daran an die globale Administration.

## Ich habe keine Passwort-E-Mail erhalten

Die lokale Kontoanlage verschickt keine E-Mail. Du benötigst den einmaligen Schlüssel von der Administration. Folge [Passwort festlegen](../signin/reset.md). Bei SSO ist der Identitätsanbieter für das Passwort zuständig.

## Wie melde ich einen ungelösten Fehler?

Öffne [Feedback](../feedback/index.md), beschreibe den Ablauf und wähle die passenden Meldungen aus. Prüfe den vollständigen Text auf vertrauliche Inhalte. Die E-Mail-Aktion öffnet einen Entwurf; das Versenden erfolgt anschließend in deinem E-Mail-Programm.
