# Playback Rental 2.0 — release

Deploy-only branch. Generated from the development branch; **do not edit it by
hand** — changes belong upstream, and the next release regenerates this tree.

One Next.js application (`apps/cms`) with Payload CMS in the same process. It
serves the storefront, the operator admin at `/admin`, Payload's own admin at
`/cms`, and the REST/GraphQL API from a single origin, with Postgres for data
and МойСклад for products and stock.

## Deploy

```bash
cp .env.example .env     # fill in the values below
docker compose up -d --build
```

`compose.yaml` brings up four services: `cms` (the app, published on
`WEB_PORT`), `db` (Postgres), `notifications` (the only service given
messenger/SMTP credentials — the app itself can only enqueue jobs onto a
shared volume), and `reconcile` (the periodic МойСклад safety-net sync).

Migrations run automatically on every container start, so a deploy is
`git pull && docker compose up -d --build`. The first start also needs an
administrator: open `/admin` and register one.

Required in `.env`: `POSTGRES_PASSWORD`, `PAYLOAD_SECRET`, `WEB_URL`
(this deployment's public https URL — Payload validates request `Origin`
against it, so a wrong value breaks checkout and every admin write while
ordinary pages keep working), `WEB_PORT`, `MOYSKLAD_API_TOKEN`. Set
`TRUST_PROXY_HEADERS=true` when a reverse proxy terminates TLS in front of
the container, or the rate limiter sees every visitor as one IP.
`.env.example` lists the rest, including the notification channels.

## One-off jobs

```bash
docker compose --profile jobs run --rm sync-moysklad
docker compose --profile jobs run --rm reconcile-moysklad
docker compose --profile jobs run --rm register-moysklad-webhook
```

Products only ever originate from МойСклад: `moySkladId` is required and
read-only, so the admin can edit prices, stock flags and merchandising fields
but cannot create a product.
