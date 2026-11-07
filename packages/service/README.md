# schorn.ai Service

One Node.js process per machine owns the configured services, restarts failed native
workers, records bounded logs and pulls matching XRAG packages from the web app.
The optional macOS launcher in `apps/admin-mac` only controls this process.

For code navigation, see [machine startup in the repository map](../../docs/architecture.md#follow-machine-startup).
[`serviceCommands.ts`](src/serviceCommands.ts) resolves what to launch;
[`services.ts`](src/services.ts) owns supervision and shutdown. Both development
and installed machines use this path.

This independent private workspace package is named
`@schornio/aibox-package-service`. The public `schornai` executable belongs to
[`apps/cli`](../../apps/cli/README.md), which bundles the service command API.

Requires Node.js 24 or newer. Docker services require Docker and Compose 2.24.4 or
newer. Roles: `core` (web app, realtime server, HTTPS proxy), `supabase`, `document-extractor`,
`ollama`, and `transcriber-mlx`. The last requires Apple Silicon macOS. Configure trusted TLS
certificates with `NODE_EXTRA_CA_CERTS` when starting the service.

```sh
npm run build:cli
npx schornai service init --services core,supabase,document-extractor,ollama,transcriber-mlx
npx schornai service start
npx schornai service sync
npx schornai service status
npx schornai service logs --follow
npx schornai service stop
```

`npm run build:service` builds only this package's runtime. `dist/commands.mjs`
exports `runServiceCLI`; `dist/cli.mjs` is the standalone entry used by the
Mac launcher and XRAG bundles. `dist/installer.mjs` installs both existing
service systems and old Admin systems, creating missing configuration only
for a recognized legacy layout. Every future bundle keeps that bootstrap path.

See the [German operator guide](../../docs/de/box-admin/index.md) for machine
configuration, remote services, credentials, setup bundles and migration.

## Development

From the repository root, run `npm run dev:service`. This watches the service
source and runs the same daemon, locks, control socket, logging, restart and stop
logic as production. `development.workspace` in the generated
`.service-dev/config.json` switches web/realtime/transcriber-mlx commands to the
existing workspace dev scripts. Proxy and Document Extractor remain Compose-managed services.
The default is `core` and `document-extractor`, plus `transcriber-mlx` on Apple Silicon; existing local Supabase
and Ollama stay external. `--services core` selects initial roles; edit an existing
config to change them. `--config PATH` selects another development installation.

The workspace's app env files supply service-specific defaults. Shared
`docker.env` and then process variables override them. Development state and model
files live beside its config, independently of `~/.aibox`. No production data is
copied automatically. `Ctrl-C` stops owned services; explicit source changes restart
the relevant watcher. Setup bundles require a separate production configuration;
they are not applied over a source development runtime.

No build is necessary to control the dev daemon from a second terminal:

```sh
node packages/service/src/main.ts service status --config .service-dev/config.json
node packages/service/src/main.ts service logs --follow --config .service-dev/config.json
node packages/service/src/main.ts service stop --config .service-dev/config.json
```

The built CLI and Mac app can control the same daemon by selecting that config.

To test artifact sharing and machine reports locally, set `sharing.url` to
`http://127.0.0.1:3003` in that config and set `SERVICE_API_TOKEN` (at least 32
non-whitespace characters) in `.service-dev/docker.env`. The shared env file
supplies the same token to web, realtime and service. Restart the dev command
after changing configuration. Open `https://localhost:3000/service` through the
development proxy so browser WebSockets reach the realtime server too.

## Artifact synchronization and machine status

With `sharing.url` and `SERVICE_API_TOKEN`, the service subscribes to the
existing Hocuspocus/Yjs server. It reconciles Storage on startup, reconnect and
artifact CRUD changes, with a serial queue shared by `service sync`. There is
no catalog polling. Failed work retries with exponential backoff (up to 60s).
`sync` queues work in an already running daemon; inspect logs or the Service page
for completion.

Sharing requires HTTPS, except for HTTP connections to the literal loopback
addresses `127.0.0.1` and `[::1]`. Remote HTTP URLs (including private networks)
are rejected when loading configuration; migrate them to HTTPS before restarting.

Web and realtime containers both require the sharing token. Remote machines use
`<sharing.url>/v2/realtime`, or the explicit `endpoints.realtime`. Local web hosts
use loopback port 9001 in production (`SERVICE_REALTIME_PORT` can override it)
and 9000 in development. The production port binds only to 127.0.0.1. This also
supports the HTTP catalog URL created when automatically migrating old boxes.

Every 10 seconds, connected machines report host CPU/GPU utilization, memory and
filesystem capacity, native-process/container status and artifact sync state.
Apple AGX, NVIDIA (`nvidia-smi`) and Linux DRM busy counters are supported where
available. Unsupported GPU counters are unavailable, never fabricated as zero.
Only the latest report per machine is retained; after 35 seconds without a report
the UI marks it offline. These are host metrics, not per-container resource usage.

Global administrators inspect machines as tiles or tables at `/service`. The Cluster menu opens a tile overview at `/cluster`
and contains Service, Tasks, and Artifacts; `/artifacts` offers tables and tiles (using Attachment components) with
deletion. Both collections share the Docrepo group/sort/view preferences pattern.
Storage owns immutable files and catalog metadata; Yjs carries a bounded CRUD log
and a separate machine-status document. Small deletion tombstones preserve release
ordering so withdrawing the newest setup cannot reactivate an older one. Already
installed files and registered models are unaffected. Unknown catalog artifact
types/versions are skipped by services that do not support them; future import
consumers can share the distribution protocol without becoming machine services.

## Supabase and workers

Core and native workers share `src/environment.ts` for local and remote Supabase
connections, including Supabase Cloud. Use `endpoints.supabase` and private
`SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` settings; legacy key names remain
supported. The web server for platform MCP and trusted realtime and transcription workers also require
`SUPABASE_JWT_SECRET` to sign user-scoped HS256 tokens in `createClientWithClaims`.
The service maps an existing `JWT_SECRET` to this setting; an explicit
`SUPABASE_JWT_SECRET` takes precedence. API keys do not replace this signing secret.
The target Supabase instance must accept these tokens, including when hosted remotely.
Keep the signing secret in the private environment file, never in browser code.
In development, selecting `supabase` uses the repository's existing CLI configuration and preserves
an already running instance. Installed boxes retain their pinned Compose stack.

See [Supabase deployment modes](../../docs/de/box-admin/supabase.md),
[worker installation on macOS](../../docs/de/box-admin/worker-macos.md) and
[worker installation on Linux](../../docs/de/box-admin/worker-linux.md). Systemd/launchd units
set `SCHORNAI_SERVICE_MANAGER` so the manager owns restarts after setup updates.
