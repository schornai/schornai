---
title: "Informationen zu einer Dokumentenablage"
description: "Suchverfahren, Transkriptor und Arbeitsplatz einer Ablage prüfen."
lang: de
meta:
  app_urls: ["/app/documents/[documentRepositoryId]/info"]
  required_role: "Benutzer:in (user) oder höher im Arbeitsplatz der Ablage."
  role_scope: "Betroffener Arbeitsplatz"
  prerequisites: "Keine."
  status: "verfügbar"
  last_verified: "2026-10-15"
  source_files:
    [
      "apps/web/app/(main)/app/documents/[documentRepositoryId]/info/page.tsx",
      "apps/web/app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryInfo.tsx",
    ]
---

# Informationen zu einer Dokumentenablage

Öffne den Reiter **Info** innerhalb einer Ablage oder wähle **Infos** an ihrer Karte. Hier siehst du, wie die Ablage eingerichtet ist.

Prüfe insbesondere:

- **Schlüsselwortsuche:** Ist das Verfahren aktiv?
- **Semantische Suche:** Ist sie aktiv und welches Embedding-Modell wird verwendet?
- **Transkriptor:** Ist ein Transkriptor für Audio- und Videodateien zugeordnet?
- **Arbeitsplatz:** Zu welchem Bereich gehört die Ablage?

Klappe die Informationsbereiche auf. Verweise wie **Zum Transkriptor** oder **Zum Arbeitsplatz** führen zur jeweiligen Ressource. Wird eine Zuordnung als unbekannt angezeigt, lass die Arbeitsplatzadministration das Modell beziehungsweise den Transkriptor und deine Zugriffsrechte prüfen.

Über **Dateien** gehst du zum Dateibestand zurück. Für Änderungen öffnest du mit ausreichenden Rechten **Bearbeiten** und die [Konfiguration der Ablage](edit.md).
