# schorn.ai initial setup

For a complete new local instance, `npx schornai` asks for confirmation (`y/n`,
default: no) before downloading or changing files. With `y`, it downloads the latest setup from
`https://schorn.ai/xrag/schornai/latest`, creates configuration, credentials and a
localhost certificate, installs the bundle and starts the service. This requires
the upcoming CLI release and a published matching bundle at that endpoint.
Existing installations only report their status. See the
[CLI guide](../../docs/de/cli/index.md) for supported platforms and prerequisites.

For a manually configured installation or a dedicated worker:

Choose the services for each machine before installing the bundle. The Service
runs without Electron; the Mac app is an optional launcher and log viewer.

1. Install Node.js 24+ and, for container services, Docker with Compose 2.24.4+.
   On Apple Silicon macOS, the supplied bundle can also install its native binaries.
2. Extract a trusted setup bundle. Generate a configuration with a unique machine ID:

   ```sh
   node ./apps/service/cli.mjs service init --services core,supabase,document-extractor,ollama,transcriber-mlx
   ```

   Use `--services document-extractor` for a Linux worker or
   `--services transcriber-mlx` for an MLX worker. The MLX worker requires Apple Silicon macOS. Configure remote service
   endpoints and the sharing URL in `~/.aibox/config.json`.

3. For a new complete instance, create secrets and TLS certificates as described in
   [SETUP.md](update/SETUP.md). For a worker, provision the existing instance's
   credentials; do not generate a new unrelated set of keys.
4. Start Docker before installing container images. If using bundled Colima:

   ```sh
   PATH="$PWD/bin/lima/bin:$PWD/bin/docker:$PATH" ./bin/colima/colima start --memory 8
   ```

5. Install the selected components and start the service:

   ```sh
   node ./update.mts
   node "$HOME/.aibox/apps/service/cli.mjs" service start
   node "$HOME/.aibox/apps/service/cli.mjs" service logs --follow
   ```

6. Optionally copy `apps/schorn.ai Admin.app` into `~/Applications` and add it to
   login items. The app starts the same service; closing it leaves services
   running. No system reboot or sudo is performed by the updater.

For existing installations, back up the database, storage, certificates and private
configuration first. The installer stops the old Admin app/Compose project without
removing volumes. PostgreSQL stays on the existing major version. Do not run the
old Admin app and the service side by side. Pending legacy XRAG actions must be
republished through the updated web app.

Keep FileVault and password-protected administration enabled. A person must unlock
the Mac after power loss. Do not enable passwordless sudo or automatic login.
See the [operator guide](../../docs/de/box-admin/index.md).

## Updates from old Admin installations

Every current and future bundle retains the original `setup.sh` entry point and
XRAG setup type. Upload it through the old web app as usual. A recognized legacy
installation needs no prior service or config: the installer preserves its box
ID and credentials, creates the all-in-one config, replaces the launcher, and
starts the service. The matching bundled Node runtime handles older hosts.
Existing service configs are preserved. Compatibility belongs to the bundle:
the old web app delivers it through its existing update path; after migration,
the service consumes the new artifact catalog.

Complete new-machine guides: [macOS](../../docs/de/box-admin/worker-macos.md),
[Linux](../../docs/de/box-admin/worker-linux.md), and
[local/remote/Cloud Supabase](../../docs/de/box-admin/supabase.md).
