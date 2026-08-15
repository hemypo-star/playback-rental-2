# Playback Rental — 2.0

Camera and video equipment rental storefront + admin for Playback Rental (Kemerovo, Russia).
This branch (`2.0`) is a full rewrite of the production app: **Astro** storefront +
**Payload CMS** admin/backend, with product/stock data driven by **МойСклад** (the
business's existing inventory system).

> The `main`/`prod` branch (and the `src/`, `server/`, `supabase/` directories still
> present at this repo's root) is the **current live app** — a React/Vite SPA on
> self-hosted Supabase. It keeps running untouched until this rewrite is cut over.
> Everything for the rewrite lives under `apps/`.

## Monorepo layout

```
apps/
  cms/    Payload CMS 3 (Next.js shell + Postgres) — admin panel, REST/GraphQL API,
          МойСклад sync, order/pricing/availability logic
  web/    Astro storefront — catalog, product pages, cart/checkout, static pages
packages/
  shared-types/   Plain TS interfaces shared between cms and web (not generated —
                  web doesn't depend on cms's build output)
```

## Stack

- **apps/cms** — Payload CMS 3, Next.js (App Router, used only as Payload's runtime
  shell), Postgres (via `@payloadcms/db-postgres`, schema auto-pushed in dev).
- **apps/web** — Astro (server output, `@astrojs/node` standalone adapter), React
  islands (`@astrojs/react`) for interactive pieces, nanostores for cross-island
  state (cart, selected rental dates), Tailwind CSS v4.
- Both are deployed as separate services (own PM2 process each) on the same VPS.

## Local development

Prerequisites: Node, pnpm, a local Postgres instance.

```bash
pnpm install

# apps/cms/.env — copy from .env.example and fill in:
#   DATABASE_URI, PAYLOAD_SECRET, WEB_URL, MOYSKLAD_API_TOKEN,
#   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID(_2/_3), MOYSKLAD_WEBHOOK_SECRET
cd apps/cms && pnpm dev     # http://localhost:3000 — /admin for the panel

# apps/web/.env — copy from .env.example:
#   PUBLIC_PAYLOAD_URL=http://localhost:3000
cd apps/web && pnpm dev     # http://localhost:4322
```

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
