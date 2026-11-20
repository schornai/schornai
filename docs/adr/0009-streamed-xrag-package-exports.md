# Durable streamed XRAG package exports

The synchronous package exporter held a web request open while staging model
archives, copying them into a collection, and uploading that collection. Next's
development fetch cache can also materialize a Web Stream request body. This is
unsuitable for archives exceeding 100 GiB.

Saved package exports now use the artifact publication lease protocol
([ADR 0004](0004-durable-artifact-publication.md)): durable SQL jobs, exclusive
claims, 90-second renewable leases, fenced completion and at most five attempts.
This differs deliberately from non-replayable chat tasks in ADR 0003. The saved
selection is a snapshot of object IDs, not a snapshot of every object's contents.
A reclaimed export resolves current content and permissions again.

The worker resolves immutable model archives and streams their bytes straight
into a deterministic tar, verifying their digest. Resources are streamed once
into private temporary single-object archives because the collection manifest
needs their digests and sizes before any child entry. No enclosing collection is
written locally. Unknown-size resource inputs retain a one-file spool fallback;
Storage-backed repository exports supply sizes and do not use that fallback.

TUS uploads use Node HTTP with 6-MiB chunks, so they bypass Next fetch caching and
retain bounded retry buffers. Network retries within an attempt resume confirmed
offsets. Process crashes rebuild under a new attempt path rather than resuming a
stream whose source objects may have changed. This trades repeated work after a
crash for avoiding a durable full-package spool or a versioned remote snapshot of
all repository files. Abandoned TUS sessions expire in Storage; the worker removes
orphaned local attempt directories once their lease has expired and a grace period
has passed. The existing scheduler cleans completed/orphaned export objects.

The export bucket has no authenticated read policy. Only completed jobs whose
source permissions still hold receive a short-lived signed download URL. Worker
credentials and payloads are never stored in job metadata exposed to the UI.
Current user claims are intersected with the original authorized claims; short-lived
worker user tokens are regenerated for long operations. A final authorization
check precedes completion. Each attempt owns a distinct output path. If a finish
RPC's response is lost, the worker checks the recorded result before deleting it.

The current archive/Storage limit remains 200 GiB, not unlimited size. Resource
snapshots need disk capacity up to their total archive size; model-only exports
need no payload spool. Single-object exports retain their existing API.
