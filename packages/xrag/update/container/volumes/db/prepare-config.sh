#!/bin/sh
set -eu

# Copy missing defaults without replacing keys, operator overrides or symlinks.
# Do not use cp -n: some implementations return failure when skipping a file.
copy_missing() (
  source_dir=$1
  target_dir=$2
  for source in "$source_dir"/* "$source_dir"/.[!.]* "$source_dir"/..?*; do
    [ -e "$source" ] || [ -L "$source" ] || continue
    target="$target_dir/${source##*/}"
    if [ -d "$source" ] && [ ! -L "$source" ] && [ -d "$target" ] && [ ! -L "$target" ]; then
      copy_missing "$source" "$target"
    elif [ ! -e "$target" ] && [ ! -L "$target" ]; then
      cp -a "$source" "$target"
    fi
  done
)
copy_missing /etc/postgresql-custom /config
# PostgreSQL's numeric UID/GID can change between image versions.
chown -R postgres:postgres /config
