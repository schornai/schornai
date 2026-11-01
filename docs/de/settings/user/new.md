---
title: "Ein lokales Benutzerkonto anlegen"
description: "Ein Konto erstellen, den einmaligen Passwortschlüssel übergeben und Rechte zuweisen."
lang: de
meta:
  app_urls: ["/settings/user/new"]
  required_role: "Administrator:in (admin), global."
  role_scope: "Gesamte Instanz"
  prerequisites: "Administratorzugang und eine noch nicht verwendete E-Mail-Adresse."
  status: "verfügbar"
  last_verified: "2026-10-20"
  source_files:
    [
      "apps/web/app/(settings)/settings/user/[userId]/_components/UserResetKey.tsx",
      "apps/web/app/(settings)/settings/user/_components/CreateUser.tsx",
      "packages/database/src/user/createUserWithResetKey.ts",
      "apps/web/app/(settings)/settings/user/_components/AccessMessageDialog.tsx",
      "apps/web/lib/accessMessage.ts",
    ]
---

# Ein lokales Benutzerkonto anlegen

Dieser Ablauf erstellt ein lokales Konto mit E-Mail-Adresse. Die Person legt ihr Passwort anschließend selbst fest. Für SSO-Konten ist stattdessen der Anmeldeanbieter zuständig.

## Konto erstellen und Zugang übergeben

1. Öffne **Einstellungen → Benutzer:innen → Optionen → Benutzer:in erstellen**.
2. Trage die E-Mail-Adresse und optional Vor- und Nachname ein. Die Namen werden im Benutzerprofil gespeichert.
3. Wähle **Konto und Reset-Schlüssel erstellen**.
4. Kopiere den angezeigten **Passwort-Reset-Schlüssel**. Bei einem Kopierfehler kannst du ihn markieren und manuell kopieren.
5. Notiere das angezeigte Ablaufdatum. Der Schlüssel ist sieben Tage gültig und einmal verwendbar.
6. Wähle **Zugangsnachricht erstellen**. Der Dialog enthält einen bearbeitbaren Betreff und eine Nachricht mit E-Mail-Adresse, Schlüssel, Ablaufdatum und Link zum Passwort-Setzen. **Text kopieren** kopiert den Nachrichtentext; **E-Mail-Programm öffnen** öffnet einen Entwurf mit Empfänger, Betreff und Nachricht im eingerichteten E-Mail-Programm. Prüfe und versende ihn dort selbst. **Schließen** schließt den Dialog. Bei sehr langen Nachrichten oder fehlendem E-Mail-Programm verwende **Text kopieren**.
7. Öffne **Benutzer:in bearbeiten** und [weise passende Rechte zu](details.md).

**Es wird keine automatische Einladungs- oder Passwort-E-Mail verschickt.** Die Person öffnet auf der Anmeldeseite **Neues Passwort** und folgt [Passwort festlegen](../../signin/reset.md).

Weise mindestens einen Arbeitsplatz mit der benötigten Rolle zu. In Arbeitsplätzen mit **Automatisch Benutzer:in** erhält das Konto bereits bei der Anmeldung die Benutzerrolle.

## Fehlerfälle

Wenn die E-Mail-Adresse bereits verwendet wird, öffne das bestehende Konto in der Benutzerliste und stelle dort bei Bedarf einen neuen Reset-Schlüssel aus.

Kopiere den Schlüssel vor dem Verlassen der Erfolgsmeldung. Geht er verloren oder läuft er ab, wähle auf der Benutzer-Detailseite **Bearbeiten → Passwort zurücksetzen → Neuen Reset-Schlüssel ausstellen**. Der neue Schlüssel ersetzt alle noch unbenutzten früheren Schlüssel.
