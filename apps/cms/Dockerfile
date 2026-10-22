# Build context is the repo root (a pnpm workspace) — see compose.yaml's
# `build.context: .` / `build.dockerfile: apps/cms/Dockerfile`. This image is
# NOT built with Next's `output: 'standalone'`: standalone tracing breaks
# `payload migrate` and the МойСклад scripts (they need the real TS sources
# and full node_modules at runtime, not a pruned trace), and pnpm's symlinked
# node_modules don't trace cleanly anyway. The runtime stage instead carries
# the whole workspace forward, node_modules included — bigger image, correct
# behavior; see docs/PLAN-docker-admin.md Step 2 for the reasoning.

FROM node:22-bookworm-slim AS base
# sharp (image processing) and @swc/core (Next's compiler) need native
# addons built for this exact base — bookworm-slim over alpine avoids the
# glibc/musl mismatch that would otherwise force rebuilding them.
#
# Runtime commands also invoke pnpm (migrations, app start and background
# daemons). `corepack enable` alone only installs a shim; on a fresh runtime
# container that shim may try to download pnpm from registry.npmjs.org. Bake
# the exact workspace pnpm version into the base layer so container startup
# never depends on registry DNS/network availability.
# COREPACK_HOME outside /root: the runtime runs as `node` (see
# docker-entrypoint.sh), and a pnpm cached under root's home would be invisible
# to it and re-downloaded at every start.
ENV COREPACK_HOME=/usr/local/share/corepack
RUN corepack enable \
  && corepack prepare pnpm@11.21.0 --activate \
  && chmod -R a+rX "$COREPACK_HOME" \
  && pnpm --version
WORKDIR /repo

# ---- deps: install only this package's workspace subgraph -----------------
FROM base AS deps
# pnpm needs every workspace package's package.json to resolve the graph,
# even filtered to one target — but not their source, so this layer only
# invalidates when a manifest changes, not on every source edit. apps/cms is
# the only workspace package left since apps/web and packages/shared-types
# were deleted (docs/PLAN-next-migration.md Stage 4).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .nvmrc ./
COPY apps/cms/package.json apps/cms/package.json
# --frozen-lockfile: refuse to silently re-resolve deps if the lockfile is
# out of date — a stale lockfile should fail the build, not drift quietly.
RUN pnpm install --frozen-lockfile --filter cms...

# ---- dev: hot-reload target, used by compose.dev.yaml ---------------------
# No COPY of apps/cms source here — compose.dev.yaml bind-mounts it over
# this layer for live editing, with an anonymous volume shadowing
# node_modules so the host's (possibly macOS-built) copy never overwrites
# this image's Linux-built native addons (sharp, @swc/core).
FROM deps AS dev
WORKDIR /repo/apps/cms
EXPOSE 3000
CMD ["pnpm", "dev"]

# ---- build: compile the Next app + regenerate Payload's import map --------
FROM deps AS build
COPY apps/cms apps/cms
# prototype.css imports docs/design-reference/spec/tokens.css
# from outside apps/cms (Next.js migration Stage 1, 2026-08-20) — without
# this, `pnpm build` below 500s/fails resolving them, since only apps/cms
# was copied into this stage. Same gap compose.dev.yaml had for `next dev`,
# fixed there via a bind mount instead (see that file's own comment).
COPY docs docs
WORKDIR /repo/apps/cms
# NEXT_PUBLIC_* values are compiled into browser bundles by Next.js, so the
# GlitchTip browser DSN/environment must exist during this build stage. A DSN
# is an ingestion endpoint, not an admin credential; the server DSN remains
# runtime-only and is not copied into the client bundle.
ARG NEXT_PUBLIC_GLITCHTIP_DSN=
ARG NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT=production
ENV NEXT_PUBLIC_GLITCHTIP_DSN=$NEXT_PUBLIC_GLITCHTIP_DSN
ENV NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT=$NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT
# DATABASE_URI isn't reachable at build time (no db service exists yet in
# the build stage) — Next's build only needs the config to be syntactically
# importable, not a live DB connection, so a bogus placeholder is enough.
# No `payload generate:importmap` step: Payload's own admin panel (/cms) is
# retired, so there is no import map to generate — the command fails outright
# when app/(payload)/cms does not exist.
ENV DATABASE_URI=postgresql://build:build@localhost:5432/build
ENV PAYLOAD_SECRET=build-time-placeholder-not-used-at-runtime
RUN pnpm generate:types
RUN pnpm build

# ---- runtime ----------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /repo/apps/cms
# Owned by `node` so the unprivileged process can write Next's runtime cache
# (.next/cache, image optimisation).
COPY --from=build --chown=node:node /repo /repo
EXPOSE 3000
# Starts as root just long enough to hand the data volumes to `node`, then
# drops to it for every command (docker-entrypoint.sh).
ENTRYPOINT ["/repo/apps/cms/docker-entrypoint.sh"]
# Migrations run before every start, including restarts of an already-
# migrated container — payload migrate is a no-op when nothing's pending.
# check:migration-drift runs first: if this database ever had `pnpm dev`'s
# push:true schema sync run against it, `payload migrate` drops into an
# interactive confirm prompt that a container with no attached stdin can
# never answer — confirmed live to hang forever, not fail, even with stdin
# redirected from /dev/null (docs/audits/2026-08-24-baseline.md, DEPLOY-001).
# The check runs the same underlying query migrate's own CLI does and fails
# fast with a real exit code and an explanation instead.
# `exec` hands PID 1's place (under compose's `init: true`) to the Next server
# itself, so `docker compose stop` delivers SIGTERM to it and in-flight
# requests finish; through `sh` and `pnpm` the signal was lost and Docker
# killed the process after the grace period (exit 137).
CMD ["sh", "-c", "pnpm check:migration-drift && pnpm payload migrate && exec ./node_modules/.bin/next start"]
