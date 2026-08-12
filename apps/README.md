# Playback Rental 2.0

Rewrite in progress on the `2.0` branch. Full plan: see the project plan doc
(`rosy-booping-spindle.md`) for context, architecture, and phasing.

- `apps/cms` — Payload CMS backend (Next.js shell app + Postgres). Admin UI,
  REST/GraphQL API, auth, media. МойСклад sync and the `bookings`
  domain logic are built out in Phase 1 — currently just a bare `users`
  collection so the admin panel boots.
- `apps/web` — Astro storefront. Public site, React islands for interactive
  parts (booking calendar, cart, checkout), consumes `apps/cms`'s API.
- `packages/shared-types` — TypeScript types shared between the two apps.

## Local dev setup

```bash
# one-time: Postgres (already running via `brew services start postgresql@16`
# on this machine; createdb playback_cms_dev if it doesn't exist)

pnpm install               # installs all 4 workspace projects from the repo root
cp apps/cms/.env.example apps/cms/.env   # fill in DATABASE_URI, PAYLOAD_SECRET, MOYSKLAD_API_TOKEN

pnpm --filter cms dev      # Payload admin at http://localhost:3000/admin
pnpm --filter web dev      # Astro storefront at http://localhost:4321
```

The old app (root `src/`, `server/`, etc.) is untouched and still deploys from
`prod`/`main` as before — this rewrite lives entirely under `apps/` until cutover.
