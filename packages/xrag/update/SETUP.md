# Schorn.ai in a Box Setup

## Mac Configuration

Use a unique strong account password, enable FileVault, and retain password-protected
administrator access. Do not grant unrestricted passwordless sudo. The service updates files owned by the operating account without sudo or a
host reboot. Install the optional Mac app under ~/Applications.

General > Login items & Extensions

- Add Admin App

Settings > Energy >

- Energy Mode > "High Power"
- Prevent automatic sleep: yes
- Wake for network access: yes
- Start up automatically after a power failure: yes

Settings > Users & Groups > Automatic login: Off

Settings > Lock Screen

- Start Screen Saver when inactive > After 5 minutes
- Turn display off on battery when inactive > After 5 minutes
- Turn display off on power adapter when inactive > After 5 minutes
- Require password after screen saver begins or display is turned off > Immediately

FileVault requires an authorized person to unlock the Mac after a restart. Plan
this step for power failures and maintenance windows.

## Certificate Generation

### Create certificates for kong

```bash
mkdir -p $HOME/.aibox/docker/volumes/api/cert
umask 077
openssl req -x509 -nodes -newkey rsa:2048 -keyout $HOME/.aibox/docker/volumes/api/cert/privkey.pem -out $HOME/.aibox/docker/volumes/api/cert/fullkey.pem -days 365 -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

## Docker Environment

### Create `.aibox/docker.env`

```bash
umask 077
node ./scripts/echoDockerEnv.ts "$(openssl genpkey -algorithm rsa -outform DER | base64)" > "$HOME/.aibox/docker.env"
chmod 600 "$HOME/.aibox/docker.env" "$HOME/.aibox/docker/volumes/api/cert/privkey.pem"
```

The generator creates separate random `REALTIME_SERVER_SECRET` and
`SUPABASE_AUTH_HOOK_SECRET` values. The updater adds these keys to existing
installations without replacing valid keys. Keep them private and back up the
configuration securely. See [security and operation](../../../docs/de/hilfe/sicherheit-und-betrieb.md).

## Service

For a new installation, create `~/.aibox/config.json` before running `update.mts`.
On a recognized old Admin installation the setup bundle creates it automatically:

```sh
node ./apps/service/cli.mjs service init --services core,supabase,document-extractor,ollama,transcriber-mlx
```

Choose a
smaller list for a dedicated machine. The installer preserves this configuration.
If Docker is unavailable and `docker.manageColima` is enabled, setup starts Colima
temporarily to load the selected images. It leaves an already running VM alone.
The generated `SERVICE_API_TOKEN` must match between the web host and every
consumer. Set `sharing.url` to the web application URL. Credentials for remote
workers come from that instance rather than from this generator.

Supabase uses the pinned upstream Compose file in `container/supabase`, with a
separate schorn.ai override. App containers are in `container/docker-compose.yml`.
For separate hosts, configure `endpoints.supabase`, `endpoints.realtime` and
`AUTH_HOOK_URL` as described in the [operator guide](../../../docs/de/box-admin/index.md).
