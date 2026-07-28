#!/usr/bin/env bash
# One-command local startup. Idempotent: safe on fresh clones and reruns.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || cp .env.example .env
[ -d node_modules ] || pnpm install

docker compose up -d --wait

pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma db seed

exec pnpm dev
