# Playback Rental — 2.0

Camera and video equipment rental storefront + admin for Playback Rental (Kemerovo, Russia).
This branch (`2.0`) is a full rewrite of the production app: a single **Next.js** app
(storefront + admin, built on **Payload CMS 3**), with product/stock data driven by
**МойСклад** (the business's existing inventory system).

> The `main`/`prod` branch (and the `src/`, `server/`, `supabase/` directories still
> present at this repo's root) is the **current live app**. It stays untouched until
> this rewrite is cut over. Everything for the rewrite lives under `apps/cms`.

## Monorepo layout

```text
apps/
  cms/    Payload CMS 3 + Next.js — storefront, custom admin panel,
          REST/GraphQL API, МойСклад sync, order/pricing/availability logic
```

## Stack

Payload CMS 3, Next.js App Router, Postgres, Tailwind CSS v4, Docker Compose.
Storefront, custom `/admin`, Payload `/cms` and API are one application/origin.

## Local development

Recommended full-stack workflow (closest to production):

```bash
cp .env.example .env
# Fill POSTGRES_PASSWORD and PAYLOAD_SECRET.

Just want to look at the site? `./scripts/preview.sh` starts Postgres, runs
the app and fills it with a demo catalog and an admin login; add `--tunnel`
for a temporary public https URL you can open on a phone — see
`docs/PREVIEW.md`. The stack below is the full containerized dev setup.


docker compose -f compose.yaml -f compose.dev.yaml up --build
```

Open `http://localhost:8080` (or the forwarded Codespaces port 8080).
`compose.dev.yaml` deliberately disables real МойСклад reconciliation and direct
notification delivery, so ordinary local testing cannot message real recipients.

A non-Docker development path is also possible with Node, pnpm and local Postgres:

```bash
pnpm install
cd apps/cms
cp .env.example .env
pnpm dev
```

Payload's schema is pushed automatically in `pnpm dev`. After adding/changing a custom
Payload admin component, regenerate the import map:

```bash
cd apps/cms
npx payload generate:importmap
```

## МойСклад sync

Only the Playback Rental folder subtree is synced from the shared МойСклад account.
From `apps/cms`:

```bash
pnpm sync:moysklad
pnpm reconcile:moysklad
pnpm register:moysklad-webhook
```

## Notifications

n8n is not part of the 2.0 notification path. Checkout and the contact form write
notification jobs to a persistent local queue; a separate Docker worker on the VDS
delivers them directly to configured destinations:

- Telegram Bot API;
- MAX Bot API;
- SMTP (admin email + order confirmation to the customer);
- VK community messages (optional).

The public `cms` container does not receive bot/API/SMTP credentials. See
[`docs/NOTIFICATIONS.md`](docs/NOTIFICATIONS.md) for environment variables, retries,
security rules and VDS acceptance checks.

## More context

- `CLAUDE.md` — architecture notes, gotchas and design-system reference.
- `docs/ROADMAP-CURRENT.md` — current execution state and remaining owner/deployment gates.
- `docs/SMOKE-TEST-2.0.md` — manual acceptance checklist.
- `docs/NOTIFICATIONS.md` — direct notification worker configuration.
