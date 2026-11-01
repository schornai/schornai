# Realtime server and workers

[`server.ts`](server.ts) starts the Hocuspocus/Yjs server, configures document
authentication and persistence, and launches the chat, file-processing, and model
workers. Shared document protocols and queue logic live in
[`packages/realtime`](../../packages/realtime/src); database operations live in
[`packages/database`](../../packages/database/src).

Start with the [repository map](../../docs/architecture.md) to follow chat
submission, OAuth resumption, file processing, and their behavior tests. The
[development guide](../../docs/development.md) covers local startup and credentials.

## Model changes

The realtime server watches the Ollama manifests and notifies its task queues
through a shared `EventTarget`.

Set `OLLAMA_MODELS` to the actual Ollama model directory. It defaults to
`~/.aibox/ollama/models`, matching the Box launcher in
[`serviceCommands.ts`](../../packages/service/src/serviceCommands.ts). The `manifests` subdirectory must
exist before starting the realtime server.

The Box starts Docker Compose with `--project-directory ~/.aibox/docker`.
Consequently the relative bind mount `../ollama/models` resolves to
`~/.aibox/ollama/models` on the host. Inside the realtime container it is mounted
read-only at `/ollama/models`, and `OLLAMA_MODELS` points there. When starting
Compose manually, use the same project directory or adapt the host mount path.

A recursive filesystem watcher publishes a change event after manifest changes
settle for 250 ms. Queues reload their capabilities at startup and on those
notifications, including when idle with pending tasks. Busy workers reload before
claiming their next task. There is no periodic model-list polling. Failed model
queries retry with exponential backoff (1–30 seconds), retaining the last known
capabilities. Successful discovery cancels retries.

The filesystem must deliver change notifications, including across a container
mount. A remote Ollama server without access to its model directory needs a
shared event-capable mount or a service restart after model changes. Blob writes
alone do not trigger refreshes. Watcher failures terminate the realtime process
with a nonzero exit code; the bundled Compose service uses `restart: on-failure`.
