---
title: "Mit einem Agenten chatten"
description: "Nachrichten senden, Antworten lesen, Nachdenken einstellen und die Generierung stoppen."
lang: de
meta:
  app_urls: ["/agent/[agentId]/[activityId]"]
  required_role: "Benutzer:in (user) oder höher im Arbeitsplatz des Agenten; Zugriff auf das Gespräch."
  role_scope: "Arbeitsplatz des Agenten und zugängliches Gespräch"
  prerequisites: "Ein verfügbares Sprachmodell in der Agentenkonfiguration."
  status: "verfügbar"
  last_verified: "2026-11-12"
  source_files:
    [
      "apps/web/app/(main)/agent/[agentId]/[activityId]/page.tsx",
      "apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatComposeMessageSelected.tsx",
      "apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatComposeMessage.tsx",
      "apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartToolSupport.tsx",
      "packages/realtime/src/documents/chat/getResponseSuggestions.ts",
      "apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatMessageFooter.tsx",
      "packages/realtime/src/_lib/waitForProviderSynced.ts",
      "packages/realtime/src/documents/chat/queueChat.ts",
      "packages/realtime/src/documents/chat/retryChatGeneration.ts",
      "apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatError.tsx",
      "packages/realtime/src/documents/chat/finalizeInterruptedToolInputs.ts",
      "packages/realtime/src/documents/chat/abortChatGeneration.ts",
      "packages/realtime/src/platform/chatTools.ts",
      "apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatExpirationSettings.tsx",
      "apps/realtime/src/scheduler/expireChat.ts",
      "packages/database/src/chat/setChatExpiration.ts",
      "packages/realtime/src/server/recoverTaskDocuments.ts",
    ]
---

# Mit einem Agenten chatten

Starte einen Chat über **Neuer Chat** am Agenten. Vorhandene Gespräche öffnest du über den [Verlauf](../../activity/index.md).

![Nachrichteneingabe mit Nachdenken, Nachrichtenstapel, Dateiupload und Senden](../../assets/chat-eingabe.png)

Der leere Chat zeigt das Agenten-Icon und den Hinweis **Schreibe deine erste Nachricht**. Wenn der Agent vorgeschlagene Nachrichten hat, erscheinen sie als Kacheln in der Agentenfarbe direkt über der Texteingabe. Ein Klick ersetzt den bisherigen Text und setzt den Fokus ins Eingabefeld. Du kannst den Vorschlag bearbeiten oder mit `Enter` senden; er wird nicht automatisch abgeschickt. Dasselbe gilt beim Einstieg über eine Vorschlagskarte in der Agenteninfo.

## Nachricht senden

1. Beschreibe dein Ziel im Feld **Nachricht…**. Nenne relevante Daten und das gewünschte Format.
2. Hänge bei Bedarf [Dateien](dateien.md) an.
3. Warte, bis Uploads und Dateiverarbeitung abgeschlossen sind.
4. Wähle **Senden** oder drücke `Enter`. Mit `Shift` + `Enter` fügst du einen Zeilenumbruch ein.
5. Warte auf die Antwort. Wenn eine Werkzeugaktion freigegeben werden muss, erscheint stattdessen eine [Rückfrage](freigaben.md).

Frage konkret nach, wenn dir eine Antwort unklar ist. Beispiel: „Welche Aussagen stammen aus der Datei? Nenne die passende Fundstelle und kennzeichne Vermutungen.“

Beim Senden wartet der Server pro Synchronisationsschritt höchstens 30 Sekunden
auf den Realtime-Dienst. Eine abgelehnte Anmeldung oder eine geschlossene Verbindung
beendet das Warten früher mit einem Fehler. Prüfe bei einem Sendefehler den
Gesprächsverlauf, bevor du die Nachricht erneut sendest.

## Antwort lesen und weiterverwenden

Während der Antwort zeigt der Chat auch Nachdenkabschnitte und Werkzeugergebnisse. Warte nach einer Websuche oder einem Dateiabruf auf den abschließenden Antworttext.

Über **Nachricht kopieren** kopierst du den Text einer Antwort in die Zwischenablage. Wenn Nutzungsdaten verfügbar sind, zeigt **Statistik** Eingabe- und Ausgabe-Tokens sowie die Ausgabegeschwindigkeit. Ein Token entspricht je nach Text einem Wort, Wortteil oder Satzzeichen.

## Antwortvorschläge und unterstützende Werkzeuge

Wenn die ausgewählte Rolle [Chat Support](../edit/rollen.md#chat-support) aktiviert hat, kann die KI während des Gesprächs Antwortvorschläge über dem Eingabefeld anbieten. Ein Klick **ergänzt** deinen vorhandenen Entwurf. Du kannst mehrere Vorschläge übernehmen, den Text bearbeiten oder weiterhin frei schreiben. Erst **Senden** übermittelt deine Antwort. Die Vorschläge verschwinden nach deiner nächsten Nachricht; sie sind keine Werkzeugfreigabe.

Chat Support kann außerdem einen sprechenden Namen im Verlauf setzen und die aktuelle Uhrzeit abfragen. Manuell gesetzte Namen bleiben erhalten. Der aktivierte [Taschenrechner](../edit/rollen.md#taschenrechner) liefert Berechnungen als aufklappbares Werkzeugergebnis mit Eingabe, Ergebnis oder Fehlerstatus. Die KI entscheidet anhand der Anfrage und des Rollenprompts, welche aktivierten Werkzeuge sie verwendet.

## Nachdenken und Abbrechen

Das Gehirnsymbol schaltet die gewünschte Nachdenken-Option für die Nachricht um. Ob sie wirkt, hängt von Modell und [verpflichtenden Einstellungen](../edit/einstellungen.md) ab.

Während der Generierung kannst du **Abbrechen** wählen. Bereits ausgeführte Werkzeugaktionen werden dadurch nicht rückgängig gemacht. Eine Pause des [Nachrichtenstapels](stapel.md) hält dagegen die noch wartenden Nachrichten zurück.

## Fehler anzeigen und erneut versuchen

Bei einem Fehler erscheint unter den Nachrichten eine kurze rote Fehlerbeschreibung.
Klicke darauf, um die vollständigen verfügbaren Fehlerdetails aufzuklappen.
**Erneut versuchen** setzt die Antwort mit dem vorhandenen Gesprächsverlauf fort,
ohne deine Nachricht doppelt zu senden. Vorhandene Antworten und Werkzeugergebnisse
bleiben erhalten; wartende Entwürfe werden dabei nicht gesendet. Bereits ausgeführte
Werkzeugaktionen werden nicht rückgängig gemacht. Offene Werkzeugfreigaben musst du
zuerst beantworten. Während des Starts ist der Button gesperrt; schlägt der Start
fehl, bleibt die Fehlermeldung sichtbar und du kannst es erneut versuchen.

## Wenn die Verarbeitung abstürzt

Nach einem erkannten Worker-Ausfall zeigt der Chat einen Fehler und wird wieder
freigegeben. Noch wartende Texte werden pausiert; die unterbrochene Anfrage wird
nicht automatisch wiederholt. Prüfe vorhandene Antworten und bereits ausgeführte
Werkzeugaktionen, bevor du erneut sendest. Die Erkennung benötigt einen laufenden
Realtime-Server und eine erreichbare Datenbank und kann etwa zwei Minuten dauern;
bei Dienstausfällen länger. Details stehen unter
[Aufgabenstapel](../../tasks/index.md#nach-einem-worker-absturz).

Wenn die Übertragung einer Werkzeug-Eingabe abbricht, wird der unvollständige
Aufruf als fehlgeschlagen abgeschlossen und nicht ausgeführt. Beim nächsten
Senden werden auch ältere, so unterbrochene Aufrufe für die Fortsetzung
bereinigt. Bereits abgeschlossene Werkzeugaktionen bleiben erhalten.

## Reiter im Gespräch

- **Chat:** Nachrichten und Antworten.
- **Dateien:** die Dateien dieses Gesprächs.
- **Dokumentation:** der vollständige Dokumentationstext des Agenten; nur bei hinterlegtem Text sichtbar.
- **Info:** die aktuelle Agentenkonfiguration.

Bei ausbleibender Antwort prüfe zuerst offene Werkzeugfreigaben und folge den [Hinweisen zur Fehlerbehebung](../../hilfe/fehlerbehebung.md).

## Chat automatisch löschen

Mit dem **ClockFading-Symbol** neben den Zusatzfunktionen der Chat-Eingabe schaltest du selbstlöschende Chats ein. Ein weiterer Klick schaltet sie aus. Die Frist beträgt immer **12 Stunden ab dem Einschalten**; neue Nachrichten verschieben sie nicht. Der eingeschaltete Button ist in der Primärfarbe hervorgehoben; beim Darüberfahren zeigt der Tooltip den Löschzeitpunkt in der lokalen Zeitzone. Eine freie Dauer oder ein Bestätigungsdialog sind nicht vorgesehen.

Die Funktion muss in den Agenteneinstellungen verfügbar sein. Dort kann sie für neue Chats auch standardmäßig eingeschaltet werden. Bestehende Chats behalten ihre Einstellung. Eine bereits aktive Frist lässt sich weiterhin ausschalten, wenn die Funktion später im Agenten deaktiviert wird.

Bei einem gemeinsam genutzten Chat gilt die Einstellung für alle Beteiligten.

Zum Termin sperrt der Realtime-Dienst den Chat und stoppt laufende Chat- und
Dateiverarbeitung. Er entfernt Nachrichten, Entwürfe, Chat-Dateien und die Einträge
in den Verläufen aller Beteiligten. Dateien aus gemeinsam verwendeten
Dokumenten-Repositories bleiben erhalten. Offene Chatansichten wechseln zum
Verlauf. Ein alter Link kann das Gespräch nicht wieder anlegen.

Der Realtime-Dienst und die Datenbank müssen laufen. Bei Ausfällen wird die
Löschung nachgeholt; bei Fehlern werden Datei- und Verlaufsbereinigung erneut
versucht. Der Chat bleibt ab Beginn der Löschung gesperrt. Die Löschung ist
endgültig und kann dann auch durch Ausschalten der Frist nicht rückgängig
gemacht werden. Bereits exportierte oder heruntergeladene Kopien, Backups und
Daten bei externen Modell- oder Werkzeuganbietern werden damit nicht gelöscht.
Seit diesem Update erzeugte Modell-Aufgaben werden dem Chat zugeordnet und ihre
Prompt-/Ergebnis-Snapshots ebenfalls bereinigt. Ältere, noch nicht zugeordnete
Aufgaben-Snapshots unterliegen weiterhin der normalen Aufbewahrung von bis zu
24 Stunden.
Technische Löschmarkierungen ohne Nachrichteninhalt bleiben zum Schutz vor
Wiederherstellung erhalten.

## Zugehörige MCP-Werkzeuge

**Mindeststufe:** Benutzer. `platform_chat_send` startet einen Chat oder sendet Text in einen vorhandenen, zugänglichen Chat. `platform_chat_read` liefert Nachrichten und Zustand einschließlich Fehlerdetails. `platform_chat_retry` setzt einen fehlgeschlagenen Chat aus dem vorhandenen Verlauf fort. Es benötigt mindestens Benutzerzugriff im Arbeitsplatz und Zugriff auf das Gespräch; es setzt einen Fehlerzustand ohne offene Werkzeugfreigabe voraus, weist beschäftigte Chats ab und sendet keine wartenden Entwürfe. `platform_agent_get` liest die aktuelle Agentenkonfiguration einschließlich der Dokumentation; dafür ist Zugriff auf den Agenten erforderlich. `platform_chat_abort` beendet die laufende Generierung eines Chats mit entsprechender Schreibberechtigung. Die Verarbeitung erfolgt asynchron; beschäftigte Chats werden abgewiesen.

`platform_calculate` und `platform_current_date_time` bieten dieselbe Berechnung und Uhrzeitfunktion ab Stufe **User**, ohne zusätzliche Ressourcenrechte. `platform_activity_update` benennt eigene Aktivitäten um. `platform_chat_read` enthält auch die Ergebnisse des rolleninternen Tools `chat-response-suggestions`; `platform_chat_send` kann eine ausgewählte Antwort senden. Die rolleninternen Tools `calculator`, `chat-set-label`, `chat-current-date-time` und `chat-response-suggestions` stehen nur bei entsprechender Aktivierung in der ausgewählten Rolle zur Verfügung.

Das Vorbefüllen und Fokussieren des Eingabefelds ist eine reine Browserfunktion und wird nicht als MCP-Werkzeug angeboten. MCP-Clients können den gewünschten Text mit `platform_chat_send` senden.

Verbindung und gemeinsame Berechtigungsregeln: [Plattformzugriff](../../agent/edit/plattformzugriff.md).

`platform_chat_expiration_get` liest die Frist; `platform_chat_expiration_set`
setzt oder deaktiviert sie. Mindeststufe ist **Benutzer** mit Zugriff auf den
Arbeitsplatz des Agenten und den konkreten Chat. Änderungen setzen tatsächliche
Teilnahme am Chat voraus; ein höheres Tool-Level ersetzt diese Prüfung nicht.
`seconds` muss 43.200 (12 Stunden) sein; `null`
schaltet die Frist aus. Einschalten erfordert die aktivierte Zusatzfunktion des Agenten. Jede Änderung mit einer Dauer beginnt die Frist neu.
Bereits begonnene Löschungen können nicht zurückgenommen werden.
