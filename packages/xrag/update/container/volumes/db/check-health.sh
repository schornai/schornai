#!/bin/sh
set -eu

# pg_isready can succeed even when authentication or database-file reads fail.
# Supabase restricts SQL filesystem functions even for its postgres DB role.
# Check the file as the OS user that actually runs PostgreSQL instead.
gosu postgres head -c 1 "${PGDATA:?PGDATA is required}/global/pg_control" >/dev/null
export PGCONNECT_TIMEOUT=3
export PGOPTIONS='-c statement_timeout=3000'
exec psql -X --no-password -U postgres -h localhost -d "$POSTGRES_DB" \
  -v ON_ERROR_STOP=1 -Atc \
  "SELECT 1 FROM pg_catalog.pg_database LIMIT 1;" \
  >/dev/null
