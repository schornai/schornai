# schornai

The schorn.ai command-line application. The public npm package and executable are
both named `schornai`; service implementation remains in the separate private
workspace package `@schornio/aibox-package-service`.

Requires Node.js 24 or newer. Automatic setup and service commands are available
in the published `schornai@0.3.0` release.

```sh
npx schornai
```

Without arguments, the CLI reports an existing installation and its service
status. Otherwise it asks `Install schorn.ai ...? [y/N]` before downloading or
changing files. Only `y` (case-insensitive) proceeds; `n`, Enter, end of input or
Ctrl+C cancels. Retrying an incomplete installation asks again.
After confirmation it downloads the latest XRAG setup from
`https://schorn.ai/xrag/schornai/latest`, validates the archive and platform,
installs it and starts the service. The endpoint currently serves the November
2026 Release Candidate 2 setup for macOS ARM64. An unavailable download exits
with an error and can be retried.
The bootstrap does not send a platform or architecture to that endpoint, so
it can currently serve only one target. A macOS ARM64 bundle cannot install
Linux; Linux needs a separately built bundle for the matching architecture.

New machines get `core`, `supabase` and `document-extractor`; Apple Silicon Macs
also get `ollama` and `transcriber-mlx`. Setup creates private instance credentials
and a self-signed localhost TLS certificate. OpenSSL is required. Linux ARM64/x64
also needs a running Docker Engine and Compose 2.24.4+; the Mac bundle supplies
Docker/Colima. Other platforms are rejected before downloading. Models, mail
delivery and a public domain/certificate are configured separately.

The current source also offers first-administrator setup after a fresh installation.
It asks for an email in an interactive terminal and prints a one-time key for
`/signin/reset`, where the operator chooses their password. No mail server is
needed. The key expires after seven days. Enter or Ctrl+C skips this step.
It can be retried on an installed instance with
`npx schornai service setup-admin`. This addition is not part of the published
0.3.0 package yet; build this checkout with `npm run build:cli` to use it.
Core, a working Supabase connection, its private service credentials and `SITE_URL`
are required. Any existing user prevents bootstrap; existing accounts and roles
are never modified. Redirected input/output skips setup so keys do not enter logs.

The default installation directory is `~/.aibox`; `SCHORNAI_HOME` changes it and
`SCHORNAI_CONFIG` selects an explicit config file for the CLI; `--config` takes precedence.
Existing service configurations and credentials are preserved, including a
configuration created with `service init` before installing. Such machines keep
their selected services and must already have their required credentials.
Legacy Admin installations are reported without migration. A failed setup remains
retryable with the same command; existing installations are never automatically
updated or restarted. `--help` and `--version` do not install anything.

For explicit service management:

```sh
npx schornai service init --services core,supabase,document-extractor,ollama,transcriber-mlx
npx schornai service start
npx schornai service sync
npx schornai service status
npx schornai service logs --follow
npx schornai service stop
```

`init` creates a machine configuration without overwriting an existing one.
Service binaries and Docker images are installed by the XRAG setup bundle.
Use `--config PATH` to select another machine directory. Run
`npx schornai service --help` for the full command list.

## Local development

From the repository root:

```sh
npm run build:cli
npm start --workspace apps/cli -- service --help
```

The build compiles `packages/service` and includes that runtime in the CLI's
`dist/service` directory. The published package needs no private registry or
repository checkout. The Mac launcher and XRAG installer use the same service
build independently of the public CLI.

## Packaging and release

```sh
npm pack --workspace apps/cli
```

`prepack` builds the runtime. Review the package contents before publishing with
an authorized npm account. The service workspace itself is private and does
not claim the `schornai` npm name. Increase `apps/cli/package.json`'s version and
update the lockfile for subsequent releases.

The build also copies the repository's `LICENSE` into the package. This generated
copy is ignored by Git; update the root license rather than editing the copy.
The CLI is licensed under AGPL-3.0-only. Source code and contribution information
are available at [schornai/schornai](https://github.com/schornai/schornai).

See the [operator guide](../../docs/de/box-admin/index.md) for service selection,
credentials and automatic migration of old Admin installations through XRAG.

`service sync` asks the running daemon to reconcile artifacts immediately.
Sharing must be configured; the command reports that work was queued, while
`service logs --follow` and the web app's **Service** page show the result.
Automatic synchronization uses Yjs notifications and reconnects, not polling.
