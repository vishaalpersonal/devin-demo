#!/usr/bin/env bash
# One-command local startup. Idempotent: safe on fresh clones and reruns.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || cp .env.example .env
# Backfill any vars missing from an older .env (e.g. MIGRATE_DATABASE_URL).
for var in DATABASE_URL MIGRATE_DATABASE_URL; do
  grep -q "^${var}=" .env || grep "^${var}=" .env.example >> .env
done
# Migrate default-credential URLs from the old host port (5432) to 5433.
if grep -qE "(app_user:app_user|postgres:postgres)@localhost:5432/opsconsole" .env; then
  sed -i.bak 's/@localhost:5432\/opsconsole/@localhost:5433\/opsconsole/g' .env && rm -f .env.bak
fi
[ -d node_modules ] || pnpm install

docker compose up -d --wait

pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma db seed

exec pnpm dev
