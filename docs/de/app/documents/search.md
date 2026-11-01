---
title: "In Dokumenten suchen"
description: "Volltextsuche und semantische Suche innerhalb einer Ablage verwenden."
lang: de
meta:
  app_urls: ["/app/documents/[documentRepositoryId]/search"]
  required_role: "Benutzer:in (user) oder höher im Arbeitsplatz der Ablage."
  role_scope: "Betroffener Arbeitsplatz"
  prerequisites: "Mindestens ein aktiver Suchindex und erfolgreich verarbeitete Dateien."
  status: "verfügbar"
  last_verified: "2026-10-15"
  source_files:
    [
      "apps/web/app/(main)/app/documents/[documentRepositoryId]/search/page.tsx",
      "apps/web/app/(main)/app/documents/[documentRepositoryId]/search/_components/Search.tsx",
      "apps/web/app/_components/StorageSearchResult.tsx",
    ]
---

# In Dokumenten suchen

Die **Volltextsuche** sucht innerhalb der verarbeiteten Dateien einer Dokumentenablage. Sie unterscheidet sich von der Namenssuche in einer Dateiliste oder der Suche nach Ablagen in der Übersicht.

![Suchergebnis mit Datei und gefundenem Textausschnitt](../../assets/volltextsuche.png)

## Suche ausführen

1. Öffne eine Dokumentenablage und wähle **Volltextsuche**.
2. Gib Suchbegriffe oder eine kurze Frage ein.
3. Wähle **Suchen**.
4. Lies die Textausschnitte und öffne die passende Datei für den Zusammenhang.

Die Suche verwendet die in der Ablage aktivierten Verfahren. Es gibt dabei keinen separaten Umschalter pro Suchanfrage zwischen Schlüsselwort- und semantischer Suche.

## Gute Suchanfragen

Für **Schlüsselwortsuche** eignen sich konkrete Begriffe wie ein Produktname, eine Person oder eine Vorgangsnummer. Für **semantische Suche** kannst du den gesuchten Sachverhalt formulieren, beispielsweise „Wie werden neue Mitarbeiter:innen eingearbeitet?“ Das zweite Verfahren benötigt ein eingerichtetes Embedding-Modell.

Sind beide Verfahren aktiv, können Ergebnisse aus beiden Suchwegen angezeigt werden. Öffne die Quelldatei am Treffer, um Datum und die umgebenden Absätze zu prüfen.

## Keine Ergebnisse oder kein Suchreiter

- Prüfe, ob du die richtige Ablage geöffnet hast.
- Formuliere kürzer oder verwende ein Wort, das sicher im Dokument vorkommt.
- Öffne die Datei und prüfe, ob ihr Inhalt bereits verarbeitet wurde.
- Bei Audio und Video muss zunächst ein Transkript vorliegen.
- Fehlt der Reiter, ist möglicherweise kein Suchindex aktiviert.
- Bei einem nicht verfügbaren Embedding-Modell muss die Arbeitsplatzadministration die [Ablagekonfiguration](edit.md) prüfen.

Um eine andere Ablage zu durchsuchen, öffne dort den Reiter **Volltextsuche**.
