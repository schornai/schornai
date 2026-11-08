# Immutable uploads and durable artifact publication

XRAG archives can be hundreds of GiB. The previous publisher copied an upload to
staging, read the complete staging object, then copied it again to a digest path.
Publication now retains the original immutable Storage object and stores its
private location in the SQL catalog. Authenticated uploaders may create unique
upload paths but cannot overwrite or delete XRAG objects; authorized server cleanup
owns deletion. The public artifact identifier remains the SHA-256 digest.

A durable publication job owns validation. Its renewable lease permits recovery
of interrupted, idempotent inspection; this deliberately differs from chat task
recovery in [ADR 0003](0003-durable-task-ownership.md). Publication and job completion
commit together. The catalog row serializes duplicate publication with withdrawal;
a permanent tombstone prevents resurrection. An outbox records pending realtime
notifications until delivery succeeds. The SQL regressions in
`supabase/tests/artifact_publications.sql` exercise those invariants.

This introduces SQL state and a bounded worker retry policy, in exchange for
removing full-object copies and dependence on a live Server Action. Catalog
metadata is stored in indexed rows. No compatibility importer is retained.
Archives are removed through the Storage API, never by deleting Storage metadata
in SQL. Abandoned uploads are claimed after 72 hours before their bytes are removed,
so cleanup cannot race with queueing the same upload path.

The archive format remains unchanged: one `.xrag.tar` includes the setup payload.
There is no second release format or dependency catalog. This keeps upload and
installation independent of cross-artifact publication order. Setup activation
consumes extracted directories; the old directory only protects an unfinished
swap and is removed after success. A persisted publication boundary prevents
subsequent synchronization from installing an older release.
