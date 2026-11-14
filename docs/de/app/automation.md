---
title: "Persönliche Automationen"
description: "Neue Chats nach Zeitplan oder bei Dateiereignissen starten."
lang: de
meta:
  app_urls:
    [
      "/app/automation",
      "/app/automation/new",
      "/app/automation/[automationId]/info",
      "/app/automation/[automationId]/edit",
      "/app/automation/[automationId]/runs",
    ]
  required_role: "Editor:in oder höher im Arbeitsplatz des gewählten Agenten."
  role_scope: "Eigenes Konto"
  prerequisites: "Ein zugänglicher Agent mit einsatzbereitem Modell und laufendem Realtime-Dienst. Für Dateitrigger Zugriff auf den Speicherort."
  status: "verfügbar"
  last_verified: "2026-11-14"
  source_files:
    - "apps/web/app/(main)/app/automation/_components/AutomationNextRun.tsx"
    - "apps/web/app/(main)/app/automation/_components/AutomationRuns.tsx"
    - "apps/web/app/(main)/app/automation/_components/AutomationRunsLive.tsx"
    - "apps/realtime/src/scheduler/runAutomation.ts"
    - "apps/web/app/(main)/app/automation/page.tsx"
    - "apps/web/app/(main)/app/automation/_components/AutomationEditor.tsx"
    - "apps/web/app/(main)/app/automation/_components/AutomationScheduleFields.tsx"
    - "apps/web/app/(main)/app/automation/_components/AutomationEditorAppearance.tsx"
    - "apps/web/app/_models/currentUserConfigFavorites.ts"
    - "apps/web/app/(main)/app/automation/_components/AutomationListOptionsDropdown.tsx"
    - "apps/web/app/(main)/app/automation/_components/AutomationInfo.tsx"
    - "apps/web/app/_components/StoragePickerDialog.tsx"
    - "apps/web/app/_components/ResourceSlot.tsx"
    - "packages/ui/src/components/choice-cards.tsx"
    - "packages/database/src/automation/saveAutomation.ts"
    - "packages/database/src/automation/getAutomationsByIds.ts"
    - "packages/database/src/automation/runAutomationNow.ts"
    - "apps/web/app/(main)/app/automation/_components/AutomationRun.tsx"
    - "packages/realtime/src/platform/automationTools.ts"
---

# Persönliche Automationen

Öffne **Apps → Automationen**. Über **Neue Automation** unter der Liste oder im Menü **Optionen** legst du eine Automation an. Der Editor hat die Reiter **Übersicht**, **Auslöser**, **Chat starten** und **Einstellungen**. Wähle unter **Chat starten** den Agenten und formuliere die Nachricht; den Namen findest du unter **Einstellungen**. In **Übersicht** steht der Aktiv-Schalter über der Vorschau deiner Eingaben. Die Info-Kacheln lassen sich für Details aufklappen und markieren ungespeicherte Änderungen. Mit **Erstellen** bzw. **Speichern** in der festen Reiterleiste übernimmst du die Änderungen. Jede Ausführung eröffnet einen neuen persönlichen Chat. Andere Personen können deine Automationen nicht verwalten, auch nicht mit Arbeitsplatzadministratorrechten.

Der Agent wird über einen leeren Auswahlplatz eingesetzt. Ein Klick öffnet einen durchsuchbaren Dialog mit den vorhandenen App-Karten. Nach der Auswahl bleibt die Karte sichtbar; über **Wechseln** oder **Entfernen** kannst du die Auswahl ändern.

Unter **Chat starten → Nachricht** kannst du eine eigene Nachricht schreiben oder einen Vorschlag des gewählten Agenten übernehmen. Der Vorschlag wird in das Textfeld kopiert und lässt sich vor dem Speichern bearbeiten. Es wird der bearbeitete Text gespeichert; spätere Änderungen am Agentenvorschlag verändern die Automation nicht.

## Zeitplan

Wähle unter **Auslöser** die große Kachel **Zeitbasiert**. Darunter bestimmst du die Wiederholung über eine kompakte Schalterleiste.

Direkt beim Zeitplan, in der Übersicht, beim Überfahren des Zeitplan-Icons unten in zeitbasierten Automationskarten und in der Tabellenspalte **Nächste Ausführung** siehst du den nächsten Termin mit lokalisiertem Datum und Uhrzeit in der Zeitzone deines Geräts. Bei unveränderten Automationen ist dies der gespeicherte Termin, bei Änderungen eine Vorschau **nach dem Speichern**. Pausierte Automationen und Zeitpläne ohne weiteren Termin werden entsprechend gekennzeichnet. Dateiauslöser zeigen **Bei Dateiereignis** statt eines festen Termins.

- **Stündlich:** erstmals zur nächsten vollen Stunde nach dem Speichern, danach alle gewählten X Stunden. Verspätete Verarbeitung verschiebt diesen Rhythmus nicht; verpasste Termine werden nicht einzeln nachgeholt. Bestehende Tagesintervalle werden im Editor als entsprechende Stundenanzahl angezeigt (z. B. 3 Tage als 72 Stunden).
- **Täglich:** Uhrzeit und Zeitzone wählen. Alle sieben Wochentage sind standardmäßig aktiv. Über **Jeden Tag · Wochentage anpassen** öffnest du die zunächst eingeklappte Tagesauswahl und kannst einzelne Wochentage ausschließen. Bereits gespeicherte Wochenpläne behalten ihre ausgewählten Tage.
- **Monatlich:** Tag 1–31, Uhrzeit und Zeitzone wählen. Monate ohne den gewählten Tag werden übersprungen.
- **Einmalig:** zukünftiges Datum und Uhrzeit in der Zeitzone deines Geräts.

Kalendertermine berücksichtigen die angegebene Zeitzone. Eine bei der Sommerzeitumstellung nicht existierende Uhrzeit wird übersprungen; eine doppelte Uhrzeit wird einmal ausgeführt. Nach einem längeren Stillstand werden verpasste Zeitpunkte zu einer Ausführung zusammengefasst. Die Ausführung beginnt nach Fälligkeit, sobald der Dienst Kapazität hat.

## Dateiereignisse

Wähle unter **Auslöser** die große Kachel **Dateibasiert**. Über **Ordner auswählen** bestimmst du die Ablage und den Ordner gemeinsam im bekannten Ordnerdialog. Der gewählte Bereich wird als Ablage und Pfad angezeigt; beim erneuten Öffnen startest du im gewählten Ordner. Wählst du den Stammordner, gilt die gesamte Ablage. Unterordner kannst du mit dem Schalter einschließen. Die Ordnerauswahl bietet Speicherorte an, für die du Schreibzugriff hast. Über MCP können auch lesbare Speicherorte verwendet werden. Aktiviere eines oder mehrere Ereignisse über die Schalter: **Hochgeladen**, **Verarbeitet**, **Gelöscht**, **Aktualisiert** oder **Verschoben**. Verschieben bezieht sich auf den neuen Pfad. Abhängig vom Speicherablauf kann ein Verschieben auch als Hochladen und Löschen erscheinen.

**Verarbeitet** wird beim Speichern des extrahierten Inhalts ausgelöst. Interne Hilfsdateien werden nicht als eigene Uploads angezeigt. Der Chat erhält zusätzlich zur Nachricht Ereignis und Dateipfad.

Für die Datei gibt es drei Möglichkeiten:

- **Nicht mitsenden:** nur Nachricht und Ereignisinformation.
- **In den Chat kopieren:** eine eigene Kopie in den neuen Chat übernehmen.
- **Am aktuellen Speicherort verwenden:** die Datei bleibt dort; der Ordner muss beim Agenten eingebunden sein. Fehlt diese Einbindung, schlägt die Ausführung fehl.

Bei verarbeitbaren Dateien wartet ein Upload-Trigger mit Anhang auf den verfügbaren extrahierten Inhalt. Wird die Verarbeitung nicht fertig oder ist die Datei inzwischen verschwunden, kann die Ausführung fehlschlagen. Gelöschte Dateien werden unabhängig von der Anhangoption nur durch ihren Pfad beschrieben. Ein Verweis folgt dem aktuellen Inhalt, nicht einer unveränderlichen Version zum Ereigniszeitpunkt.

## Sofort testen

Über **Jetzt ausführen** in der Übersicht oder im **Optionen**-Menü beim Bearbeiten startest du die **gespeicherte** Automation sofort. Ungespeicherte Änderungen gehören nicht zum Test. Das funktioniert auch bei pausierten Automationen; Aktivierung und nächster geplanter Termin bleiben unverändert.

Bei Dateitriggern mit Anhang öffnet sich die Dateiauswahl. Wähle eine vorhandene Datei aus derselben Ablage innerhalb des konfigurierten Ordners; die Einstellung für Unterordner gilt auch hier. Kopie bzw. Verweis werden wie bei einem regulären Lauf verwendet. Der Test simuliert kein Löschen oder Hochladen. Ohne Anhang und bei Zeitplänen wird nur die gespeicherte Nachricht gesendet.

Nach dem Start öffnet sich der Ausführungsverlauf. Der Eintrag kann zunächst **Wartet** anzeigen, bis der Dienst ihn verarbeitet. Sobald der Chat gestartet wurde, aktualisiert sich der Eintrag automatisch und du kannst den Chat öffnen. Ein erneuter bewusster Klick startet einen weiteren Test.

## Verwalten und Ergebnisse öffnen

Die Suche steht zentriert oberhalb der Liste. Über **Optionen** rechts im Seitenkopf wechselst du zwischen **Karten** und **Tabelle**, sortierst nach Namen und gruppierst nach Anfangsbuchstabe, Auslöser oder Status. Unter **Ansicht speichern** behältst du deine Einstellung; **Zurücksetzen** stellt deine gespeicherte Ansicht wieder her; ohne gespeicherte Einstellung gilt die Standardansicht.

Unter **Einstellungen** vergibst du einen Namen und eine eigene Beschreibung für die App-Karte. Die Beschreibung ist unabhängig von der Nachricht. Im Abschnitt **Darstellung** wählst du Farbe und Symbol aus der gemeinsamen Palette bzw. dem Symboldialog.

Über den Stern in Karte oder Tabelle fügst du eine Automation zu deinen Favoriten hinzu. Sie erscheint auch auf der Startseite und – wenn eingeschaltet – in der Seitenleiste. Unter **Meine Favoriten** kannst du sie wie andere Favoriten sortieren oder entfernen. Die Liste lässt sich nach Favoriten gruppieren. Favoriten erweitern keine Berechtigungen.

Die Karte oder der Name in der Tabelle öffnet **Info**. Dort siehst du Status, Auslöser, Agent und Nachricht. Die Bearbeiten-Symbole führen direkt zum passenden Editor-Reiter. **Ausführungen** hat einen eigenen Reiter. Alte Links mit `?edit=` oder `?runs=` werden auf die neuen Seiten weitergeleitet.

Im Editor bietet das Menü **Als Kopie speichern**: Die aktuellen Eingaben werden als neue, zunächst pausierte Automation gespeichert. Das Original und sein Ausführungsverlauf bleiben erhalten. Über das Rückgängig-Symbol im Seitenkopf verwirfst du nach Bestätigung alle ungespeicherten Änderungen. Die Erstellen-Seite führt mit einer Checkliste durch Name, Auslöser und Chat.

Unter **Bearbeiten** kannst du die Automation ändern oder über den hervorgehobenen **Aktiv**-Schalter pausieren. Speichern beginnt den Zeitplan neu und verwirft noch nicht gestartete Ausführungen der vorherigen Version. Löschen entfernt Definition und Ausführungsverlauf; bereits gestartete Chats bleiben bestehen.

**Ausführungen** zeigt die letzten 50 Einträge als Tabelle mit Start, Abschluss, Status und Chat-Aktion. Datum und Uhrzeit werden in deiner Sprache und der Zeitzone deines Geräts angezeigt. Die Suche berücksichtigt Status und angezeigte Datumswerte. Über die Tabellenoptionen kannst du nach Startzeit sortieren, nach Status gruppieren und deine Ansicht speichern. Der Abschlusszeitpunkt bezieht sich auf die Ausführung der Automation, nicht auf die fertige Chat-Antwort. **Chat gestartet** bedeutet, dass die Nachricht an die Chat-Verarbeitung übergeben wurde; es ist keine Bestätigung einer fertigen Antwort. Öffne den Chat, um Antworten oder ausstehende Werkzeugfreigaben zu sehen. Die aktuellen Rechte werden bei jedem Start erneut geprüft.

Bei einem Dienstabbruch während des Chat-Starts kann eine Ausführung als unterbrochen fehlschlagen. Sie wird nicht automatisch erneut gesendet, damit keine doppelten Chats oder Werkzeugaktionen entstehen. Bereits begonnene Starts können durch Pausieren oder Löschen nicht zurückgenommen werden.

Bei Dateiauslösern sind **Dateiereignisse** und **Datei mitsenden** separat einklappbar. Die Zusammenfassungen zeigen die gewählten Ereignisse und den Versandmodus. Neue Dateiauslöser verwenden standardmäßig **In den Chat kopieren**; gespeicherte Einstellungen bleiben erhalten. Unter **Weitere Optionen** kannst du Unterordner einbeziehen. Bei täglichen und monatlichen Zeitplänen lässt sich die angezeigte **Zeitzone** aufklappen und ändern.

Fehlerhafte Eingaben werden nach einem Speicherversuch direkt am betroffenen Feld erklärt und rot markiert. Die betroffenen Reiter werden hervorgehoben; der Editor wechselt zum ersten Fehler. Hinweise zu Wochentagen, Dateiereignissen und Zeitzone bleiben auch bei eingeklappten Optionen sichtbar. Beim Korrigieren verschwinden die zugehörigen Hinweise. Schlägt das Speichern fehl, bleiben deine Eingaben erhalten und du kannst es erneut versuchen.

Die Ausführungsliste erhält Änderungen über die bestehende WebSocket-Verbindung. Neue Ausführungen und Statusänderungen werden ohne manuelles Neuladen angezeigt; nach einer Wiederverbindung wird der aktuelle Stand erneut geladen. Suche und Gruppierung bleiben dabei erhalten. **Chat gestartet** bestätigt, dass die Nachricht an den Chat übergeben wurde; es bedeutet nicht, dass die Antwort des Agenten bereits fertig ist.

## Plattform-MCP und Agentenwerkzeuge

Alle Werkzeuge sind am gemeinsamen Endpunkt `/mcp` verfügbar. Die Automationswerkzeuge benötigen mindestens **editor**. Die MCP-Freigabe ersetzt weder Eigentümerschaft noch Arbeitsplatz- und Dateirechte. Beim Speichern über MCP bleibt dessen Zugriffsstufe auch für spätere Chat-Ausführungen die Obergrenze.

| Werkzeug                     | Zweck und Einschränkungen                                                                                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `platform_automations_list`  | Eigene Automationen auflisten.                                                                                                                                                      |
| `platform_automation_save`   | Anlegen oder über `id` aktualisieren; Editor-Recht im Arbeitsplatz des Agenten und Lesezugriff auf den gewählten Speicherort erforderlich. Wochentage: 0 = Sonntag bis 6 = Samstag. |
| `platform_automation_delete` | Eigene Automation löschen; gestartete Chats bleiben bestehen.                                                                                                                       |
| `platform_automation_runs`   | Die letzten 50 Ausführungen einer eigenen Automation lesen.                                                                                                                         |

`platform_automation_run` startet eine eigene gespeicherte Automation sofort (Mindeststufe **editor**). Erforderlich sind Editor-Rechte beim Agenten und gegebenenfalls Lesezugriff auf die Testdatei. `requestId` ist eine UUID und muss bei Wiederholungen desselben Aufrufs unverändert bleiben; so wird kein zweiter Lauf angelegt. Bei Dateitriggern mit Anhang ist `path` innerhalb des konfigurierten Bereichs erforderlich. Pausierte Automationen sind testbar, Zeitpläne bleiben unverändert. Das Werkzeug meldet die Ausführungs-ID, nicht eine fertige Chatantwort.

`platform_automation_save` übernimmt auch `description`, `color` und `icon`. Ohne `id` entsteht ein neuer Eintrag; für eine pausierte Kopie sende die gewünschten Eingaben mit `enabled: false`. Eine tägliche Kalenderregel ist `kind: "weekly"` mit allen sieben Wochentagen. Stundenintervalle beginnen zur nächsten vollen UTC-Stunde und laufen anschließend im gewählten Stundenabstand. In Europe/Vienna entspricht dies ebenfalls der vollen Stunde. Bestehende Tagesintervalle bleiben feste Zeitabstände.

`platform_agent_get` liest die Konfiguration eines zugänglichen Agenten einschließlich `recommendedMessages` (Mindeststufe **user**, Benutzerzugriff im Arbeitsplatz erforderlich). Ein Vorschlag kann bearbeitet und als `message` an `platform_automation_save` übergeben werden; dafür ist weiterhin **editor** erforderlich. Gespeichert wird der Nachrichtentext, keine dauerhafte Verknüpfung zum Vorschlag.

`platform_favorites_get` und `platform_favorites_update` lesen bzw. ersetzen die eigene Favoritenliste einschließlich Reihenfolge und Sidebar-Sichtbarkeit (Mindeststufe **user**). Für Automationen lautet der Eintragstyp `automation`. Favoriten gewähren keine Zugriffsrechte: Ihre Anzeige und Nutzung erfordern weiterhin Eigentümerschaft und Editorzugriff.
