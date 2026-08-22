#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "[entrypoint] Running prisma migrate deploy..."
  npx prisma migrate deploy
  echo "[entrypoint] Migration succeeded."
fi

echo "[entrypoint] Starting SellerSalt application..."
exec node server.js
