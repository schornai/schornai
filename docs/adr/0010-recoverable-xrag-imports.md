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
The web upload queues inspection on the scheduler with one stable job ID per owner
and upload. Large archives can finish validation after the web request ends.
A single model or platform package is validated directly from its Storage stream.
Resources and collections use a local snapshot for extraction, verified against the
stream digest. The owner explicitly submits the prepared selection. Reopening an
upload reads its status. An indexed upload ID prevents concurrent import attempts.

The import commit pins each selected model or platform archive to its publication
through a foreign key to its Storage object. The artifact catalog can address an
original transfer or a prepared collection member. Existing artifact paths still
resolve in the original catalog bucket. Withdrawal and duplicate/error cleanup
release pins before removing bytes through Storage. The scheduler retries cleanup
of selections, unselected children and undo copies. Open selections expire after
one hour. See the [retention migration](../../supabase/migrations/20261121135207_retain_xrag_import_originals.sql)
and [SQL regression](../../supabase/tests/xrag_retained_artifacts.sql).
See [preparation](../../packages/database/src/xrag/prepareXRAGTransfer.ts) and
[upload lifecycle](../../supabase/migrations/20261115133603_xrag_import_export.sql).
