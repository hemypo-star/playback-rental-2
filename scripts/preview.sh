#!/usr/bin/env bash
# Local visual preview: start Postgres, run the app, fill it with a demo
# catalog, and print where to look. See docs/PREVIEW.md.
#
# Stop it with Ctrl-C. The database keeps its data in a Docker volume, so
# running this again is fast and picks up where you left off; scripts/
# preview-down.sh removes it.
set -euo pipefail

cd "$(dirname "$0")/.."
REPO="$PWD"
PORT="${PREVIEW_PORT:-3000}"
DB_PORT="${PREVIEW_DB_PORT:-55432}"

# shellcheck disable=SC1091
set -a; . ./.env.preview; set +a

need() { command -v "$1" >/dev/null 2>&1 || { echo "preview: '$1' is required but not installed" >&2; exit 1; }; }
need docker
need node
# pnpm ships with Node through corepack; prefer an already-installed one.
if command -v pnpm >/dev/null 2>&1; then PNPM=(pnpm); else PNPM=(corepack pnpm); fi

COMPOSE=(docker compose --env-file .env.preview -f compose.yaml -f compose.preview.yaml)

echo "preview: starting Postgres on localhost:${DB_PORT}"
PREVIEW_DB_PORT="$DB_PORT" "${COMPOSE[@]}" up -d db

echo "preview: waiting for Postgres"
for _ in $(seq 1 60); do
  if "${COMPOSE[@]}" exec -T db pg_isready -U playback -d playback_cms >/dev/null 2>&1; then break; fi
  sleep 1
done

export DATABASE_URI="postgresql://playback:${POSTGRES_PASSWORD}@localhost:${DB_PORT}/playback_cms"
export PAYLOAD_SECRET WEB_URL="http://localhost:${PORT}"
export NOTIFICATIONS_ENABLED=false
export SMOKE_ADMIN_EMAIL="${PREVIEW_ADMIN_EMAIL}" SMOKE_ADMIN_PASSWORD="${PREVIEW_ADMIN_PASSWORD}"
# МойСклад and every notification channel are left unset on purpose: a preview
# must not be able to reach the shared account or message anyone.
unset MOYSKLAD_API_TOKEN MOYSKLAD_WEBHOOK_SECRET TELEGRAM_BOT_TOKEN VK_ACCESS_TOKEN SMTP_HOST || true

if [ ! -d "$REPO/apps/cms/node_modules" ]; then
  echo "preview: installing dependencies"
  (cd "$REPO" && "${PNPM[@]}" install --frozen-lockfile)
fi

# Raw-SQL tables (the rate limiter's, mainly) live only in migrations, not in
# Payload's generated schema, so `next dev`'s push-mode sync never creates them
# and admin login 500s without this. Migrations therefore have to run BEFORE the
# dev server ever touches a fresh database: once push has run it plants the
# sentinel row that makes `payload migrate` drop into an interactive prompt with
# nothing to answer it (see apps/cms/Dockerfile's CMD comment, DEPLOY-001).
# check:migration-drift is that same detection as a fast exit code — when it
# fails, the database has been through an earlier preview run and is migrated
# already, so there is nothing to do.
if (cd "$REPO/apps/cms" && "${PNPM[@]}" check:migration-drift >/dev/null 2>&1); then
  echo "preview: applying migrations"
  (cd "$REPO/apps/cms" && "${PNPM[@]}" payload migrate >/dev/null)
else
  echo "preview: database already initialised by an earlier run, skipping migrations"
fi

echo "preview: starting the app on http://localhost:${PORT}"
(cd "$REPO/apps/cms" && "${PNPM[@]}" exec next dev --turbo --port "$PORT") &
APP_PID=$!
trap 'kill $APP_PID 2>/dev/null || true' EXIT INT TERM

echo "preview: waiting for the app"
for _ in $(seq 1 120); do
  if curl -fsS "http://localhost:${PORT}/api/access" >/dev/null 2>&1; then break; fi
  kill -0 "$APP_PID" 2>/dev/null || { echo "preview: the app exited before it came up" >&2; exit 1; }
  sleep 1
done

echo "preview: seeding demo content"
(cd "$REPO/apps/cms" && "${PNPM[@]}" visual:seed >/dev/null && "${PNPM[@]}" preview:seed >/dev/null)

cat <<EOF

  Готово. Смотрите вживую:

    Витрина      http://localhost:${PORT}/
    Каталог      http://localhost:${PORT}/catalog
    Админка      http://localhost:${PORT}/admin
                 ${PREVIEW_ADMIN_EMAIL} / ${PREVIEW_ADMIN_PASSWORD}

  Что именно смотреть — docs/PREVIEW.md.
  Остановить — Ctrl-C. Удалить базу — scripts/preview-down.sh.

EOF

wait "$APP_PID"
