#!/bin/sh
set -eu

: "${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY is required}"
: "${SUPABASE_SERVICE_KEY:?SUPABASE_SERVICE_KEY is required}"
: "${KONG_DECLARATIVE_CONFIG:?KONG_DECLARATIVE_CONFIG is required}"

# Only JWT/API-key characters may enter YAML or a sed replacement. Do not eval
# the template: keys and configuration must never become shell commands.
for key in "$SUPABASE_ANON_KEY" "$SUPABASE_SERVICE_KEY"; do
  case "$key" in
    *[!a-zA-Z0-9._-]*)
      echo "Supabase API key contains invalid characters" >&2
      exit 1
      ;;
  esac
done

umask 077
sed \
  -e "s|\$SUPABASE_ANON_KEY|$SUPABASE_ANON_KEY|g" \
  -e "s|\$SUPABASE_SERVICE_KEY|$SUPABASE_SERVICE_KEY|g" \
  /home/kong/temp.yml > "$KONG_DECLARATIVE_CONFIG"

exec /entrypoint.sh "$@"
