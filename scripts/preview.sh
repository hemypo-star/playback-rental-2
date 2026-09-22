#!/usr/bin/env bash
# Local visual preview: start Postgres, run the app, fill it with a demo
# catalog, and print where to look. See docs/PREVIEW.md.
#
#   ./scripts/preview.sh              on this machine, http://localhost:3000
#   ./scripts/preview.sh --tunnel     also publish a temporary public https link
#
# Stop it with Ctrl-C. The database keeps its data in a Docker volume, so
# running this again is fast and picks up where you left off; scripts/
# preview-down.sh removes it.
set -euo pipefail

cd "$(dirname "$0")/.."
REPO="$PWD"
PORT="${PREVIEW_PORT:-3000}"
DB_PORT="${PREVIEW_DB_PORT:-55432}"
TUNNEL=0
for arg in "$@"; do
  case "$arg" in
    --tunnel) TUNNEL=1 ;;
    -h|--help) sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "preview: unknown argument '$arg'" >&2; exit 2 ;;
  esac
done
# A password the script generated is only the default. An explicitly exported
# PREVIEW_ADMIN_PASSWORD still wins, since .env.preview is sourced without
# overriding the real environment below.
ENV_ADMIN_PASSWORD="${PREVIEW_ADMIN_PASSWORD:-}"

# shellcheck disable=SC1091
set -a; . ./.env.preview; set +a
[ -n "$ENV_ADMIN_PASSWORD" ] && PREVIEW_ADMIN_PASSWORD="$ENV_ADMIN_PASSWORD"

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

PUBLIC_URL=""
if [ "$TUNNEL" = 1 ]; then
  # cloudflared quick tunnels need no account. Its URL has to be known before
  # the app starts: WEB_URL is what Payload validates Origin against, so a
  # mismatch makes every Server Action (checkout, every admin mutation) fail
  # with a bare "Unauthorized" — the exact trap the 2026-08-20 dev log
  # root-caused. cloudflared happily starts before anything listens on $PORT.
  CF="$(command -v cloudflared || true)"
  if [ -z "$CF" ]; then
    CF="$REPO/.cache/cloudflared"
    if [ ! -x "$CF" ]; then
      case "$(uname -s)-$(uname -m)" in
        Linux-x86_64)  CF_ASSET=cloudflared-linux-amd64 ;;
        Linux-aarch64) CF_ASSET=cloudflared-linux-arm64 ;;
        Darwin-arm64)  CF_ASSET=cloudflared-darwin-arm64.tgz ;;
        Darwin-x86_64) CF_ASSET=cloudflared-darwin-amd64.tgz ;;
        *) echo "preview: --tunnel needs cloudflared; install it and retry" >&2; exit 1 ;;
      esac
      echo "preview: fetching cloudflared"
      mkdir -p "$REPO/.cache"
      if [ "${CF_ASSET##*.}" = tgz ]; then
        curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/$CF_ASSET" \
          | tar -xzO cloudflared > "$CF"
      else
        curl -fsSL -o "$CF" "https://github.com/cloudflare/cloudflared/releases/latest/download/$CF_ASSET"
      fi
      chmod +x "$CF"
    fi
  fi

  CF_LOG="$(mktemp -t preview-tunnel.XXXXXX)"
  "$CF" tunnel --no-autoupdate --url "http://localhost:${PORT}" > "$CF_LOG" 2>&1 &
  CF_PID=$!
  trap 'kill $CF_PID 2>/dev/null || true' EXIT INT TERM
  echo "preview: opening a public tunnel"
  for _ in $(seq 1 60); do
    PUBLIC_URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$CF_LOG" | head -1 || true)"
    [ -n "$PUBLIC_URL" ] && break
    kill -0 "$CF_PID" 2>/dev/null || break
    sleep 1
  done
  if [ -z "$PUBLIC_URL" ]; then
    echo "preview: could not get a tunnel URL. cloudflared needs outbound TCP on port 7844;" >&2
    echo "         a network that only allows 443 will block it. Log: $CF_LOG" >&2
    exit 1
  fi
  # A public URL with a password out of a committed file is a bad pairing, so
  # unless one was exported explicitly, use a fresh random one.
  if [ -z "$ENV_ADMIN_PASSWORD" ]; then
    PREVIEW_ADMIN_PASSWORD="$(node -e "console.log(require('crypto').randomBytes(12).toString('base64url'))")"
  fi
fi

export DATABASE_URI="postgresql://playback:${POSTGRES_PASSWORD}@localhost:${DB_PORT}/playback_cms"
export PAYLOAD_SECRET WEB_URL="${PUBLIC_URL:-http://localhost:${PORT}}"
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

if [ -n "$PUBLIC_URL" ]; then
  # next dev refuses cross-origin requests it was not told about, and a shared
  # link deserves the real thing anyway.
  echo "preview: building the app (a public link serves a production build)"
  (cd "$REPO/apps/cms" && "${PNPM[@]}" exec next build)
  echo "preview: starting the app"
  (cd "$REPO/apps/cms" && "${PNPM[@]}" exec next start --port "$PORT") &
else
  echo "preview: starting the app on http://localhost:${PORT}"
  (cd "$REPO/apps/cms" && "${PNPM[@]}" exec next dev --turbo --port "$PORT") &
fi
APP_PID=$!
trap 'kill $APP_PID ${CF_PID:-} 2>/dev/null || true' EXIT INT TERM

echo "preview: waiting for the app"
for _ in $(seq 1 120); do
  if curl -fsS "http://localhost:${PORT}/api/access" >/dev/null 2>&1; then break; fi
  kill -0 "$APP_PID" 2>/dev/null || { echo "preview: the app exited before it came up" >&2; exit 1; }
  sleep 1
done

echo "preview: seeding demo content"
(cd "$REPO/apps/cms" && "${PNPM[@]}" visual:seed >/dev/null && "${PNPM[@]}" preview:seed >/dev/null)

BASE="${PUBLIC_URL:-http://localhost:${PORT}}"
cat <<EOF

  Готово. Смотрите вживую:

    Витрина      ${BASE}/
    Каталог      ${BASE}/catalog
    Админка      ${BASE}/admin
                 ${PREVIEW_ADMIN_EMAIL} / ${PREVIEW_ADMIN_PASSWORD}

  Что именно смотреть — docs/PREVIEW.md.
  Остановить — Ctrl-C. Удалить базу — scripts/preview-down.sh.
EOF
if [ -n "$PUBLIC_URL" ]; then
cat <<EOF
  Ссылка временная: живёт, пока запущен этот скрипт, и её видит любой,
  у кого она есть. Пароль админки сгенерирован для этого запуска.
  Локально сайт при этом доступен и на http://localhost:${PORT}/.

EOF
else
echo
fi

wait "$APP_PID"
