# Grant durable task ownership without automatic replay

For [FIND-002](https://trello.com/c/PNPUM82R) and
[FIND-004](https://trello.com/c/AbuMw7kL), Postgres grants the first claim for a
task ID and checks its unique owner token and live lease on renewal/completion.
Workers require an authenticated coordinator acknowledgement before starting;
Yjs carries submissions, cancellation requests and the resulting status.

An expired claim becomes an error instead of returning to pending. A worker may
have completed an external tool call before dying, so automatic retry could
repeat its effects. The same task ID is never granted another execution attempt;
this does not promise rollback or exactly-once external effects. Remaining chat
inputs are paused and only the matching generation is released. Users check the
partial result and any external effects before explicitly trying again.

A durable recovery flag remains set until the related documents are saved,
including when the coordinator restarts with an older Yjs snapshot. The trade-off
is database availability on claim/heartbeat/completion, retained task-ID records,
and an interruption instead of automatic progress during a prolonged outage.
Legacy claims without a durable owner are also interrupted during upgrade.

Terminal task payloads are subsequently pruned after recovery under
[FIND-011](https://trello.com/c/LJeSyC2W). Ownership records remain without those
payloads: deleting the task-ID barrier would allow an old replica to start the
same external effects again. Queue retention preserves fresh results briefly;
a caller disconnected beyond that window can receive an expired-result error.
