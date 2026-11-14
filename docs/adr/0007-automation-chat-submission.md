# Fence automation chat submission before external side effects

The [scheduler's at-least-once delivery](0005-scheduled-job-delivery.md) can retry
a handler after a crash. Personal automations therefore persist an occurrence
and stable activity ID, then atomically mark the run started under its live job
lease before invoking the shared chat submission operation. A repeated started
run is recorded as interrupted rather than replayed: preventing duplicate chat
and tool side effects takes precedence over transparently retrying an ambiguous
submission. This leaves an explicit failure window between the fence and chat
queueing; exactly-once delivery across Postgres and realtime documents is not
claimed. File-readiness retries happen before that fence.

Storage object mutations and their pending runs are recorded in one transaction.
Definitions and histories belong to the creating user. Workers resolve current
permissions before execution and retain the MCP ceiling used when saving, so
neither stale roles nor a scheduler's service credential grant additional access.
