#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Install the Bun version declared in engines.bun
REQUIRED_BUN=$(python3 -c "import json; print(json.load(open('package.json')).get('engines', {}).get('bun', ''))" 2>/dev/null || echo "")

if [ -n "$REQUIRED_BUN" ]; then
  CURRENT_BUN=$(bun --version 2>/dev/null || echo "none")
  if [ "$CURRENT_BUN" != "$REQUIRED_BUN" ]; then
    echo "Installing Bun $REQUIRED_BUN (current: $CURRENT_BUN)..."
    ARCH=$(uname -m)
    case "$ARCH" in
      x86_64)  BUN_ARCH="x64" ;;
      aarch64) BUN_ARCH="aarch64" ;;
      *)        echo "Unsupported arch: $ARCH"; exit 1 ;;
    esac
    ZIP="/tmp/bun-linux-${BUN_ARCH}.zip"
    curl -fsSL "https://github.com/oven-sh/bun/releases/download/bun-v${REQUIRED_BUN}/bun-linux-${BUN_ARCH}.zip" -o "$ZIP"
    unzip -ojq "$ZIP" "bun-linux-${BUN_ARCH}/bun" -d "$(dirname "$(which bun)")"
    rm "$ZIP"
  fi
fi

test -d node_modules || bun install
