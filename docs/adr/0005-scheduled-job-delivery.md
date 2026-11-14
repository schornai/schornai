# Scheduled jobs use at-least-once delivery

The [scheduler](../../apps/realtime/src/scheduler/worker.ts) persists due dates
and claims in Postgres independently of loaded realtime documents. A process
crash retries an expired job lease, allowing periodic cleanup and future timed
operations to survive restarts. This deliberately differs from
[interactive task ownership](0003-durable-task-ownership.md), which fails
interrupted generation rather than replaying it: registered scheduler handlers
must tolerate repeated side effects, and future scheduled chat submission needs
its own durable deduplication before it can be registered.

A lease fences completion and renewal, not external side effects. Cancellation
and lease loss signal the handler to stop but cannot roll back work already sent
to another system. Repeating intervals start after successful completion and
coalesce missed occurrences, avoiding catch-up bursts after downtime.
