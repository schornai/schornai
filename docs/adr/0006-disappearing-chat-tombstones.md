# Disappearing chats retain empty tombstones

Chat expiry atomically fences its parent and draft before asynchronous file and
history cleanup. Empty document rows remain after deletion: physically removing
the identity would let an old URL, a stale Yjs replica or a late privileged
worker recreate the conversation. These tombstones contain no messages; database
triggers reject late uploads and discard later snapshots, while realtime guards
reject synchronization and disconnect existing readers.

The scheduler's [at-least-once delivery](0005-scheduled-job-delivery.md) means
cleanup must be retryable. Deadline changes and job ownership change together,
so an outdated lease cannot start deletion. Once the tombstone is committed,
the deadline cannot be disabled or extended. Participant access remains hidden
by RLS until cleanup removes it, preserving the identities needed to remove
shared history on retries.

New model tasks carry their chat identity so completed prompt/result snapshots
can also be purged while keeping the replay barrier from
[task ownership](0003-durable-task-ownership.md). Legacy model snapshots have no
reliable association and retain their existing 24-hour retention limit. External
provider copies, exports and backups remain outside chat expiry.

History and queue mutations are explicitly persisted under the realtime
document save mutex before acknowledging deletion, so a crash between the
normal debounced store and job completion cannot restore removed entries.
