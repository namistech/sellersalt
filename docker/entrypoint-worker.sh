#!/bin/sh
set -e

echo "[entrypoint-worker] Initializing SellerSalt Worker service..."

if [ -n "$DATABASE_URL" ]; then
  echo "[entrypoint-worker] DATABASE_URL detected. Executing automated database migration check: 'npx prisma migrate deploy'..."
  if ! npx prisma migrate deploy; then
    echo "[entrypoint-worker] FATAL: 'npx prisma migrate deploy' failed with non-zero exit code!" >&2
    echo "[entrypoint-worker] Halting worker container boot to prevent background jobs running against an unmigrated database schema." >&2
    exit 1
  fi
  echo "[entrypoint-worker] Database schema verified and up-to-date."
else
  echo "[entrypoint-worker] WARNING: DATABASE_URL is not set. Skipping automated migration."
fi

echo "[entrypoint-worker] Starting background worker process..."
exec npx tsx src/workers/index.ts
