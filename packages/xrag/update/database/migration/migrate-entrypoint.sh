#!/bin/sh
set -eu

: "${POSTGRES_DSN:?POSTGRES_DSN is required}"
# npm run echoes arguments (including the database password) to stdout.
# Feature branches can introduce older timestamps after newer migrations shipped.
# Apply missing history entries, including those older migrations; never repair
# history automatically or suppress SQL failures.
exec ./node_modules/.bin/supabase db push --include-all --yes --db-url "$POSTGRES_DSN"
