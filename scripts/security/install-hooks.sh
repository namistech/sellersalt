#!/usr/bin/env bash

# Setup pre-commit hook for secret scanning
set -e

HOOK_DIR=".git/hooks"
PRE_COMMIT_HOOK="$HOOK_DIR/pre-commit"

if [ -d "$HOOK_DIR" ]; then
  cat << 'EOF' > "$PRE_COMMIT_HOOK"
#!/usr/bin/env bash
node scripts/security/check-secrets.js
EOF
  chmod +x "$PRE_COMMIT_HOOK"
  echo "✅ Pre-commit secret scanning hook installed successfully at $PRE_COMMIT_HOOK"
else
  echo "⚠️ .git/hooks directory not found. Skipping hook install."
fi
