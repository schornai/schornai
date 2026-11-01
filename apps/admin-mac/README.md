# schorn.ai Admin für macOS

Minimale Electron-Oberfläche für Start, Stop und Protokolle des separaten
Services. Beim Öffnen startet sie den Service; beim Schließen läuft er
weiter. Die CLI und die Mac-App steuern denselben Prozess.

## Entwicklung

Im Repository-Root:

```bash
npm run build:service
SCHORNAI_CONFIG=/absoluter/pfad/zur/test-config.json npm run dev --workspace apps/admin-mac
```

Ohne `SCHORNAI_CONFIG` verwendet die App `~/.aibox/config.json`. Zum Testen eine
eigene Konfiguration mit getrennten Datenverzeichnissen und Ports verwenden.
`SCHORNAI_HOME`, `SCHORNAI_NODE` und `SCHORNAI_CLI` können die Installationsbasis,
Node-Binary und Service-CLI überschreiben.

Die Oberfläche importiert shadcn-Komponenten, `ButtonAction`, Logo und Theme
direkt aus `@schornio/aibox-package-ui`. Die Originalkomponenten bleiben im
gemeinsamen Paket. Deutsch und Englisch werden offline mitgeliefert; Sprache
und Hell-/Dunkeldarstellung folgen dem System. Electron verwendet den
`react-i18next`-Adapter derselben i18next-Basis wie die Web-App, ohne deren
Next.js-Router zu laden.

## UI-Prüfung

```bash
npm run typecheck --workspace apps/admin-mac
npm run storybook:admin
npm run storybook:typecheck
npm run storybook:check
STORYBOOK_FILTER='^admin-serviceview--' npm run storybook:visual -- --list
STORYBOOK_FILTER='^admin-serviceview--' npm run storybook:visual
```

Storybook läuft auf Port 6008 mit reinen Beispieldaten. Es startet keine Dienste.
Die globalen Storybook-Builds und Linux-ARM64-Bildvergleiche enthalten auch diese
App. Bridge-Tests prüfen Autostart, Fehlerbehandlung, Logbegrenzung und Aufräumen
der Abonnements über `npm test`.

```bash
npm run package --workspace apps/admin-mac
```

Dieser Befehl baut die Electron-App einschließlich des Vite-Renderers. Der
Service wird weiterhin separat durch das Setup-Bundle installiert.
