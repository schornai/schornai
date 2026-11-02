# Keep installed PostgreSQL data in a Docker volume

Installed PostgreSQL now uses `supabase_db-data` instead of a host bind mount.
The November 2, 2026 incident showed filesystem permission errors on relation,
catalog and WAL files, followed by authentication timeouts. On the affected Mac,
small host-file reads were immediate while the same reads inside PostgreSQL's
container took seconds. Restarting the VM with mount notification forwarding
disabled restored operation. Those two changes were made together, so this
does not prove which triggered recovery or identify the exact filesystem bug.

The decision removes PostgreSQL's dependency on host file sharing instead of
changing global Colima configuration. The latter would affect existing Docker
ownership rules and host-to-container Ollama model notifications.
[Lima documents](https://lima-vm.io/docs/config/mount/#mount-inotify) mount
notification forwarding as experimental, and
[issue 2450](https://github.com/lima-vm/lima/issues/2450) records permission-operation
failures with virtiofs and forwarding enabled. These support isolating database
storage but are not proof of the specific incident's cause.

The [database entrypoint](../../packages/xrag/update/container/volumes/db/prepare-data.sh)
copies the entire stopped PostgreSQL 15 cluster, including WAL, into staging
inside the volume and publishes it atomically before invoking the original
image entrypoint. Compose replaces the old database container before starting
the new one; the copy must never run alongside the old database process.
This follows PostgreSQL's [filesystem backup requirements](https://www.postgresql.org/docs/15/backup-file.html).
Incomplete or incompatible clusters and symlinks require operator intervention.
The legacy contents remain read-only; SELinux mount relabeling may adjust their
security labels. Once complete, the target is authoritative and is never
overwritten by the legacy source on restart.

The trade-off is an additional copy and potentially a long first start. Supabase
startup allows 30 minutes. The CLI adds each selected Core/extractor stack's
three-minute wait and four minutes for other startup work (40 minutes at most).
A copy failure preserves the source, but cannot repair an already
inaccessible filesystem. Backups must cover the current database/volume:
reverting old Compose files would reopen stale host data. The PostgreSQL major
version and existing configuration/key volume are unchanged.
