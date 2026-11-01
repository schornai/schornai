#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
BOX_ROOT="${SCHORNAI_HOME:-$HOME/.aibox}"
CURRENT_TIME=$(date -u +%Y-%m-%dT%H-%M-%SZ)
mkdir -p "$BOX_ROOT/logs/update"
if [ -n "${SCHORNAI_NODE:-}" ]; then
  NODE_BIN="$SCHORNAI_NODE"
elif [ -x "$PWD/bin/node/node" ] && [ -f "$PWD/runtime-platform" ]; then
  case "$(uname -s):$(uname -m)" in
    Darwin:arm64) BUNDLE_HOST=darwin-arm64 ;;
    Darwin:x86_64) BUNDLE_HOST=darwin-x64 ;;
    Linux:aarch64) BUNDLE_HOST=linux-arm64 ;;
    Linux:x86_64) BUNDLE_HOST=linux-x64 ;;
    *) BUNDLE_HOST=unsupported ;;
  esac
  if [ "$(cat "$PWD/runtime-platform")" = "$BUNDLE_HOST" ]; then
    NODE_BIN="$PWD/bin/node/node"
  elif [ -x "$BOX_ROOT/bin/node/node" ]; then
    NODE_BIN="$BOX_ROOT/bin/node/node"
  else
    NODE_BIN=node
  fi
elif [ -x "$BOX_ROOT/bin/node/node" ]; then
  NODE_BIN="$BOX_ROOT/bin/node/node"
else
  NODE_BIN=node
fi
"$NODE_BIN" ./update.mts 2>&1 | tee "$BOX_ROOT/logs/update/log_${CURRENT_TIME}.txt"
