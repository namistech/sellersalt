#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "[entrypoint-worker] Running prisma migrate deploy..."
  npx prisma migrate deploy
  echo "[entrypoint-worker] Migration succeeded."
fi

echo "[entrypoint-worker] Starting SellerSalt background worker..."
exec npx tsx src/workers/index.ts
