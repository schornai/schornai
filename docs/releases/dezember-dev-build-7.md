# December 2026 Development Build 7

Web-App und Mac-Admin-App zeigen **December 2026 Development Build 7**. Das Setup wird als
`.xrag.tar` für macOS ARM64 (Apple Silicon) gebündelt.

Enthalten sind die Verarbeitung großer XRAG-Pakete im Hintergrund,
wiederaufnehmbare Übertragungen, Speicherbereinigung und vorwärtsgerichtete
Setup-Updates. Der Upload sendet pro Anfrage genau einen aktuellen
Authorization-Header. Die Artefaktübersicht lädt Änderungen aus dem
Datenbankkatalog und übernimmt keine veralteten Einträge aus dem Ereignisverlauf.
Web-Proxy und Storage-Gateway übertragen Dateien ohne temporäre Dateipuffer.

Der Build lädt festgelegte GitHub-Release-Artefakte direkt über die offizielle
Release-API; dies gilt auch für Electron. Die Veröffentlichung auf npm und eine
Änderung des öffentlichen Setup-Endpunkts sind nicht Teil dieses Entwicklungsbuilds.

Bedienung und Grenzen stehen unter [XRAG-Pakete bereitstellen](../de/settings/xrag.md)
und [Service und Mac-App](../de/box-admin/index.md).
