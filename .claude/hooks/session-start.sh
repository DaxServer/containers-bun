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
    npm install -g "bun@$REQUIRED_BUN"
  fi
fi

test -d node_modules || bun install
