# Development

For contribution expectations, start with [CONTRIBUTING.md](../CONTRIBUTING.md).
For installing and operating a built instance, use the
[operator guide](de/box-admin/index.md). This guide covers a source checkout.
For fetch processing, search providers, and their limits, see the
[web-tools reference](web-tools.md).

## Prerequisites

- Node.js 24 or newer, npm, and Git.
- Python 3 for the full test suite.
- A running Docker engine with Compose for the local application stack.
- A configured Supabase instance with this repository's migrations and access
  token hook. Local development uses [`supabase/config.toml`](../supabase/config.toml).
- Ollama and downloaded models for local chat and embeddings, or a configured
  external model provider.
- For MLX transcription only: an Apple Silicon Mac, Python 3.13, FFmpeg, and
  Whisper model files. Core and document extraction can also run on Linux.

Windows is not a supported machine-service installation target. Tests and UI
stories do not require the application services, a database, or model credentials.

## Clone and check

```sh
git clone https://github.com/schornai/schornai.git
cd schornai
npm ci
npm test
```

For UI work, `npm run storybook:web` opens the web component environment at
`http://localhost:6006`. See [testing](testing.md) for the UI and admin books,
fixtures, browser interactions, and visual regression checks.

## Configure the local application

Configuration is deliberately private: a fresh clone has no ready-to-use service
credentials or TLS certificates. Set these up before starting the full app.

The service reads workspace `.env` and `.env.local` files; the web app also reads
`.env.development` and `.env.development.local`. Shared values in
`.service-dev/docker.env` override workspace values, and explicit process
variables take precedence over both. These files are ignored by Git.

For a shared development configuration, create `.service-dev/docker.env` with
values for your own local instance:

```dotenv
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_PUBLISHABLE_KEY=REPLACE_WITH_LOCAL_PUBLISHABLE_OR_ANON_KEY
SUPABASE_SECRET_KEY=REPLACE_WITH_LOCAL_SECRET_OR_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET=REPLACE_WITH_LOCAL_JWT_SIGNING_SECRET
SITE_URL=https://localhost:3000
REALTIME_SERVER_SECRET=REPLACE_WITH_SHARED_RANDOM_SECRET
SERVICE_API_TOKEN=REPLACE_WITH_DIFFERENT_RANDOM_TOKEN
SUPABASE_AUTH_HOOK_SECRET=v1,whsec_REPLACE_WITH_BASE64_KEY
OLLAMA_URL=http://127.0.0.1:11434
DOCUMENT_EXTRACTOR_URL=http://127.0.0.1:9998
```

The Supabase keys and signing secret must come from the same instance. Service
maps the public and private keys to the existing web/worker variable names.
Workers currently require a matching HS256 signing secret even when using newer
publishable/secret API keys. See the
[Supabase configuration guide](de/box-admin/supabase.md) for local, remote, and
Cloud deployments and the auth-hook requirements.

Generate a separate value with `openssl rand -hex 32` for each of
`REALTIME_SERVER_SECRET` and `SERVICE_API_TOKEN`. Each needs at least 32
non-whitespace characters. All participating processes share the same respective
value. Generate a separate auth-hook key with `openssl rand -base64 32` and prefix
it with `v1,whsec_`.

For the local Supabase CLI, create `supabase/.env.local` with
`CUSTOM_ACCESS_TOKEN_URI` pointing to the web app's `/api/auth/access-token`
endpoint as reachable from Supabase Auth, and `CUSTOM_ACCESS_TOKEN_SECRETS`
containing the same prefixed value as `SUPABASE_AUTH_HOOK_SECRET`. Service and the
seed-reset script load this file. When invoking the CLI manually, export these
variables in that shell first; a plain CLI invocation does not use the service's
environment loader. The web app must be reachable by the hook when signing in or
refreshing a session.

Protect the credential files with `chmod 600`. Keep private keys, service-role
keys, and signing secrets server-side; never place them in `NEXT_PUBLIC_` values.

The HTTPS proxy expects `fullkey.pem` and `privkey.pem` under
`~/.aibox/docker/volumes/api/cert`, or a directory selected by `AIBOX_CERT_DIR`.
Use a certificate valid for the hostname you open. For a local CA, trust that CA
in the browser and set `NODE_EXTRA_CA_CERTS` for Node processes that need it.
See [security and operations](de/hilfe/sicherheit-und-betrieb.md) for certificate
and credential guidance. The development entry point is `https://localhost:3000`.

## Run services

After configuring the environment and certificates, start Docker. To have the
service manage the local Supabase CLI stack as well as Core and document
extraction, use this on the first start:

```sh
npm run dev:service -- --services core,supabase,document-extractor
```

Starting a fresh local Supabase database applies migrations and loads the demo
seed. Existing local databases are preserved. Obtain that instance's API keys
and signing secret through the CLI's local status output and finish the shared
configuration before signing in; restart the development service after changing
configuration.

Alternatively, start a configured local Supabase instance separately with
`npx --yes supabase@2.120.0 start`, then run:

```sh
npm run dev:service
```

The default selection is Core and document extraction, plus the MLX transcriber
on Apple Silicon. Prepare the transcriber first or use the explicit selection
above to omit it. Core runs the web app and realtime server in watch mode and the
proxy through Compose. Document extraction also uses Compose. Logs appear in the
terminal; `Ctrl-C` stops the processes started by this invocation, including
their children. Changes to service code restart the supervisor and its services.

The first invocation creates `.service-dev/config.json`. Later starts preserve
it. `--services` only selects roles when creating a configuration; edit an
existing configuration and restart to change roles. `--config /path/config.json`
selects a different development installation.

Roles are `core`, `supabase`, `document-extractor`, `transcriber-mlx`, and `ollama`.
Supabase and Ollama remain external unless their role is selected. A Supabase
instance already running before service startup stays running after shutdown;
one started by the service is stopped with its data preserved. The service never
performs a seed reset as part of normal startup or shutdown.

Development data, logs, model files, and the control socket live under
`.service-dev`. MLX models go in
`.service-dev/mlx/whisper/models/<fileSystemIdentifier>`; Ollama manifests go in
`.service-dev/ollama/models`. With external Ollama and no shared model directory,
restart realtime after model changes.

The older `npm run dev:web` Turbo command remains available. It starts all web
services including the Mac transcriber, uses each workspace's environment, and
does not load `.service-dev/docker.env`. It requires the complete Mac setup.
For detailed service behavior and CLI control, see the
[service handbook](de/box-admin/index.md#entwicklung-mit-dem-service).

## Optional MLX transcription

On Apple Silicon, build the Python worker once and again after Python dependency
or source changes:

```sh
npm run python:install --workspace apps/transcriber-mac
npm run python:build --workspace apps/transcriber-mac
```

This creates `apps/transcriber-mac/dist/transcribe-worker/transcribe-worker`.
Installation upgrades pip and dependencies within the project's Python
environment. FFmpeg must be available for audio processing. Whisper model folder
names must match the configured model's `fileSystemIdentifier`. The standalone
worker uses `~/.aibox/mlx/whisper/models`; the development service uses the
`.service-dev` location above. Configure a separate worker using the
[macOS guide](de/box-admin/worker-macos.md).

## Local example data

The seed is for isolated development. It creates the public demo administrator
`demo@aibox.test` with password `Aibox-local-demo-2026!`, the **Lokale Entwicklung**
workspace, a test agent, an empty document repository, a transcriber, and model
configurations for `qwen3:0.6b`, `nomic-embed-text`, and `whisper-tiny`. It does not
download models or start AI services.

The agent and document repository use the local transcriber. Its initial setting
is **Ausgewogen** (up to three recognition attempts per audio segment); **Schnell**
uses one, and **Gründlich** up to six. The configurable German/English sign-in
welcome text displays the demo credentials. Sign in again after resetting.

External models are initially empty and can be added under **Modelle** with your
own provider credentials and model identifiers. No external-model, search, or
OAuth secrets are seeded. Configure optional shared provider connections under
**Einstellungen → Verbindungen**. The schorn.ai Cloud entry is a **Coming 2027**
placeholder, not an available model service.

The additional Trello test agent points at `https://mcp.trello.com/v1`. Each user
connects their own account when a tool call requests authorization. OAuth resumes
the waiting call; connections are managed at `/me/connections`. The callback
`/api/mcp/oauth/callback` must be reachable by the provider. Select a chat model
suitable for tool calls. The standard local test agent needs no external account.

To deliberately replace an existing local development dataset, first stop the
app and workers, keep Docker and local Supabase running, then:

```sh
npm run seed:reset -- --preview
npm run seed:reset
```

**The reset deletes the local database, including users, settings, chats, and
file metadata, without a backup.** It shows the target and current data, then
requires the exact interactive confirmation `RESET schornai`. Other responses
cancel. Remote Docker daemons, mismatched app targets, and non-interactive resets
are rejected. It reapplies all migrations and [`supabase/seed.sql`](../supabase/seed.sql).

Physical Storage files can remain orphaned: this is not secure file erasure.
Host models and `.env` files remain unchanged. A failed reset can leave a partial
database; fix the error before explicitly resetting again. The preview does not
print existing secrets. The script uses Supabase CLI 2.120.0 and reads
`supabase/.env.local`, with process variables taking precedence.

Seed records have stable application-format UUIDs. The seed replaces the former
unversioned `.local-setup` bootstrap and does not need it or `.test-venv`. A fresh
`supabase start` and direct CLI resets also load the seed; the additional
interactive guard belongs specifically to `npm run seed:reset`.

## Build the CLI or a setup bundle

```sh
npm run build:cli
npm run service -- status
npm run xrag:bundle
```

The [CLI README](../apps/cli/README.md) covers local commands and npm packaging.
`xrag:bundle` creates `update.xrag.tar` from the current working tree, including
local source changes. It installs from the lockfile in an isolated source
directory, fetches the pinned external binaries on Apple Silicon, prepares
Python, and builds the required apps and container images. Existing build outputs
are not reused; failures preserve the last complete bundle.

Bundle builds require Node.js 24+, npm, Git, `tar`, internet access, and a Linux
Docker engine 28.1+ with Buildx and Compose. Apple Silicon builds additionally
need Python 3.13, Xcode Command Line Tools, and `unzip`. Build on the target
platform: macOS ARM64 or Linux ARM64/x64. See the
[bundle guide](de/box-admin/index.md#setup-bundles-bauen) for resource requirements
and limitations, and [initial setup](../packages/xrag/README_INITIAL_SETUP.md) for
installing a built bundle.
