# Playback Rental 2.0 — working notes

**Standing working instructions for Claude, project-wide** (how to carry tasks to done,
verify, when to ask) — loaded into every session via this import:

@docs/claude-working-instructions.md

Context for whoever (human or Claude) picks this branch up next. Setup/run instructions
are in `README.md`; this file is architecture and gotchas. The dated dev log has its own
file, `docs/DEV-LOG.md` (see the pointer at the bottom).

## Branches (owner's rule)

- **`dev`** — the development branch. All work, docs and tooling land here.
- **`prod`** — deploy-only, gets **code changes only**. Never push docs, `CLAUDE.md`,
  `.claude/`, CI or other dev scaffolding to it; never hand-edit it. It is regenerated
  from `dev` by `scripts/make-release.sh`, which already strips all of that.
- **`main`** — do not touch at all: no pushes, merges, or rebases.

## What this is

A full rewrite of the Playback Rental storefront + admin (camera/video equipment rental,
Kemerovo). The old app — a React/Vite SPA on self-hosted Supabase — is still the live
site; it is deployed from `main` and its source lives only there, deleted from `dev` on
2026-09-24. This tree is the new app: a single Next.js app, `apps/cms` — storefront,
custom `/admin` UI, and Payload CMS's own `/cms` admin all in one process — to be cut
over once verified end to end.

**Hazard worth knowing before you touch branches**: `.github/workflows/deploy.yml` fires
on every push to `main`, SSHes to the live VDS and runs `npm run build` (the legacy
`vite build`) plus `pm2 reload`. Since `dev` no longer contains that app, merging `dev`
into `main` would break the live deploy. Production for the rewrite goes through `prod`
and `compose.yaml`, never through that workflow.

`apps/cms` didn't start this way: Phase 2 (see `docs/DEV-LOG.md`) built the storefront as
a separate Astro app, `apps/web`, talking to Payload over REST — Payload's Local API
(direct DB access, no HTTP) only works in-process, so a two-app split meant a proxy, a
REST client, and a `CMS_INTERNAL_URL`/`PUBLIC_PAYLOAD_URL` env-var split. `docs/PLAN-next-
migration.md` folded `apps/web` into `apps/cms` (Stages 1–3) and then deleted it (Stage 4)
once nothing needed it — that whole history is in `docs/DEV-LOG.md` for the reasoning and real
bugs it surfaced, but nothing in the current tree depends on `apps/web` or
`packages/shared-types` (also deleted) anymore.

## Architecture facts worth not re-deriving

- **Products have no slug.** Routes are `/product/[id]`, not slug-based. Categories *do*
  have slugs (`/catalog/[slug]`).
- **The МойСклад account is shared across ~4 unrelated businesses.** Only the
  "PlayBack Rental" folder subtree syncs (`apps/cms/src/lib/moysklad/sync.ts`) — never
  assume every product in the account belongs to this site.
- **Rental listings are Услуга (service) entities in МойСклад, not Товар (product)** —
  services aren't inventory-tracked, so stock/quantity is cross-referenced from a
  parallel "Оборудование (для учета)" product tree, matched by stripping the "Аренда "
  name prefix (~98% match rate). This only matters inside the sync layer — the
  storefront just reads Payload's `products.quantity`.
- **The sync does partial updates** (`payload.update` with an explicit field list, not a
  full-document replace) — admin-only fields (`subtitle`, `tag`, `isKit`, `oldPrice`,
  `kitItems`, category `tag`) are never touched by a sync run. Verified, not assumed —
  re-verify with `pnpm reconcile:moysklad` if you're ever unsure after touching the sync
  module.
- **Price/availability logic is centralized in one place**: a `beforeValidate` hook on
  `orderItems` (`apps/cms/src/collections/OrderItems.ts`) recomputes `lineTotal` and
  checks availability on every save — not duplicated across call sites like the old app.
  `orders.totalPrice` is kept in sync by an `afterChange`/`afterDelete` hook on the same
  collection. Don't add pricing math anywhere else; extend this hook.
- **Selected rental dates are session-scoped** (`apps/cms/src/stores/dates.ts`,
  sessionStorage-backed) — resets per new tab/session, same behavior as the old app's
  `BookingDatesContext`. The store's initial value is always `{null, null}` on both
  server and the client's first render, with the persisted value applied a tick later —
  reading sessionStorage synchronously at module scope causes a React hydration
  mismatch (the server has no sessionStorage to agree with). Components that render
  date-derived text (`RentalDatePicker`) gate on a post-mount `mounted` flag for the
  same reason — don't remove it.
- **Payload's REST API wraps single-document create/update responses as `{ doc,
  message }`**, unlike GET which returns the document directly. Not a concern for
  `apps/cms`'s own code, which uses the Local API (`payload.create()`/`payload.update()`
  return the document directly, no wrapper) — but worth remembering if any new code ever
  talks to Payload over REST (e.g. a browser-side `fetch()`), since this exact bug once
  made checkout create orders with no items: order creation "succeeded" but `order.id`
  was `undefined` from the unwrapped `{ doc, message }` response, so the follow-up
  orderItem POST silently omitted the `order` field. `apps/web`'s old REST client had a
  `mutate<T>()` helper specifically to guard against this — see `docs/DEV-LOG.md`'s
  2026-08-20 entries if you need the history.
- **`position: fixed` modals must portal to `document.body`.** The navbar header uses
  `backdrop-filter` (the frosted-glass look), which establishes a new containing block
  for `position: fixed` descendants — a modal rendered as a normal child anywhere under
  it gets confined to the header's own box instead of the viewport. `RentalDatePicker`'s
  modal uses `createPortal`; follow that pattern for any new modal.
- **New Payload custom admin component → regenerate the import map.** After adding or
  changing an `admin.components.*` entry (`payload.config.ts`) or a collection's
  `admin.components.Cell`, run `npx payload generate:importmap` from `apps/cms`, or the
  dev server throws `PayloadComponent not found in importMap` on that route.
- **Payload's own admin UI lives at `/cms`, not `/admin`** — `/admin` is this app's
  *custom* admin UI (`apps/cms/src/app/(admin)`), a separate, unrelated set of routes.
  `payload.config.ts`'s `routes.admin: '/cms'` is what moves Payload's default off
  `/admin` so the two don't collide.

## Design system (light theme, applied 2026-08-13)

Ported from a delivered design (`Playback Rental - прокат техники.html`, a bundled
Claude Artifact — not plain HTML; see "extracting the design" below if it needs
re-reading). Tokens live in `apps/cms/src/styles/global.css` as Tailwind v4 `@theme`
values:

| Token | Value | Use |
|---|---|---|
| `--color-background` | `#EFEEEB` | page canvas |
| `--color-foreground` / `--color-primary` | `#0A0A0A` | ink text, primary buttons |
| `--color-accent` / `--color-primary-hover` | `#D62410` | the one accent color — links, hover states, savings badges |
| `--color-card` | `#FFFFFF` | card surfaces |
| `--color-muted` / `--color-muted-well` | `#F4F3F1` / `#F9F8F7` | wells, inputs |
| `--color-subtle` | `#75736E` | secondary text |
| `--font-sans` | Golos Text | self-hosted variable font, `apps/cms/public/fonts/` |

Radii: cards 22–26px, pills fully rounded. Motion: named keyframes (`bnIn`, `bnFade`,
`bnPop`, `bnRule`, `bnClip`, `bnMark`, `bnBlink`, `bnRise`, `bnBar`) in the same file.
The admin panel's accent ramp and font are remapped to match in
`apps/cms/src/app/(payload)/custom.css`.

**Extracting the design file, if it needs re-reading**: it's a self-extracting Claude
Artifact bundle, not renderable by opening it in a browser standalone (it expects a
parent frame to postMessage its content in). The actual markup/logic is base64+gzip
inside a `<script type="__bundler/manifest">` JSON blob; the real page template is a
nested `<script type="text/x-dc">` inside the (also-encoded) `__bundler/template`
entry. Decode manifest entries with `base64.b64decode` + `gzip.decompress`, then
`json.loads` the template string to get real HTML with `{{ }}` bindings.

A decoded copy already lives in `docs/design-reference/` (see its README) — re-extract
only if that goes stale. It includes the **admin** screen (`dc_script.txt`, switched via
the artifact's `defaultScreen` prop), the source for the custom admin UI in
`docs/PLAN-docker-admin.md`.

## Dev log

The dated dev log lives in [`docs/DEV-LOG.md`](docs/DEV-LOG.md) — it is history rather
than a live reference, so it is kept out of this file, which every session loads in full.
Look something up in it when you need to know why a piece of code is shaped the way it
is, or whether a bug has been seen before. Append new entries there, never rewrite old
ones. Current status is tracked separately in
[`docs/ROADMAP-CURRENT.md`](docs/ROADMAP-CURRENT.md).
