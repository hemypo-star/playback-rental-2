# Playback Rental 2.0 — `apps/`

Rewrite of the Playback Rental storefront + admin, on the `2.0` branch.

There is one app here.

- `apps/cms` — a single Next.js 16 App Router application with Payload CMS 3 in
  the same process. It serves the storefront, the custom operator admin at
  `/admin`, Payload's own admin at `/cms`, and the REST/GraphQL API, from one
  origin. Postgres for data, Tailwind v4 for styling (tokens in `@theme`, no
  `tailwind.config.ts`), МойСклад for product and stock data.

`apps/web` (an Astro storefront) and `packages/shared-types` used to live here
and were deleted on 2026-08-21, once `docs/PLAN-next-migration.md` had folded
the storefront into `apps/cms`. Nothing in the tree depends on either any more.

## Local dev

The Docker path is closest to production and is the recommended one — see the
repository root `README.md`. Without Docker:

```bash
pnpm install                 # from the repo root
cd apps/cms
cp .env.example .env         # DATABASE_URI, PAYLOAD_SECRET, WEB_URL
pnpm dev                     # http://localhost:3000
```

`pnpm dev` pushes the Payload schema automatically. After adding or changing a
custom Payload admin component, regenerate the import map:

```bash
npx payload generate:importmap
```

## Where the rest is written down

- root `CLAUDE.md` — architecture facts and gotchas;
- `docs/DEV-LOG.md` — the dated dev log;
- `docs/ROADMAP-CURRENT.md` — current execution state;
- `docs/SMOKE-TEST-2.0.md` — the acceptance checklist.

The root `src/`, `server/` and `supabase/` directories are the **legacy** Vite +
Supabase app that `main`/`prod` still deploys. They are out of scope for this
rewrite and stay untouched until cutover.
