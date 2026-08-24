# Playback Rental — 2.0

Camera and video equipment rental storefront + admin for Playback Rental (Kemerovo, Russia).
This branch (`2.0`) is a full rewrite of the production app: a single **Next.js** app
(storefront + admin, built on **Payload CMS 3**), with product/stock data driven by
**МойСклад** (the business's existing inventory system).

> The `main`/`prod` branch (and the `src/`, `server/`, `supabase/` directories still
> present at this repo's root) is the **current live app** — a React/Vite SPA on
> self-hosted Supabase. It keeps running untouched until this rewrite is cut over.
> Everything for the rewrite lives under `apps/cms`.

## Monorepo layout

```
apps/
  cms/    Payload CMS 3 + Next.js (App Router) — storefront, custom admin panel,
          REST/GraphQL API, МойСклад sync, order/pricing/availability logic
```

`apps/cms` used to be one half of a two-app split (an Astro storefront in `apps/web`
proxied to a separate Payload/Next backend) — `docs/PLAN-next-migration.md` folded the
storefront and custom admin UI into this same Next.js app, since Payload's Local API
(direct DB access, no HTTP round trip) only works in-process. `apps/web` and
`packages/shared-types` (its shared type definitions) are gone; nothing in
`apps/cms` depends on either.

## Stack

Payload CMS 3, Next.js (App Router — storefront pages, a custom `/admin` UI, and
Payload's own `/cms` admin all live in the same app), Postgres (via
`@payloadcms/db-postgres`, schema auto-pushed in dev), Tailwind CSS v4.

## Local development

Prerequisites: Node, pnpm, a local Postgres instance.

```bash
pnpm install

# apps/cms/.env — copy from .env.example and fill in:
#   DATABASE_URI, PAYLOAD_SECRET, WEB_URL,
#   MOYSKLAD_API_TOKEN, MOYSKLAD_WEBHOOK_SECRET
cd apps/cms && pnpm dev     # http://localhost:3000 — the whole site: storefront, /admin
                            # (custom admin UI), /cms (Payload's own admin)
```

Full stack (recommended — matches production): `docker compose -f compose.yaml -f
compose.dev.yaml up --build`, then open `http://localhost:8080`. See `compose.dev.yaml`'s
header comment.

Payload's Postgres schema is pushed automatically on `pnpm dev` startup (no manual
migrations in dev). After adding or changing a **custom admin component**
(`admin.components.*` entries in `payload.config.ts` or a collection's
`admin.components.Cell`), run this once from `apps/cms` or the dev server will
throw `PayloadComponent not found in importMap`:

```bash
npx payload generate:importmap
```

## МойСклад sync

Product/category data is pulled from МойСклад (only the "PlayBack Rental" folder
subtree — the account is shared with unrelated businesses). Run from `apps/cms`:

```bash
pnpm sync:moysklad              # full sync
pnpm reconcile:moysklad          # reconciliation pass (safety net for missed webhooks)
pnpm register:moysklad-webhook   # one-time: register the inbound webhook (needs a public URL)
```

## More context

- `CLAUDE.md` — architecture notes, gotchas, and design-system reference for
  whoever (human or AI) picks this codebase up next.
- Full phased build plan: `~/.claude/plans/rosy-booping-spindle.md` (not in this repo).
