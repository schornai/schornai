---
title: "Feedback und Fehlerberichte"
description: "Eine Rückmeldung vorbereiten, Protokolle prüfen und per E-Mail weitergeben."
lang: de
meta:
  app_urls: ["/feedback"]
  required_role: "Keine; die Feedbackseite ist auch ohne Anmeldung erreichbar."
  role_scope: "Öffentliche Feedbackseite"
  prerequisites: "Für E-Mail-Versand ein eingerichtetes E-Mail-Programm oder ein anderer eigener Versandweg."
  status: "verfügbar"
  last_verified: "2026-10-15"
  source_files:
    [
      "apps/web/app/feedback/_components/Actions.tsx",
      "apps/web/app/feedback/_components/FeedbackContext.tsx",
      "apps/web/app/feedback/_components/ErrorLogs.tsx",
      "apps/web/lib/supabase/proxy.ts",
    ]
---

# Feedback und Fehlerberichte

Über **Feedback** im Fußbereich oder direkt unter `/feedback` kannst du eine Rückmeldung vorbereiten. Die Seite sammelt deine Bewertung, deinen Text und die von dir ausgewählten Fehlermeldungen.

## Rückmeldung erstellen

1. Wähle bei Bedarf eine Sternebewertung.
2. Beschreibe unter **Bewertung schreiben**, was passiert ist, was du erwartet hast und welche Schritte zum Problem führen.
3. Prüfe im Bereich **Fehler**, welche Meldungen Teil des Feedbacks sein sollen.
4. Kontrolliere über **Feedback-Text anzeigen** den vollständigen vorgesehenen Text.
5. Kopiere ihn in die Zwischenablage oder wähle **Feedback per Email verschicken**.

![Fehlerliste mit Auswahl, welche Meldungen in das Feedback übernommen werden](../assets/feedback.png)

Die E-Mail-Aktion öffnet dein E-Mail-Programm mit vorbereitetem Text an `hello@schorn.ai`. Prüfe den Entwurf und sende ihn im E-Mail-Programm ab. Wenn kein Programm eingerichtet ist oder der Text zu lang für die Übergabe ist, verwende die Kopierfunktion und erstelle die Nachricht selbst.

## Fehlermeldungen auswählen und löschen

Du kannst einzelne Meldungen auswählen, alle auswählen oder alle abwählen. Nur ausgewählte Meldungen werden in den Feedbacktext aufgenommen. Manche protokollierten Fehler können sich bereits selbst behoben haben; beschreibe deshalb zusätzlich, was du tatsächlich beobachtet hast.

**Alle Fehlermeldungen löschen** entfernt nach Bestätigung die gesammelten Meldungen. Sichere zuvor die für deine Rückmeldung nötigen Informationen.

Entferne vor dem Senden Passwörter, API-Schlüssel, private Dokumentinhalte und personenbezogene Angaben, die für die Fehlerbeschreibung nicht benötigt werden. Behalte Fehlermeldung, Zeitpunkt und die Schritte zum Reproduzieren bei.

Weiter: [Fehlerbehebung](../hilfe/fehlerbehebung.md)
