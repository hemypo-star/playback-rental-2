#!/bin/sh
# Container entrypoint for a hosted preview (Render, Railway, Fly — anything
# that runs apps/cms/Dockerfile and injects PORT). Replaces the Dockerfile's
# own CMD via the platform's start-command setting; see docs/DEPLOY-PREVIEW.md.
#
# It exists for three things a plain `pnpm start` cannot do on a PaaS.
#
# It lives here, next to the package it starts, rather than in the repo's
# /scripts — the image's build stage copies apps/cms and docs and nothing
# else, so a root-level entrypoint would simply not be in the image. The
# runtime WORKDIR is /repo/apps/cms, which is also why every `pnpm` call
# below resolves against this package's scripts.
set -e

# 1. WEB_URL has to be the service's real public origin. Payload validates the
#    request Origin against it, so if it is wrong or unset every Server Action
#    — checkout, every admin mutation — fails with a bare "Unauthorized" while
#    ordinary page renders keep working. Platforms publish their own URL under
#    different names, and an explicitly configured WEB_URL still wins (that is
#    what a custom domain needs).
if [ -z "${WEB_URL:-}" ]; then
  if [ -n "${RENDER_EXTERNAL_URL:-}" ]; then
    WEB_URL="$RENDER_EXTERNAL_URL"
  elif [ -n "${RAILWAY_PUBLIC_DOMAIN:-}" ]; then
    WEB_URL="https://$RAILWAY_PUBLIC_DOMAIN"
  elif [ -n "${FLY_APP_NAME:-}" ]; then
    WEB_URL="https://$FLY_APP_NAME.fly.dev"
  else
    echo "start-hosted: set WEB_URL to this service's public https URL" >&2
    exit 1
  fi
  export WEB_URL
fi
echo "start-hosted: WEB_URL=$WEB_URL"

# 2. Migrations, same order and reasoning as the Dockerfile's own CMD: the
#    drift check turns a database that has had `pnpm dev`'s push-mode sync run
#    against it into a fast, loud failure instead of `payload migrate` hanging
#    forever on an interactive prompt no container can answer (DEPLOY-001).
pnpm check:migration-drift
pnpm payload migrate

# 3. Demo content. Opt-in via PREVIEW_SEED=1. The full seed runs only into an
#    empty catalog, so a redeploy or a restart never overwrites what is in
#    there — including anything edited through the admin afterwards.
#
#    The media repair runs every boot regardless, because a free hosting plan
#    gives the container no persistent disk: the database keeps the media rows
#    while the files under MEDIA_STATIC_DIR are gone, which without this is a
#    homepage carousel of broken images. It re-uploads only what is actually
#    missing.
if [ "${PREVIEW_SEED:-}" = "1" ]; then
  if pnpm tsx src/scripts/is-catalog-empty.ts; then
    echo "start-hosted: seeding demo content"
    pnpm visual:seed
    pnpm preview:seed
  else
    echo "start-hosted: catalog is not empty, checking demo images only"
    pnpm preview:seed:media
  fi
fi

exec pnpm start
