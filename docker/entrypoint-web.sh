#!/bin/sh
set -e

echo "[entrypoint-web] Initializing SellerSalt Web service..."

if [ -n "$DATABASE_URL" ]; then
  echo "[entrypoint-web] DATABASE_URL detected. Executing automated database migration check: 'npx prisma migrate deploy'..."
  if ! npx prisma migrate deploy; then
    echo "[entrypoint-web] FATAL: 'npx prisma migrate deploy' failed with non-zero exit code!" >&2
    echo "[entrypoint-web] Halting container boot to prevent running application against an unmigrated or mismatched database schema." >&2
    exit 1
  fi
  echo "[entrypoint-web] Database schema verified and up-to-date."
else
  echo "[entrypoint-web] WARNING: DATABASE_URL is not set. Skipping automated migration."
fi

echo "[entrypoint-web] Starting Next.js standalone server..."
exec node server.js
