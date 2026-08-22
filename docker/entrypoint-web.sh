#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "[entrypoint] Running prisma migrate deploy..."
  npx prisma migrate deploy || echo "[entrypoint] prisma migrate deploy finished with non-zero exit, continuing..."
fi

echo "[entrypoint] Starting SellerSalt application..."
exec node server.js
