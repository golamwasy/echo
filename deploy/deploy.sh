#!/usr/bin/env bash
# Runs on the home server every minute (cron). Pulls the images GitHub built and, only when
# one of them changed, restarts the app. The database is never touched.
# Reference copy; the server runs its own copy in ~/deploy/echo.
set -euo pipefail

cd "$(dirname "$0")"
exec 9>.deploy.lock
flock -n 9 || exit 0

BACKEND=ghcr.io/golamwasy/echo-backend:latest
FRONTEND=ghcr.io/golamwasy/echo-frontend:latest
id() { docker image inspect -f '{{.Id}}' "$1" 2>/dev/null || echo none; }

before="$(id "$BACKEND") $(id "$FRONTEND")"
docker compose pull --quiet backend frontend >/dev/null 2>&1 || { echo "$(date -Is) pull failed"; exit 1; }
after="$(id "$BACKEND") $(id "$FRONTEND")"

# Also recover when a container is missing (for example after a reboot wiped them).
running="$(docker compose ps --status running --services | grep -cxE 'backend|frontend|postgres' || true)"
if [ "$before" = "$after" ] && [ "$running" = 3 ] && [ "${1:-}" != "--force" ]; then
  exit 0
fi

echo "$(date -Is) deploying $after"
docker compose up -d --remove-orphans
echo "$(date -Is) done"
