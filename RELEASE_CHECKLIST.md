# Release-Checkliste

Diese Checkliste beschreibt die Vorbereitung, Prüfung und manuelle Veröffentlichung eines schorn.ai-Releases. Ausgangspunkt ist der aktuelle Stand von `origin/dev`. Ein Release umfasst den Quellcode auf `release/<release-slug>`, das passende XRAG-Setup und eine neue Minor-Version des öffentlichen npm-Pakets `schornai`.

**Reihenfolge:** Release vorbereiten → Anzeigen und CLI-Version aktualisieren → Artefakte bauen und prüfen → vollständige Tests ausführen → Änderungen committen und CI prüfen → XRAG bereitstellen und Erstinstallation prüfen → CLI manuell veröffentlichen → bestehende Installationen aktualisieren.

Stand der Prüfung: **25. Oktober 2026**. Pfade und Befehle beziehen sich auf den untersuchten Repository-Stand. Die Shell-Beispiele werden, sofern nicht anders angegeben, im Repository-Root und in derselben Sitzung ausgeführt. Bei jedem fehlgeschlagenen Schritt anhalten; abhängige Schritte erst nach Behebung wiederholen.

## 1. Release festlegen und Voraussetzungen klären

- [ ] Anzeigename und eindeutigen Slug festlegen. Der Anzeigename darf Leerzeichen enthalten; Branch und Archiv verwenden ausschließlich Kleinbuchstaben, Ziffern und einzelne Bindestriche. Umlaute ausschreiben, beispielsweise `ä` als `ae`.

  | Bezeichnung    | Beispiel                           |
  | -------------- | ---------------------------------- |
  | Anzeigename    | `Oktober 2026 Revision 2`          |
  | Release-Slug   | `oktober-2026-revision-2`          |
  | Branch         | `release/oktober-2026-revision-2`  |
  | Setup-Datei    | `oktober-2026-revision-2.xrag.tar` |
  | CLI-Version    | `0.1.0` → `0.2.0`                  |
  | npm-Paketdatei | `schornai-0.2.0.tgz`               |

  Die Angaben sind Beispiele. Die CLI-Version ist eine eigenständige SemVer-Version und wird pro Release um eine Minor-Version erhöht; der Patch-Anteil wird dabei auf `0` gesetzt.

  ```bash
  release_name='Oktober 2026 Revision 2'
  release_slug='oktober-2026-revision-2'
  ```

- [ ] Zielplattformen festlegen. Der Builder unterstützt `darwin-arm64`, `linux-arm64` und `linux-x64`. Jedes XRAG ist plattformspezifisch und muss auf einem Rechner derselben Plattform und Architektur gebaut werden. Windows und Intel-Macs sind derzeit keine unterstützten Ziele.
- [ ] **Plattformauswahl des Bootstrap-Downloads vor der Freigabe klären.** Der aktuelle [Bootstrap](packages/service/src/bootstrap.ts) ruft ausschließlich `https://schorn.ai/xrag/schornai/latest` auf, ohne Plattform oder Architektur zu übermitteln. Ein dort hinterlegtes Mac-Bundle funktioniert deshalb nicht gleichzeitig für Linux. Bis ein gemeinsames Auswahlverfahren in CLI und Hosting umgesetzt und getestet ist, kann dieser Endpunkt nur für eine festgelegte Zielplattform freigegeben werden. Diese Einschränkung in der Installationsdokumentation und den Release-Hinweisen angeben. Der interne XRAG-Katalog kann dagegen bereits mehrere Plattformen unterscheiden.
- [ ] Zugang zum Hosting des Download-Endpunkts einschließlich Upload, Umschalten von `latest` und gegebenenfalls Cache-Invalidierung sicherstellen. Im Repository gibt es dafür derzeit keinen Release- oder Upload-Befehl. Zuständigkeit, unveränderliche Ablage je Release und konkretes Veröffentlichungsverfahren vorab dokumentieren.
      Der Endpunkt ist während der Entwicklung noch nicht mit dem neuen Setup befüllt. Seine tatsächliche Bereitstellung ist deshalb Teil der ersten Veröffentlichung und keine bereits erfüllte Voraussetzung.
- [ ] npm-Veröffentlichungsrecht für `schornai` prüfen. Für die manuelle Veröffentlichung einen berechtigten Account mit der erforderlichen Authentifizierung verwenden. `npm login` nur bei Bedarf ausführen; Zugangsdaten gehören nicht ins Repository. Siehe [npm: Veröffentlichung und Zwei-Faktor-Authentifizierung](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/).

  ```bash
  npm whoami --registry https://registry.npmjs.org/
  npm view schornai versions --json --registry https://registry.npmjs.org/
  npm view schornai dist-tags --json --registry https://registry.npmjs.org/
  ```

  Bei einer erstmaligen Veröffentlichung ist ein fehlendes Paket möglich. Andere Fehler, insbesondere fehlende Berechtigungen oder Netzwerkfehler, vor dem Fortfahren klären.

- [ ] Bisherige CLI-Version, bisheriges `latest`-Ziel und dessen XRAG-Prüfsumme für eine mögliche Rücknahme der Veröffentlichung festhalten.
- [ ] Build-Rechner vorbereiten: Node.js ab Version 24, npm gemäß `packageManager` in [package.json](package.json), Git, `tar`, Internetzugang sowie eine laufende Linux-Docker-Engine ab 28.1/API 1.49 mit Compose und Buildx. Zusätzlich auf macOS: Python 3.13, Xcode Command Line Tools und `unzip`. Für die vollständige Testsuite muss auch Python verfügbar sein.
- [ ] Ausreichend Platz im Repository, im temporären Systemverzeichnis und in Docker reservieren. Für einen vollständigen Build ohne vorhandenen Cache mindestens 8 GB RAM und 4 CPUs für die Docker-VM vorsehen; laufende Anwendungen benötigen zusätzliche Reserven.
- [ ] Getrennte Testsysteme für Erstinstallation und Updates bereitstellen. Ein anderer `SCHORNAI_HOME`-Pfad allein isoliert weder Docker-Containernamen noch Ports oder die Colima-VM. Installationstests deshalb auf einer dafür vorgesehenen Maschine oder VM ausführen.
- [ ] Anforderungen an die macOS-Distribution klären. [forge.config.ts](apps/admin-mac/forge.config.ts) enthält derzeit keine Konfiguration für Signierung oder Notarisierung. Falls diese erforderlich sind, den Prozess vor dem finalen Bundle-Build einrichten und später am ausgelieferten Artefakt testen.

## 2. Release-Branch vom aktuellen `dev` erstellen

- [ ] Laufende Entwicklungsarbeiten abschließen und die gewünschten Änderungen nach `dev` integrieren. Insbesondere müssen der neue Bootstrap, seine Rückfrage und die zugehörigen Tests und Dokumentationen bereits enthalten sein. Uncommittete Änderungen aus einem Feature-Branch nicht versehentlich in das Release übernehmen.
- [ ] Sicherstellen, dass das Arbeitsverzeichnis sauber ist. Vorhandene fremde Änderungen weder verwerfen noch ungeprüft committen.

  ```bash
  git status --short --branch
  git fetch origin
  git switch dev
  git pull --ff-only origin dev
  git log --oneline origin/dev..HEAD
  ```

  Die letzte Ausgabe muss leer sein. Bei lokalen Zusatzcommits oder divergierenden Branches zunächst die Ausgangsbasis klären. Der Release-Branch soll exakt auf dem aktuellen `origin/dev` beginnen.

- [ ] Release-Branch erstellen und Ausgangscommit im Release-Protokoll notieren.

  ```bash
  git rev-parse HEAD
  git switch -c "release/$release_slug"
  ```

- [ ] Lokale Entwicklungsabhängigkeiten aus dem Lockfile installieren, damit Formatierung, Tests, Storybook und CLI-Packaging ausführbar sind:

  ```bash
  npm ci
  ```

## 3. Sichtbaren Release-Namen und CLI-Version aktualisieren

- [ ] Im [Web-Footer](apps/web/app/_components/Footer.tsx) den bisherigen Release-Namen durch den neuen Anzeigenamen ersetzen. Der gemeinsame Footer wird unter anderem in Hauptansicht, Einstellungen, Anmeldung, Passwortzurücksetzung und Feedback verwendet; diese Ansichten bei der Prüfung berücksichtigen.
- [ ] Die Release-Bezeichnung in [ServiceView.tsx](apps/admin-mac/src/renderer/components/ServiceView.tsx) ebenfalls aktualisieren. Sie steht im Kopfbereich der Mac-Admin-App. Die Erwartung in den [ServiceView-Stories](apps/admin-mac/stories/ServiceView.stories.tsx) mitführen; neue Beschriftungen gegebenenfalls in beiden [Admin-Übersetzungen](apps/admin-mac/src/i18n/locales/) ergänzen.
- [ ] Die technische Electron-Version in [apps/admin-mac/package.json](apps/admin-mac/package.json), derzeit `1.0.0`, gesondert prüfen. Sie ersetzt keine sichtbare Release-Anzeige und muss eine gültige SemVer-Version bleiben. Einen ausgeschriebenen Release-Namen nicht als `version` eintragen. Bei einer Änderung auch das Root-Lockfile aktualisieren.
- [ ] Ausschließlich die öffentliche CLI um eine Minor-Version erhöhen. Dies geschieht **vor** Paket-Build, Tests und Release-Commit. Private Workspaces werden nicht pauschal mitversioniert oder veröffentlicht.

  ```bash
  npm version minor --workspace apps/cli --no-git-tag-version
  cli_version="$(node -p "require('./apps/cli/package.json').version")"
  git diff -- apps/cli/package.json package-lock.json
  ```

  Der Befehl aktualisiert die CLI-Paketversion und das Root-Lockfile. `--no-git-tag-version` verhindert einen vorzeitigen Commit und Git-Tag. Den Versionsschritt bei einem wiederholten Build desselben Release-Kandidaten nicht erneut ausführen. Siehe [npm: Versionsverwaltung](https://docs.npmjs.com/cli/commands/npm-version/).

- [ ] In [tests/cli.test.ts](tests/cli.test.ts) die fest eingetragene Erwartung für `--version` auf die neue Version aktualisieren, solange der Test diese noch nicht aus den Paketmetadaten bezieht.
- [ ] Prüfen, dass die gewählte CLI-Version in npm noch nicht veröffentlicht wurde und auf der vorgesehenen Vorgängerversion aufbaut. Ein bereits veröffentlichter Name mit derselben Version kann nicht erneut verwendet werden.

## 4. Dokumentation, Darstellung und Quellstand abschließen

- [ ] Release-Hinweise mit Änderungen, Voraussetzungen, unterstützten Plattformen, bekannten Einschränkungen und gegebenenfalls Migrationsschritten erstellen.
- [ ] Auswirkungen auf die deutsche Benutzerdokumentation prüfen. Besonders relevant sind [CLI](docs/de/cli/index.md), [Service und Mac-Admin-App](docs/de/box-admin/index.md), [XRAG-Veröffentlichung](docs/de/settings/xrag.md), [README](README.md), [CLI-README](apps/cli/README.md) und [Erstinstallation](packages/xrag/README_INITIAL_SETUP.md). `meta.source_files`, `meta.app_urls`, Navigation und betroffene Screenshots berücksichtigen; `meta.last_verified` nur bei tatsächlich geprüften Seiten ändern.
- [ ] Bei Datenbankänderungen die vorhandenen Migrations- und Typgenerierungsregeln beachten. Erforderliche Migrationen, beide generierten Typdateien und gegebenenfalls Seed-Daten und deren Tests müssen im Release enthalten sein. Einen destruktiven Seed-Reset nicht als Release- oder Produktionsschritt ausführen.
- [ ] Storybook-Typprüfung und Abdeckungsprüfung ausführen. Eine Änderung des sichtbaren Release-Namens ist eine UI-Änderung.

  ```bash
  npm run storybook:typecheck
  npm run storybook:check
  ```

- [ ] Betroffene visuelle Stories einschließlich der Verbraucher des Footers ermitteln. Die folgenden Filter decken zunächst nur die direkten Footer- und Admin-Stories ab; zusätzliche betroffene Seiten-Stories ergänzen.

  ```bash
  STORYBOOK_FILTER='^(web-footer|admin-serviceview)--' npm run storybook:visual -- --list
  STORYBOOK_FILTER='^(web-footer|admin-serviceview)--' npm run storybook:visual
  ```

- [ ] Bei erwarteten Bildunterschieden die tatsächlichen Screenshots prüfen, anschließend ausschließlich betroffene Baselines aktualisieren und denselben Testlauf ohne Snapshot-Updates wiederholen. Den standardmäßigen Linux-ARM64-Docker-Runner verwenden; keine macOS-Baselines für Linux-CI erzeugen. Laufzeitfehler und fehlgeschlagene Interaktionen sind keine zulässigen Bildänderungen.
- [ ] Alle geänderten, von Prettier unterstützten Dateien mit der lokal installierten Version formatieren. Explizite Dateipfade verwenden und Pfade mit Shell-Sonderzeichen quotieren. Beispiel für die regelmäßig betroffenen Dateien; geänderte Admin-Dateien, Übersetzungen und Dokumentation ergänzen:

  ```bash
  node_modules/.bin/prettier --write --ignore-unknown \
    apps/web/app/_components/Footer.tsx \
    apps/cli/package.json \
    package-lock.json \
    tests/cli.test.ts
  ```

- [ ] Den vorgesehenen Release-Diff einschließlich ungetrackter Dateien prüfen. Während der folgenden Builds keine Quellen bearbeiten. Der XRAG-Builder übernimmt den aktuellen Arbeitsstand einschließlich nicht ignorierter neuer Dateien; deshalb gehören private Notizen, Zugangsdaten und fremde Änderungen nicht in den Checkout.

## 5. XRAG-Setup bauen und benennen

- [ ] Artefakte außerhalb des Checkouts ablegen. Pro Plattform ein eigenes Verzeichnis verwenden, damit der geforderte Dateiname `<release-slug>.xrag.tar` auf allen Plattformen erhalten bleibt. Beispiel:

  ```bash
  release_target="$(node -p "process.platform + '-' + process.arch")"
  release_dir="$(cd .. && pwd)/aibox-releases/$release_slug/$release_target"
  mkdir -p "$release_dir"
  xrag_archive="$release_dir/$release_slug.xrag.tar"
  ```

- [ ] Sicherstellen, dass am Ziel noch kein zu bewahrendes Artefakt liegt. Bundle bauen und **nur bei erfolgreichem Build** umbenennen:

  ```bash
  test ! -e "$xrag_archive" && \
    npm run xrag:bundle && \
    mv update.xrag.tar "$xrag_archive"
  ```

  Der Builder erzeugt zunächst immer `update.xrag.tar`. Er installiert Abhängigkeiten aus dem Lockfile in einer isolierten Quellkopie, baut Service, Realtime und Container sowie auf macOS Downloads, Transcriber und Admin-App. Vorherige lokale Builds oder ein manuelles `external:downloads` sind nicht erforderlich.

  **Ein fehlgeschlagener Build lässt ein vorhandenes `update.xrag.tar` unverändert stehen.** Dieses ältere Archiv darf nicht als neues Release umbenannt oder veröffentlicht werden. Maßgeblich sind ein erfolgreicher aktueller Lauf und dessen abschließende Archivprüfung. Das Ergebnis ist ein unkomprimiertes TAR; die Endung bleibt `.xrag.tar`.

- [ ] Build-Ausgabe und die vom Builder ausgegebene SHA-256-Prüfsumme im externen Release-Verzeichnis sichern. Der Builder prüft Archivstruktur und Integrität vor der Bereitstellung.
- [ ] Metadaten im fertigen Archiv prüfen:

  ```bash
  tar -xOf "$xrag_archive" ./xrag.json
  tar -xOf "$xrag_archive" ./installation.json
  tar -xOf "$xrag_archive" ./build.json
  ```

  `xrag_type` muss `setup` sein. Plattform und Architektur müssen zum Ziel passen und zwischen den Manifesten übereinstimmen. `build.json` enthält unter anderem Toolversionen, Lockfile-Prüfsumme und Image-Digests. Der Anzeigename und der Git-Commit werden derzeit nicht automatisch als Release-Metadaten eingetragen; die Zuordnung erfolgt über Dateiname und Release-Protokoll. `xrag_version: 1` ist eine Formatversion und wird nicht pro Release erhöht.

- [ ] Eine SHA-256-Datei erstellen und mit der Build-Ausgabe abgleichen. Auf macOS beziehungsweise Systemen mit `shasum`:

  ```bash
  (
    cd "$release_dir" &&
    shasum -a 256 "$release_slug.xrag.tar" > "$release_slug.xrag.tar.sha256" &&
    shasum -a 256 -c "$release_slug.xrag.tar.sha256"
  )
  ```

  Auf Linux kann entsprechend `sha256sum` verwendet werden. Hash, Plattform und Dateigröße festhalten. Ein späterer Neubau kann aufgrund frisch aufgelöster Abhängigkeiten und Basis-Images andere Bytes erzeugen; ausschließlich das tatsächlich geprüfte Artefakt weitergeben.

## 6. CLI-Paket bauen und unabhängig prüfen

- [ ] Das öffentliche Paket aus `apps/cli` packen. `prepack` baut automatisch den Service und übernimmt dessen Runtime in `dist/service`; das Paket darf keinen Repository-Checkout oder privaten Workspace zur Laufzeit benötigen.

  ```bash
  cli_archive="$release_dir/schornai-$cli_version.tgz"
  test ! -e "$cli_archive" && \
    npm pack --workspace apps/cli --pack-destination "$release_dir"
  tar -tzf "$cli_archive"
  ```

- [ ] Inhalt kontrollieren: richtige Paketversion, ausführbarer Einstieg `bin/schornai.js` und vollständige `dist/service`-Runtime einschließlich Bootstrap, CLI-Kommandos und Installer. Keine `.env`-Dateien, privaten Schlüssel oder lokalen Konfigurationen veröffentlichen.
- [ ] Das fertige Paket außerhalb des Repositorys entpacken und mit Node.js 24 prüfen. Die folgenden Befehle installieren keine schorn.ai-Instanz:

  ```bash
  cli_check_dir="$(mktemp -d)"
  tar -xzf "$cli_archive" -C "$cli_check_dir"
  (
    cd "$cli_check_dir" &&
    node package/bin/schornai.js --version &&
    node package/bin/schornai.js --help &&
    node package/bin/schornai.js service --help
  )
  ```

  `--version` muss exakt `$cli_version` ausgeben. Der Service-Hilfeaufruf prüft zusätzlich, dass die gebündelte Runtime ohne private Workspace-Abhängigkeiten geladen werden kann.

- [ ] SHA-256-Prüfsumme auch für die `.tgz`-Datei festhalten. Später genau diese geprüfte Datei veröffentlichen; kein unbeabsichtigtes erneutes Packen aus einem inzwischen veränderten Arbeitsverzeichnis.

## 7. Vollständige Tests, Commit und CI

- [ ] Nach den letzten Quelländerungen und der Formatierung die **vollständige** Testsuite vom Repository-Root ausführen:

  ```bash
  npm test
  ```

  Dies umfasst JavaScript- und Python-Tests. Gefilterte Tests ersetzen diesen Lauf nicht. Bei Fehlern oder nicht ausführbaren Tests keinen Release-Commit erstellen. Werden zur Behebung Quellen geändert, Formatierung, betroffene Prüfungen, Paket- und Bundle-Builds wiederholen und anschließend erneut die vollständige Testsuite ausführen.

- [ ] Dokumentationsprüfung abschließen und den gesamten vorgesehenen Commit prüfen. Er darf nur die beabsichtigten Quellen, Versionen, das Lockfile, Tests, Dokumentation und freigegebenen Screenshot-Baselines enthalten. XRAG- und npm-Archive, Build-Logs und Geheimnisse nicht einchecken.

  ```bash
  git status --short
  git diff --check
  git diff
  ```

- [ ] Ausschließlich geprüfte Dateien über explizite Pfade mit `git add` aufnehmen. Auch neue Dateien berücksichtigen; anschließend den gestagten Diff prüfen und committen:

  ```bash
  git diff --cached --check
  git diff --cached
  git commit -m "release: $release_name"
  git rev-parse HEAD
  git push -u origin "release/$release_slug"
  ```

- [ ] Release-Commit, Anzeigename, Slug, CLI-Version, Plattformen, Prüfsummen und Testergebnisse im externen Release-Protokoll zusammenführen. Prüfen, dass keine nicht übernommenen Release-Quelländerungen zurückgeblieben sind.
- [ ] Falls weitere Plattformen freigegeben werden: deren Bundle-Builds auf den jeweiligen nativen Build-Rechnern **vom selben Release-Commit** ausführen und jeweils prüfen. Das bereits gebaute CLI-Paket ist plattformübergreifend; es muss dafür nicht erneut veröffentlicht werden.
- [ ] Release-PR nach `dev` zur Prüfung öffnen oder den vorhandenen Storybook-Workflow für den Release-Branch manuell ausführen. [.github/workflows/storybook-visual.yml](.github/workflows/storybook-visual.yml) läuft bei Pull Requests und `workflow_dispatch`, nicht allein durch einen Branch-Push. Alle vier Visual-Shards sowie Typ- und Abdeckungsprüfung müssen erfolgreich sein. `npm test` ersetzt diese CI-Ebenen nicht.

## 8. XRAG bereitstellen und den Bootstrap prüfen

- [ ] Genau das geprüfte Archiv unter seinem Release-Dateinamen auf das vorgesehene Hosting hochladen und die unveränderliche Download-Adresse im Release-Protokoll festhalten. Vorhandene Release-Dateien nicht mit anderen Inhalten überschreiben.
- [ ] Das Hosting-Ziel `https://schorn.ai/xrag/schornai/latest` auf dieses Archiv umschalten. Nach Möglichkeit zuerst vollständig hochladen und prüfen, dann die Zuordnung atomar wechseln. Gegebenenfalls CDN-Caches invalidieren.
- [ ] Der Endpunkt muss ohne Anmeldung das rohe Setup-Archiv oder einen HTTPS-Redirect darauf liefern. Keine HTML-Downloadseite und kein JSON-Manifest. Der Bootstrap akzeptiert höchstens fünf Redirects, ausschließlich HTTPS und keine Zugangsdaten in der URL. `Content-Type: application/x-tar` oder `application/octet-stream` ist passend.
- [ ] Den tatsächlichen Download über `latest` prüfen. Die folgende Prüfung erzwingt HTTPS auch für Redirects; danach muss die Prüfsumme mit dem freigegebenen Archiv übereinstimmen:

  ```bash
  latest_check_dir="$(mktemp -d)"
  curl --fail --location --max-redirs 5 \
    --proto '=https' --proto-redir '=https' \
    https://schorn.ai/xrag/schornai/latest \
    --output "$latest_check_dir/$release_slug.xrag.tar"
  shasum -a 256 "$latest_check_dir/$release_slug.xrag.tar"
  ```

- [ ] Auf einem frischen Testsystem der freigegebenen Zielplattform das geprüfte CLI-Paket installieren oder mit `npm exec --yes --package="/absoluter/pfad/zum/schornai-VERSION.tgz" -- schornai` ausführen. Dabei außerhalb eines Repository-Checkouts arbeiten. Der Bootstrap hat derzeit keinen konfigurierbaren Staging-Endpunkt; dieser Test verwendet die tatsächlich bereitgestellte `latest`-URL. Für Folgereleases auch die Kompatibilität der bisher veröffentlichten CLI mit dem neuen Bundle beachten.
- [ ] **Abbruch prüfen:** `n`, eine leere Eingabe oder `Strg+C` an der Rückfrage beendet den Vorgang ohne Setup-Download oder neue schorn.ai-Installationsdateien. Das davor gegebenenfalls erfolgte Herunterladen des npm-Pakets durch `npx` ist davon getrennt.
- [ ] **Erstinstallation prüfen:** Nach `y` werden Bundle und Plattform geprüft und die vollständige lokale Instanz eingerichtet. Standardmäßig: `core`, `supabase`, `document-extractor`; auf Apple Silicon zusätzlich `ollama` und `transcriber-mlx`. Node.js ab Version 24 und `openssl` müssen für den Bootstrap verfügbar sein; Linux benötigt zusätzlich seine systemseitige Docker-Laufzeit. Die übrigen Voraussetzungen in der [Betriebsanleitung](docs/de/box-admin/index.md) beachten.
- [ ] Dienststatus und Logs, Aufruf von `https://localhost`, Anmeldung, Chat und Dokumentverarbeitung prüfen. Das selbstsignierte lokale Zertifikat berücksichtigen. Auf Apple Silicon zusätzlich Ollama und Transkription mit geeigneten Modellen testen; ein installierter Dienst bedeutet nicht automatisch, dass bereits alle Modellgewichte vorhanden sind.
- [ ] Auf dem eingerichteten Test-Mac auch die gepackte Admin-App öffnen und Release-Anzeige, Start/Stop sowie Logs prüfen. Der neue Anzeigename muss sowohl dort als auch im Web-Footer sichtbar sein.
- [ ] **Bestehende Installation prüfen:** Ein erneuter Aufruf ohne Argumente gibt den Status aus. Er installiert nicht erneut und startet einen gestoppten Service nicht automatisch. Eine erkannte alte Admin-Installation wird als bestehend gemeldet; deren Migration erfolgt über den XRAG-Updateweg.
- [ ] Fehlerfälle aus der automatisierten Bootstrap-Abdeckung berücksichtigen: nicht erreichbarer Download, unpassendes oder beschädigtes Archiv und unterbrochene Installation. Vorhandene Konfiguration und Daten dürfen bei einem Wiederholungsversuch nicht ungeprüft ersetzt werden.

**Freigaberegel:** Die CLI erst veröffentlichen, wenn `latest` das passende, geprüfte Setup ausliefert und die Erstinstallation erfolgreich war. Andernfalls können Nutzer bereits die neue CLI erhalten, aber noch kein funktionierendes Setup herunterladen.

## 9. CLI manuell auf npm veröffentlichen

- [ ] Unmittelbar vor der Veröffentlichung CLI-Version, Paketprüfsumme, fertigen Release-Commit, erfolgreiche Prüfungen und Erreichbarkeit des XRAG erneut anhand des Release-Protokolls abgleichen.
- [ ] Ausschließlich das zuvor geprüfte öffentliche CLI-Archiv veröffentlichen:

  ```bash
  npm publish "$cli_archive" \
    --access public \
    --registry https://registry.npmjs.org/ \
    --tag latest
  ```

  Den Authentifizierungsdialog abschließen. Kein pauschales `npm publish --workspaces` ausführen. Das Root-Projekt und `packages/service` sind privat; das `publish`-Script der Mac-App ist ein anderer Veröffentlichungsweg und gehört nicht zu diesem npm-Schritt. Details: [npm publish](https://docs.npmjs.com/cli/commands/npm-publish/).

- [ ] Registry-Metadaten und `latest` prüfen:

  ```bash
  npm view "schornai@$cli_version" version dist.integrity --registry https://registry.npmjs.org/
  npm view schornai dist-tags --json --registry https://registry.npmjs.org/
  ```

- [ ] Auf einem separaten Testsystem außerhalb des Checkouts die veröffentlichte Version prüfen:

  ```bash
  npx --yes --package="schornai@$cli_version" schornai --version
  npx --yes schornai@latest
  ```

  `latest` muss auf die freigegebene CLI-Version zeigen. `--yes` bestätigt nur die npm-Paketbereitstellung; die schorn.ai-Rückfrage `[y/N]` vor der Erstinstallation bleibt bestehen. Abschließend auch den ausdrücklich vorgesehenen Aufruf `npx schornai` in einer frischen Umgebung prüfen, damit keine lokale Workspace-Verknüpfung oder ein alter Cache das Ergebnis verfälscht.

## 10. Bestehende Installationen aktualisieren und Release abschließen

- [ ] Vor Updates konsistente Sicherungen von Datenbank, Storage, `~/.aibox`, `docker.env`, Zertifikaten und gegebenenfalls bisheriger Mac-App sowie Docker-Volume `supabase_db-config` anlegen. Eine Kopie laufender PostgreSQL-Dateien allein ist kein konsistentes Datenbank-Backup.
- [ ] Zunächst eine repräsentative Testinstanz aktualisieren. Dasselbe geprüfte XRAG als globale Administratorin oder globaler Administrator unter **Einstellungen → XRAG hochladen** (`/settings/xrag`) veröffentlichen. Bei einer alten Box die bisherige Uploadseite verwenden. Die [Betriebsanleitung zur Migration](docs/de/box-admin/index.md) beschreibt die Übernahme von Daten und Konfiguration.
- [ ] Nach dem Upload die tatsächliche Installation in den Service- beziehungsweise Update-Logs prüfen. Eine erfolgreiche Upload-Meldung bestätigt noch keine abgeschlossene Installation. Versionsanzeige, Authentifizierung, Chat, Dokumentverarbeitung und gegebenenfalls Transkription erneut prüfen.
- [ ] Erst danach das Bundle in weiteren Instanzen beziehungsweise gemeinsamen Dateikatalogen bereitstellen. Mehrere passende Services können auf eine Katalogveröffentlichung reagieren; den Empfängerkreis vorher prüfen. Bei getrennten Plattformen die jeweiligen Artefakte verwenden.
- [ ] Beachten: Der öffentliche Bootstrap-Endpunkt, das npm-`latest`-Tag und der interne XRAG-Katalog sind drei getrennte Veröffentlichungen. Ein Upload auf `schorn.ai` aktualisiert bestehende Instanzen nicht; ein erneutes `npx schornai` zeigt dort nur den Status.
- [ ] Den geprüften Release-Branch nach `dev` zurückführen, damit Release-Anzeigen, CLI-Version, Lockfile, Dokumentation und Baselines Ausgangspunkt der weiteren Entwicklung sind. Bei Konfliktlösungen erneut Dokumentation, Formatierung und vollständige Tests vor dem Commit prüfen. Änderungen am bereits freigegebenen Release-Inhalt erfordern einen neuen geprüften Kandidaten.
- [ ] Release-Hinweise und Protokoll vervollständigen: Release-Commit, ursprünglicher `dev`-Commit, Anzeigename, Slug, CLI-Version, unterstützte Plattformen, unveränderliche Download-Adressen, Prüfsummen, Test-/CI-Ergebnisse, Veröffentlichungszeitpunkt und bekannte Einschränkungen. Archive und Prüfsummen dauerhaft aufbewahren. Einen optionalen Git-Tag auf den tatsächlichen Release-Commit setzen und dessen Namen protokollieren.

## 11. Vorgehen bei einer fehlerhaften Veröffentlichung

- [ ] Weitere Veröffentlichungen und Rollouts anhalten; betroffenen Commit, CLI-Version, Plattform und Artefakt-Hashes festhalten.
- [ ] Falls erforderlich den öffentlichen Setup-Endpunkt auf das zuvor geprüfte, zur CLI kompatible Archiv zurücksetzen und den tatsächlichen Download erneut prüfen. Dies betrifft künftige Erstinstallationen, nicht bereits aktualisierte Systeme.
- [ ] Bei einer fehlerhaften CLI gegebenenfalls das npm-`latest`-Tag auf die letzte freigegebene Version zurücksetzen. Bereits veröffentlichte Versionen nicht überschreiben; eine Korrektur erhält eine neue Versionsnummer. Eine Rücknahme des Tags entfernt keine bereits installierten Pakete.
- [ ] Bestehende Installationen anhand des dokumentierten Wiederherstellungsverfahrens und ihrer Sicherungen behandeln. Das Löschen eines aktuellen XRAG aus dem Katalog löst keinen automatischen Downgrade aus; Datenbankmigrationen sind nicht automatisch durch ein älteres Bundle rückgängig zu machen.

## Maßgebliche Implementierungen

- [Bundle-Builder](packages/xrag/update/bundleUpdate.mts) und [Quellkopie/Plattformauswahl](packages/xrag/update/build/workspace.mts)
- [Bootstrap und feste Download-URL](packages/service/src/bootstrap.ts) sowie [Erstkonfiguration](packages/service/src/initialSetup.ts)
- [CLI-Paketmetadaten](apps/cli/package.json) und [Paket-Build](apps/cli/scripts/build.mjs)
- [Web-Footer](apps/web/app/_components/Footer.tsx), [Mac-Admin-Oberfläche](apps/admin-mac/src/renderer/components/ServiceView.tsx) und [Electron-Packaging](apps/admin-mac/forge.config.ts)
- [Storybook-CI](.github/workflows/storybook-visual.yml), [Visual-Runner](scripts/storybook/visual.mjs) und [Repository-Regeln](AGENTS.md)
