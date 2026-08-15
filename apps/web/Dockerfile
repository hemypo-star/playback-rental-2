# Build context is the repo root (a pnpm workspace) — see compose.yaml.
# output: 'server' (Astro's own standalone Node adapter, not Next's) means
# `astro build` never touches a live CMS at build time — no page here is
# `prerender: true` — so no db/cms service needs to exist during this build.

FROM node:22-bookworm-slim AS base
RUN corepack enable
WORKDIR /repo

# ---- deps: install only this package's workspace subgraph -----------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .nvmrc ./
COPY apps/web/package.json apps/web/package.json
COPY apps/cms/package.json apps/cms/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm install --frozen-lockfile --filter apps-web...

# ---- dev: hot-reload target, used by compose.dev.yaml ---------------------
FROM deps AS dev
WORKDIR /repo/apps/web
EXPOSE 4321
CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "4321"]

# ---- build ------------------------------------------------------------
FROM deps AS build
COPY apps/web apps/web
COPY packages/shared-types packages/shared-types
WORKDIR /repo/apps/web
RUN pnpm build

# ---- runtime ------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /repo/apps/web
COPY --from=build /repo /repo
EXPOSE 4321
CMD ["pnpm", "start"]
