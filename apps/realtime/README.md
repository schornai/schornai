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

## Task ownership and recovery

The coordinator records claims in Postgres. Workers renew every 20 seconds; a
claim expires after 90 seconds without renewal. Recovery runs on queue load and
every 10 seconds while that document is loaded. Database or document-persistence
failures retain pending recovery for a later attempt. Recovery requires a running
realtime server and available database.

Apply the task-claims migration and deploy the realtime server together with all
workers, including Mac transcribers. Stop old workers before starting the new
server: the previous client-side claim protocol is no longer accepted. Persisted
legacy claims are marked interrupted instead of being executed again.

See the [task ownership decision](../../docs/adr/0003-durable-task-ownership.md)
for replay limits and the [task documentation](../../docs/de/tasks/index.md)
for user recovery steps.

## Task result retention

The coordinator prunes terminal queue history every minute: 24 hours maximum,
1,000 newest entries, with a five-minute grace period for results and abort
acknowledgements. Active work is exempt. Legacy records without a usable terminal
timestamp receive the same grace starting when observed. A disconnected caller
whose result has been removed fails with `TASK_RESULT_EXPIRED`.

Database snapshots older than 24 hours are cleared in batches of 1,000 after
recovery has completed. The task ID and ownership record remain as a replay
barrier; Yjs replication metadata also remains. These limits bound retained task
payloads, not total historical metadata or the number of active tasks.

## Durable scheduler

[`startScheduler.ts`](src/scheduler/startScheduler.ts) registers trusted handlers
and recurring system jobs; [`worker.ts`](src/scheduler/worker.ts) executes them.
Apply `20261108212843_scheduled_jobs.sql` before deploying this server. The first
handler, `artifacts.cleanup`, replaces the artifact worker's cleanup timer. It
runs immediately after initial registration, then 60 seconds after each success.
Registration is idempotent across restarts and servers.

Server-side callers use `scheduleJob` and `cancelJob` in
[`database/scheduler`](../../packages/database/src/scheduler). Supply a stable
unique ID, registered kind, JSON payload and `runAt` date; optionally specify
`intervalSeconds` and `maxAttempts` (default 5). Register a handler in
`startScheduler.ts` before creating jobs for that kind. Payload validation and
resource authorization belong to that handler and its authorized entry point.
Only service-role clients can access jobs. This is infrastructure, with no UI,
MCP tool, arbitrary script execution or user-supplied handler names exposed.

Jobs survive restarts. Each server claims one job at a time, polling every second
while idle. Unknown kinds remain queued until a supporting worker is deployed.
Postgres atomically claims due work using `SKIP LOCKED`. Leases last 90 seconds
and renew every 20 seconds. Lease loss, shutdown or cancellation aborts the
handler's signal. Handlers must honor that signal and avoid unbounded operations;
a handler that never settles occupies this worker until process restart.
Cancellation removes the record; it cannot undo a side effect already in flight.

Delivery is **at least once**: a crash after a side effect but before completion
can repeat that side effect. Handlers must be idempotent, using the job ID where
appropriate; future automatic chats need durable submission deduplication before
they can safely use this scheduler. This differs deliberately from existing
interactive task recovery; see [the decision](../../docs/adr/0005-scheduled-job-delivery.md).
An old lease cannot complete or renew a newly claimed job.

Failed executions retry with exponential delays from 5 seconds up to one hour.
Expired leases also consume an attempt. Exhaustion sets `failed`; recurring jobs
also stop on exhaustion (cleanup allows 100 attempts). Inspect `scheduled_jobs`
and the sanitized `SCHEDULER_*` logs through operator database/log access. To
retry a terminal job, cancel its ID and schedule it again after resolving the
cause. Completed and failed records are retained for inspection and deduplication
until explicitly cancelled; avoid storing secrets or large data in payloads.

Intervals use completion time, so missed occurrences coalesce into one execution
after downtime and slow handlers do not create a backlog. Dates are absolute
instants; calendar cron expressions and time zones are not supported. The `chat.expire` handler implements per-chat fixed deletion deadlines. Scheduled
chat generation remains a future handler.

Behavior tests: [`scheduler.test.ts`](../../tests/scheduler.test.ts) and
[`scheduled_jobs.sql`](../../supabase/tests/scheduled_jobs.sql).

### Disappearing chats

Apply `20261108223550_disappearing_chats.sql` before deploying the web and realtime
apps and all model/chat workers together. `set_chat_expiration` checks actual chat membership and atomically updates
the deadline and scheduler lease. A stale handler cannot delete a rescheduled
chat. `begin_chat_expiration` requires the live lease and makes deletion
irreversible; database triggers fence later document persistence and uploads.
The parent and draft retain empty tombstones so old URLs cannot recreate them.
The realtime extension rejects syncs and closes loaded connections on every node.
New model tasks carry chat ownership so their prompt/result snapshots are purged
with the chat, even after their queue results were consumed. Pre-upgrade model
snapshots lack this association and retain the existing up-to-24-hour retention.

`expireChat` requests cancellation of chat/file tasks, waits for acknowledgement,
then removes chat files, participants' history entries and document access.
Failures retry through the scheduler, with the tombstone retained. After 100
attempts operators must retry the failed job as described above, preserving its
payload and parent tombstone. Backups, exports and external provider retention
are outside this operation. Repositories are unaffected. No seed reset is needed:
any new chat with the seeded demo agent can opt into deletion through its UI.
