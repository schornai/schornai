#!/bin/sh
set -eu

phase="checking PostgreSQL data"
trap 'status=$?; if [ "$status" -ne 0 ]; then printf "PostgreSQL data preparation failed while %s; the legacy database contents were not changed.\n" "$phase" >&2; fi' 0

fail() {
  printf 'PostgreSQL data preparation: %s\n' "$1" >&2
  exit 1
}

is_empty() {
  first_entry=$(find "$1" -mindepth 1 -maxdepth 1 -print -quit) || fail "Cannot inspect data directory."
  [ -z "$first_entry" ]
}

validate_cluster() {
  cluster=$1
  [ -d "$cluster" ] && [ ! -L "$cluster" ] || fail "Data must be a real directory."
  unusual=$(find "$cluster" ! -type d ! -type f -print -quit) || fail "Cannot inspect the database files."
  [ -z "$unusual" ] || fail "Symlinks, external tablespaces and special files require an explicit migration."
  [ -f "$cluster/PG_VERSION" ] || fail "Nonempty data directory has no PG_VERSION; refusing to initialize a replacement database."
  version=$(cat "$cluster/PG_VERSION") || fail "Cannot read PG_VERSION."
  [ "$version" = 15 ] || fail "Only PostgreSQL 15 data can be used by this image."
  [ -s "$cluster/global/pg_control" ] && [ -s "$cluster/global/pg_filenode.map" ] || fail "PostgreSQL control files are missing or empty."
  for directory in base global pg_commit_ts pg_dynshmem pg_logical pg_multixact pg_notify pg_replslot pg_serial pg_snapshots pg_stat pg_stat_tmp pg_subtrans pg_tblspc pg_twophase pg_wal pg_xact; do
    [ -d "$cluster/$directory" ] || fail "The PostgreSQL cluster is incomplete."
  done
  is_empty "$cluster/base" && fail "The PostgreSQL cluster has no database files."
  return 0
}

# The volume root stays mounted; publishing its child is an atomic rename.
case ${PGDATA:-} in
  /*/pgdata) ;;
  *) fail "PGDATA must be an absolute path ending in /pgdata." ;;
esac
data_root=${PGDATA%/pgdata}
[ -d "$data_root" ] && [ ! -L "$data_root" ] || fail "The PostgreSQL data volume is not mounted."
data_root=$(cd "$data_root" && pwd -P)
PGDATA=$data_root/pgdata
export PGDATA
staging=$data_root/.pgdata-import

if [ -e "$PGDATA" ] || [ -L "$PGDATA" ]; then
  [ -d "$PGDATA" ] && [ ! -L "$PGDATA" ] || fail "The destination is not a real directory."
  if ! is_empty "$PGDATA"; then
    validate_cluster "$PGDATA"
    printf 'Using the existing PostgreSQL 15 database in the Docker volume.\n'
    exec docker-entrypoint.sh "$@"
  fi
fi

legacy=${LEGACY_PGDATA:-/legacy-pgdata}
[ -d "$legacy" ] && [ ! -L "$legacy" ] || fail "The legacy data directory is not mounted."
legacy=$(cd "$legacy" && pwd -P)
case "$legacy/" in "$data_root/"*) fail "Legacy data and destination must be separate directories." ;; esac
case "$data_root/" in "$legacy/"*) fail "Legacy data and destination must be separate directories." ;; esac

# Only our reserved staging directory may be discarded after an interrupted copy.
for entry in "$data_root"/* "$data_root"/.[!.]* "$data_root"/..?*; do
  [ -e "$entry" ] || [ -L "$entry" ] || continue
  case "$entry" in
    "$PGDATA") ;;
    "$staging") [ -d "$staging" ] && [ ! -L "$staging" ] || fail "The reserved staging path is not a real directory." ;;
    *) fail "The data volume contains unrecognized files; refusing to overwrite it." ;;
  esac
done

if is_empty "$legacy"; then
  [ ! -e "$staging" ] || fail "An unfinished import exists but the legacy database is empty."
  printf 'Initializing a new PostgreSQL 15 database in the Docker volume.\n'
  exec docker-entrypoint.sh "$@"
fi

validate_cluster "$legacy"
phase="copying the stopped legacy PostgreSQL database"
if [ -d "$staging" ]; then
  printf 'Retrying an interrupted PostgreSQL data import.\n'
  rm -rf "$staging"
fi
mkdir -m 700 "$staging"
printf 'Copying the stopped PostgreSQL 15 database into the Docker volume; the original is retained.\n'
# Compose must stop the old database container before this entrypoint runs.
# Copy all files, including WAL; never follow links or change the legacy tree.
cp -a "$legacy/." "$staging/"
phase="validating the copied PostgreSQL database"
validate_cluster "$staging"
rm -f "$staging/postmaster.pid"
sync
phase="publishing the copied PostgreSQL database"
if [ -d "$PGDATA" ]; then
  rmdir "$PGDATA" || fail "The destination changed during import."
fi
[ ! -e "$PGDATA" ] && [ ! -L "$PGDATA" ] || fail "The destination changed during import."
mv "$staging" "$PGDATA"
sync
printf 'PostgreSQL data import complete; starting the database.\n'
# The pinned image handles its own postgres UID/GID, initdb and server startup.
exec docker-entrypoint.sh "$@"
