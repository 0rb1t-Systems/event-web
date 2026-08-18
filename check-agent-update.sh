#!/bin/sh
set -eu

AGENT_FILE=".agent"

STAGED=$(git diff --cached --name-only 2>/dev/null || echo "")

if [ -z "$STAGED" ]; then
  exit 0
fi

if echo "$STAGED" | grep -q "^\.agent$"; then
  exit 0
fi

CRITICAL_CHANGED=$(echo "$STAGED" | grep -E \
'^(src/|package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|vite\.config\.(ts|js|mts|mjs)|tailwind\.config\.(ts|js)|tsconfig.*\.json|index\.html|\.env\.example)$' \
|| true)

if [ -n "$CRITICAL_CHANGED" ]; then
  echo ""
  echo "ERROR: Critical EventHub Web App files changed but .agent was not updated."
  echo ""
  echo "Critical files:"
  echo "$CRITICAL_CHANGED" | sed 's/^/  /'
  echo ""
  echo "Update .agent living sections + Change Log and stage it."
  echo ""
  exit 1
fi

exit 0
