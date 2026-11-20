# Recoverable XRAG imports across SQL and Storage

XRAG import prepares an immutable selection inventory and retains undo copies
only for existing repository files that will be replaced. Incoming files go
directly from the prepared contents to their destination. It commits resource metadata, index invalidation, artifact
publication, automation events and document-processing delivery in one SQL
transaction only after every replacement succeeds. Storage cannot participate in
that transaction; durable undo and scheduler recovery replace request-local
compensating deletes, which cannot survive process termination or an unavailable
Storage service.

Reservations prevent competing file mutations and processing until commit or
complete rollback. An expired import is claimed for recovery with a new token.
The Storage API's internal copy/upload transaction preserves the signed JWT
subject as `owner_id`, but drops custom claims. A private token history therefore
fences late completions using that subject. The trigger clears the transport
subject after validation; it is not the file's owner. A real local Storage test
covers copy, rollback, stale writes and ordinary edits after commit.

This preserves existing paths and avoids copying entire repositories into new
versions, at the cost of undo copies for overwritten files. Readers may see
intermediate file replacements; there is no cross-service read snapshot. During
an outage recovery stays pending and affected writes stay blocked. Metadata is
unchanged until commit, and committed imports are never undone merely because
the HTTP success response was lost. Extraction, transcription and indexing remain
separate background tasks; their failure is not an import rollback.

The [migration](../../supabase/migrations/20261115133603_xrag_import_export.sql),
[coordinator](../../packages/database/src/xrag/importXRAGTransfer.ts),
[SQL checks](../../supabase/tests/xrag_atomic_import.sql) and
[fault-injection checks](../../tests/xrag-import-coordinator.test.ts) own these
invariants. Processing uses the existing scheduler and task-claim tombstones so a
retry cannot execute a task again after its Yjs history has been pruned.

Upload preparation discards the outer collection once its individual archives
are safely stored. Single resources retain extracted files and metadata only.
The owner-scoped inventory holds the pending selection without retaining the
original archive or adding a preparation job state machine. The UI has no archive
list and reload starts a new upload.
Successful import consumes all prepared contents, including unselected children,
and immediately removes undo copies. Cleanup failures retry through the existing
scheduler. Failed imports also discard the selection after rollback; retry requires
a new upload. Only model/platform packages enter artifact publication; pending
selections expire after one hour, enforced both by preparation and maintenance.
See [preparation](../../packages/database/src/xrag/prepareXRAGTransfer.ts) and
[upload lifecycle](../../supabase/migrations/20261115133603_xrag_import_export.sql).
