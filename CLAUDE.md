# Playback Rental 2.0 — working notes

Context for whoever (human or Claude) picks this branch up next. Setup/run instructions
are in `README.md`; this file is architecture, gotchas, and a running dev log.

## What this is

A full rewrite of the Playback Rental storefront + admin (camera/video equipment rental,
Kemerovo). Old app: React/Vite SPA + self-hosted Supabase, on `main`/`prod`, still live.
New app: a single Next.js app, `apps/cms` — storefront, custom `/admin` UI, and Payload
CMS's own `/cms` admin all in one process — on this branch (`2.0`), cut over once verified
end-to-end.

`apps/cms` didn't start this way: Phase 2 (see the dev log below) built the storefront as
a separate Astro app, `apps/web`, talking to Payload over REST — Payload's Local API
(direct DB access, no HTTP) only works in-process, so a two-app split meant a proxy, a
REST client, and a `CMS_INTERNAL_URL`/`PUBLIC_PAYLOAD_URL` env-var split. `docs/PLAN-next-
migration.md` folded `apps/web` into `apps/cms` (Stages 1–3) and then deleted it (Stage 4)
once nothing needed it — that whole history is in the dev log for the reasoning and real
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
  `mutate<T>()` helper specifically to guard against this — see the 2026-08-20 dev log
  entries if you need the history.
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

- **2026-08-12** — Phases 0–1 done (МойСклад spike, Payload backend + sync). Phase 2
  (Astro storefront) started with a self-directed dark theme, no design delivered yet.
- **2026-08-13** — Design delivered. Full storefront visual rewrite to the light theme
  above (foundation → chrome → home → catalog → product → cart → date picker modal),
  plus new features the design implied: kits (`isKit`/`kitItems`/`oldPrice` on
  `products`), all non-catalog copy moved into `SiteSettings` (hero, stats, steps, CTA,
  contact — previously hardcoded and duplicated between `Footer.astro` and the
  homepage), and three new admin views (Stock status badge on the existing Products
  list, Clients — orders grouped by customer contact, Analytics — revenue by category).
  Found and fixed the `mutate()`/hydration-mismatch/portal bugs above along the way.
  Scope explicitly deferred: blog/content management, a real client/CRM collection with
  document upload, and an off-hours pickup surcharge (all considered and declined with
  the owner in favor of the simpler real alternatives documented above).
- **2026-08-14** — Started `docs/PLAN-docker-admin.md` (custom admin UI on headless
  Payload + Docker + single port). Step 1 (proxy infra) done and verified against a real
  login+save through the proxy: compression bug fixed in `middleware.ts` (was copying
  `content-encoding: gzip` from a response undici had already decompressed — real bug,
  but turned out not to be the cause of the unstyled-admin symptom); `serverActions
  .allowedOrigins` added so `/cms` form saves survive the proxy's Origin rewrite;
  `apps/web/src/lib/payload.ts` split into a server-side base (`CMS_INTERNAL_URL`) and a
  browser-side one (`PUBLIC_PAYLOAD_URL`, same-origin) so Docker-internal hostnames never
  leak into the client bundle or rendered `<img>` tags; Payload's own admin moved from
  `/admin` to `/cms` (`routes.admin`, folder rename, importmap regen) to free up `/admin`
  for the future custom UI. **Actual root cause of the long-standing unstyled-admin bug**
  (documented as unresolved on 2026-08-13): `apps/cms/src/app/(payload)/layout.tsx` never
  imported `@payloadcms/next/css` — Payload does not auto-inject its own precompiled admin
  stylesheet, the consuming app must import it. Without it, every component class (`.btn`,
  `.card`, `.login`, ...) was present and correctly applied, but every property referencing
  a `--theme-*` custom property (all of them) computed as invalid/transparent, since that
  stylesheet is also where those properties get defined. Also added `apps/cms/postcss
  .config.js` (mirrors the one `apps/web` already had) so Next's postcss-load-config stops
  walking up to the legacy root app's v3-era `tailwind.config.ts` — real bug (confirmed via
  a stray "content option is missing" warning) but a red herring for this specific symptom,
  since Tailwind only transforms `@tailwind`/`@apply` and Payload's CSS has neither.
  Also audited feature parity against the **live** `prod` branch (not `main`, which is
  stale and unused — confirmed 88 files/~5500 lines diverged, including pricing, which
  turned out to already match: `prod` also uses flat per-day pricing, no tiered
  discounts, so no change was needed there). Real gaps found: a promotion detail page
  (`/promotions/:slug`, content + linked products/categories) exists on `prod` but not
  yet in 2.0 (tracked as a follow-up). Replaced the direct Telegram Bot API integration
  (`apps/cms/src/lib/telegram/notify.ts`, deleted) with a generic webhook POST
  (`apps/cms/src/lib/notifications/webhook.ts`, `NOTIFICATION_WEBHOOK_URL`) for both
  order and contact notifications — the owner is wiring these into an n8n workflow
  instead of Telegram directly; payload shape for `order.created` matches what `prod`'s
  `sendOrderWebhookDirect` already sends, in case the same downstream workflow is reused.
  **Step 2 (Docker)** done and verified against a real `docker compose up`: built both
  images, brought up db→cms→web, created the first admin through `/cms`, saved a
  document, hot-reload-tested `compose.dev.yaml` with a live file edit. Two real bugs
  only surfaced by actually running the built containers (not just building them):
  `next build` failed outright on `app/(payload)/layout.tsx` (React 19.2's `ReactPortal`
  now requires `children`, breaking assignability against Next 15's generated
  `LayoutProps` — reproduces on Payload's own unmodified boilerplate, upstream quirk, not
  our code) and ~27 pre-existing `no-explicit-any` in the МойСклад integration that
  `next dev` never lint-checks — both bypassed via `next.config.mjs`'s
  `typescript.ignoreBuildErrors`/`eslint.ignoreDuringBuilds` with follow-up tasks tracked,
  not silently fixed with guessed types. Separately, `CMS_INTERNAL_URL` was being read via
  `import.meta.env` in both `middleware.ts` and `lib/payload.ts` — Vite inlines that at
  *build* time regardless of `PUBLIC_` prefix, so the Docker-built image had baked in
  `undefined` (build stage never sees the runtime env) and every server-side request tried
  `localhost:3000` instead of `http://cms:3000`. Fixed by reading `process.env` instead —
  genuinely dynamic at runtime, unlike `import.meta.env`.
- **2026-08-14** — **Step 3 (custom admin shell + auth)** done and verified end-to-end in
  the browser: login → dashboard shell → tab navigation → logout → guard re-engages.
  `apps/web/src/layouts/AdminLayout.astro` ports the delivered design's "Админка" screen
  (dark 246px sticky sidebar, nav badges, header row) from `docs/design-reference/
  markup.html`'s `isAdmin` block — tab *content* (KPI cards, orders table, calendar,
  etc.) is still a "coming in Step 4" placeholder on all five pages; this step only
  builds the shell, nav, and auth. Auth: `apps/web/src/lib/admin/session.ts` reads the
  `payload-token` cookie directly and forwards it as `Authorization: JWT <token>` to
  Payload's `/api/users/me` — cookie-forwarding alone doesn't work for a server-to-server
  fetch, since Payload's cookie JWT strategy requires a matching `Origin` or
  `Sec-Fetch-Site` header (CSRF defense) that a Node-side `fetch()` never sends; the JWT
  header strategy has no such check. `middleware.ts` gained a guard: any `/admin/*`
  request without a valid session redirects to `/admin/login?next=...`, except
  `/admin/login` and `/admin/first-register` themselves (each handles its own
  already-authenticated / already-initialized redirect). `AdminPanelLink.tsx`'s
  "Панель управления" link now points at `/admin` instead of `/cms`.
  **Step 4 (dashboards)** done — all five tabs (Заказы, Календарь, Склад, Клиенты,
  Аналитика) now show real data, verified live with real synced МойСклад stock (220
  products) and real test orders. New `GET /api/admin/{kpi,orders,calendar,stock,clients,
  analytics}` endpoints (`apps/cms/src/endpoints/admin/*.ts`) — kpi/calendar/clients/
  analytics are near-verbatim ports of the existing `/cms`-only view components
  (`AdminKpiWidget`/`CalendarView`/`ClientsView`/`AnalyticsView.tsx`; same queries, JSON
  instead of JSX, per the plan's reasoning: local API with `limit: 0` and two-step
  lookups isn't worth re-deriving as REST calls). orders/stock are new (no `/cms`
  equivalent existed) but reuse the same query shape. Every endpoint checks `req.user`
  explicitly — custom Payload endpoints bypass collection access control entirely.
  Status badge colors (order status, stock status) are literally copy-pasted from
  `OrderStatusCell.tsx`/`StockStatusCell.tsx` into `apps/web/src/lib/admin/format.ts`,
  called out in comments both directions, so the two admin UIs read status the same way
  while both exist side by side (until Step 8 retires `/cms`). Orders/Stock tabs are
  intentionally read-only — no order detail/edit links yet (that's Step 5), no product
  create (products only ever come from `sync:moysklad`, `moySkladId` is required+readOnly).
  **Step 5 (order operations)** done — `/admin/orders/[id].astro` (status select, notes,
  per-item quantity/date editing, delete item/order, manual "Отправить в МойСклад").
  Mutations are plain browser-side `fetch()` calls straight to Payload's own REST API
  (`PATCH`/`DELETE /api/orders/:id`, `/api/orderItems/:id`, `POST /api/orders/:id/submit`)
  — no new Payload endpoints needed here, unlike Step 4: these collections already have
  REST endpoints, and a same-origin browser fetch carries the session cookie natively
  (unlike the SSR case in `lib/admin/session.ts`, a browser request has a real
  `Origin`/`Sec-Fetch-Site` header, which is exactly what Payload's cookie-JWT strategy
  checks for). Verified live: status change and notes both round-tripped through a page
  reload; a deliberate bad edit (`endDate` before `startDate`) surfaced the exact
  `beforeValidate` `APIError` message ("endDate must be after startDate") in the page's
  error banner and left the stored data untouched — confirms the plan's flagged risk
  (hook errors need surfacing, not swallowing) is handled. Submit button only renders
  when `!submittedAt`, so an already-submitted order (verified against a real one, already
  pushed to МойСклад from earlier testing) can't be double-submitted — deliberately never
  live-tested the submit action itself, since `MOYSKLAD_API_TOKEN`/`NOTIFICATION_WEBHOOK_URL`
  are real, live credentials in this environment. Caught one unrelated bug while testing:
  local dev's Astro port had drifted from 4322 to 4321 (Docker Desktop released 4321
  mid-session), which silently broke every mutation with 403s — `WEB_URL`/`cors`/`csrf`
  in `apps/cms/payload.config.ts` only allow-list 4322, so Payload's Origin check
  correctly rejected the cookie from a page served on the "wrong" port. Not a code bug,
  just a reminder that `apps/web` must actually run on the port `WEB_URL` names.
- **2026-08-14** — **Step 6 (catalog editing)** done — Categories and Promotions get full
  CRUD (`/admin/categories`, `/admin/promotions`, both list + `[id].astro` handling
  edit-or-create via an `id === 'new'` branch rather than two near-duplicate pages);
  Products get edit-only at `/admin/products/[id]` (price/quantity/available/subtitle/
  tag/isKit/oldPrice/kitItems + image add/reorder/remove) — no create form, confirmed
  earlier `moySkladId` is required+readOnly so products only ever originate from
  `sync:moysklad`. Mutations are plain browser-side REST calls again (Step 5's pattern),
  no new Payload endpoints needed. Added two nav items the delivered mockup never
  designed (`Категории`, `Акции` — it only ever specified Заказы/Календарь/Склад/
  Клиенты/Аналитика/Контент, the last explicitly out of scope) styled identically to
  the designed ones rather than bolted on visually differently. Also finished the
  "Страница акции /promotions/:slug" follow-up from the `prod` parity audit:
  `Promotions` collection gained `slug` (auto-generated from title via a new
  `beforeValidate` hook + `apps/cms/src/lib/text/slugify.ts`, same Cyrillic
  transliteration `prod`'s promotionService.ts used), `content`, `linkedProducts`,
  `linkedCategories`; `apps/web/src/pages/promotions/[slug].astro` renders the
  standalone page. Real bug found and fixed while wiring this up: shared image-upload
  logic (`apps/web/src/scripts/admin-media-upload.ts`, needed by all three
  category/promotion/product forms) was first written as an inline `<script
  define:vars>` doing a runtime `import('/src/scripts/...')` — works in dev (Vite
  serves `/src/*` directly) but isn't guaranteed to survive a production bundle, since
  `define:vars` forces the script inline rather than through Astro's module graph.
  Fixed by dropping `define:vars` entirely (data comes off `data-*` attributes on a
  button instead) and using a normal top-level `import` — Astro bundles a plain
  `<script>` through Vite properly for both dev and prod. Verified live end-to-end,
  including a real file upload (`file_upload` browser tool, not clicking the input —
  clicking opens a native picker the automation can't see): created a category, edited
  and reverted a real synced one, created+deleted a promotion with an uploaded image
  and confirmed its `/promotions/:slug` page rendered correctly, opened a real
  МойСклад-synced product's edit page and exercised the isKit/kitItems UI (without
  saving, to leave real synced data untouched). One process note: clicking a
  `confirm()`-guarded delete button froze the automated browser tab entirely (native
  dialogs block CDP input dispatch) — deletes were instead verified with a direct
  `fetch(..., {method:'DELETE'})` from the console, which exercises the same endpoint
  without the dialog. Real users clicking the actual button hit a normal confirm(),
  this only affects automated testing.
- **2026-08-14** — **Step 7 (long tail)** done — `/admin/settings` (all four
  `SiteSettings` tabs stacked as sections rather than real tab UI — simpler to build
  reliably, still fully functional: hero images/copy, homepage facts, the
  `howItWorksSteps` array with add/remove rows, CTA block, contacts), `/admin/media`
  (paginated grid, per-item alt-text edit + delete), `/admin/users` (list, create —
  no email adapter configured, so the creating admin sets an initial password and
  hands it over out-of-band rather than an invite-by-email flow — delete, change own
  password with a "this is you" guard against self-deletion). Added `Медиатека`,
  `Пользователи`, `Настройки` nav items (same reasoning as Step 6's Категории/Акции —
  the mockup never designed these screens). Verified live: settings round-tripped a
  full page reload without any field going missing (the real risk with a POST that
  omits a key on a Payload global — confirmed `howItWorksSteps` stayed at 4 real rows
  and every contact field was intact after a save), created and deleted a real media
  item and a real second admin user end-to-end. This closes out the plan's own
  suggestion that Step 7 might be "an honest candidate to leave on /cms if time is
  tight" — it wasn't, in the end.
- **2026-08-14** — All 8 steps of `docs/PLAN-docker-admin.md` are now done except Step 8
  itself (retiring `/cms` — deliberately last, needs a week of the owner actually using
  `/admin` day-to-day first, per the plan). `/cms` remains available as the safety net
  it was always meant to be.
- **2026-08-20** — Wrote `docs/ROADMAP-2.0.md` (cross-checks the three existing plan
  docs against actual code/git state; open items, conflicts, suggested order of
  attack) and started `docs/PLAN-next-migration.md`. **Stage 0.1/0.2** done: ESLint's
  `no-explicit-any` suppression scoped to just the legacy paths that need it
  (`apps/cms/eslint.config.mjs`, `eslint.ignoreDuringBuilds` removed entirely — new
  code is linted at full strictness); `apps/cms` upgraded Next 15 → 16.3.1. The
  `ReactPortal`/`LayoutProps` type-check bug isn't fixed by the Next upgrade alone,
  but combined with the existing Fragment-wrap workaround in
  `app/(payload)/layout.tsx`, `next build`'s generated-type check now passes, so
  `typescript.ignoreBuildErrors` was removed too. Also wrote
  `docs/design-reference/hierarchical-categories.md` — a hand-authored spec for the
  storefront category-tree sidebar (undocumented in every plan and in the design
  bundle, since `Categories.parent` postdates it).
  **Stage 1 (каркас + разворот прокси)** done and verified live (real `next dev` +
  `astro dev` running concurrently against a real local Postgres, not just `next
  build`): `apps/web/public/*` moved to `apps/cms/public` (favicon, self-hosted Golos
  Text); `apps/cms/src/styles/global.css` is a duplicate of `apps/web`'s copy (not a
  move — Astro's `Layout.astro` still needs its own copy live until Stage 2 actually
  ports pages away), wired through a new Tailwind v4 PostCSS setup
  (`@tailwindcss/postcss` added, since `apps/cms` never needed Tailwind before — the
  `/cms` admin theme is plain CSS custom properties, no Tailwind directives, so it's
  unaffected) and now also pulls in `docs/design-reference/spec/{tokens.css,
  interactions.css}` for the first time anywhere in either app.
  `apps/cms/src/app/(frontend)/layout.tsx` is a skeleton port of `Layout.astro` —
  deliberately without Navbar/Footer yet, since those depend on SiteSettings/cart-
  store islands that are explicitly Stage 2 scope ("Данные"/"Острова"), and nothing
  routes to this layout yet anyway (every real request still falls through the proxy).
  `apps/cms/src/proxy.ts` (not `middleware.ts` — Next 16 renamed the convention,
  confirmed via `@next/codemod`'s own transform source since this app started on 16.3
  from day one) fallback-proxies everything except `/cms`, `/api`, `/_next`, and the
  moved public assets to the still-live Astro app; `apps/web/src/middleware.ts` lost
  its proxy logic entirely (kept only the `/admin` session guard — `/admin/*` pages
  still live there until Stage 3). One real bug caught by the live test, not just
  `next build`: an admin-guard redirect (`/admin` → `/admin/login`) 500'd through the
  new proxy with `TypeError: Invalid URL` — Next's Node-runtime proxy handling chokes
  on a same-origin-rewritten *relative* Location header the way Astro's own plain
  Node server never did; fixed by rewriting to an absolute URL on the incoming
  request's own origin instead (Next then correctly re-relativizes it for the client,
  matching Astro's original response exactly — confirmed byte-for-byte on `/` between
  going through the proxy vs hitting Astro directly). `compose.yaml`: published port
  moved from `web` to `cms` (still named `WEB_PORT` — it's the port the site is on,
  regardless of which service serves a given request), `web` gained no healthcheck-
  gated reverse dependency on `cms` (already had one the other way; adding one back
  would cycle). Also disabled Next 16's new auto-generated `AGENTS.md`/`CLAUDE.md`
  file feature (`agentRules: false` in `next.config.mjs`) — first noticed when it
  silently wrote both into `apps/cms/` on `next dev`, stepping on this project's own
  root `CLAUDE.md` convention.
- **2026-08-20** — Re-enabled `agentRules` (per owner request) — its generated
  `apps/cms/AGENTS.md`/`CLAUDE.md` are now gitignored instead, so they regenerate
  freely without colliding with this file. Added 8 `.claude/agents/*.md` project
  subagents (code-reviewer, tester, security-reviewer, frontend-porter,
  moysklad-integrator, roadmap-chronicler, cutover-operator, db-migration-reviewer) —
  carved an exception into the root `.gitignore`'s blanket `.claude/` ignore (was
  written assuming everything under it is machine-local state) so these stay checked
  in, same pattern as the existing `.vscode/extensions.json` exception.
  **Stage 2 (storefront port) started.** First page group done (legal pages,
  `/privacy-policy` + `/user-agreement`, dropped out of `proxy.ts`'s fallback
  matcher) — but since every real page needs the shared chrome Stage 1 deliberately
  deferred, this pass also built it for real: `lib/data/siteSettings.ts` (Local API),
  Footer (async Server Component), Navbar (`'use client'` — needs `usePathname()`,
  no server-render equivalent to `Astro.url.pathname` in a shared layout; wrapped in
  `Suspense` per Next's requirement for `useSearchParams()`), and near-verbatim ports
  of CartBadge/AdminPanelLink/RentalDatePicker (React 19 both sides, `mounted`
  hydration-guard kept — `eslint-config-next@16`'s new `react-hooks/set-state-in-effect`
  rule flags it generically, suppressed inline with rationale rather than rewritten).
  `cart.ts`/`dates.ts`/`pricing.ts`/`dateRange.ts`/`cart-actions.ts` duplicated from
  `apps/web` (same live-until-Stage-4 duplication as `global.css`); `cart.ts`'s
  `ListingType` is now a local literal instead of `@playback-rental/shared-types`, per
  the plan's own guidance that package is an `apps/web`-only concern going forward.
  One real bug fixed while porting Navbar: the Astro source checked
  `currentPath.includes('type=kit')` against `Astro.url.pathname`, which never
  contains the query string — so "Наборы" never actually highlighted as active in
  the live app. Ported using the real query param instead of the always-false
  condition; a deliberate, flagged behavior change, not a silent one.
  Ran `node tools/design-sync.mjs audit` against the ported chrome rather than
  carrying the pre-existing duration-200/no-ease gap forward — fixed 19 of 20
  transitions to the design's dominant `duration-240`/`ease-expo`. Found and fixed a
  real bug in the audit tool itself while doing this: its animation-keyframe regex
  required `animation:` to be followed directly by `bnX...` with no quote character,
  which matches Astro's inline `style="animation:bnX"` but never a ported React
  `style={{ animation: 'bnX...' }}` — every animation in any ported `.tsx` file was
  silently auditing as 0×. Confirmed fixed: `bnBlink` went from a false `⚠ 0×` to a
  real `✓ 1×`.
  Verified live (real `next dev` + `astro dev` against a real local Postgres, not
  just `next build`): both new pages 200 with real Navbar/Footer content rendered;
  still-unported routes (`/`, `/how-it-works`) still correctly fall through the
  proxy to Astro.
- **2026-08-20** — **Stage 2 page group 2 of 7** done: `/how-it-works` (static port of
  the Astro source — its steps/pricing/FAQ arrays are hardcoded in the source itself,
  not pulled from `SiteSettings`; that's a shorter, different list used only on the
  homepage, out of scope here) and `/contact` (async Server Component, `getSiteSettings()`
  from part 1's data layer for phone/email/telegram/vk/address/hours/map links), plus
  the `ContactForm` client island, both dropped out of `proxy.ts`'s fallback matcher.
  Real, deliberate behavior change in the port: `apps/web`'s `ContactForm` called
  `sendContactNotification()`, a REST wrapper in `apps/web/src/lib/payload.ts`; the
  ported version fetches `/api/contact-notification` directly, since that endpoint
  already exists natively in `apps/cms` (`src/endpoints/contactNotification.ts`,
  registered in `payload.config.ts` since an earlier stage) — pure frontend wiring, no
  new backend code. Also bumped the form's input focus transitions from `duration-200`
  to `duration-240`/`ease-expo`, continuing part 1's design-sync gap-closing; a
  post-change audit run showed 24 `duration-240` occurrences, with only the one
  deliberately-left-alone shared `global.css` `.btn` utility still at `duration-200`
  (same reasoning as part 1: not worth diverging the two still-live copies over).
  Verified live (real `next dev` + `astro dev` + local Postgres — had to `ALTER ROLE`
  to reset a stale password on the existing dev DB role before it would auth this
  session): `next build` prerendered both new routes as static `○`; both then
  curl-verified 200 natively off port 3000 with real `SiteSettings` data in the HTML
  (a real phone number appeared); `/` still 200 through the Astro proxy fallback,
  confirming the matcher change didn't break anything else; `POST
  /api/contact-notification` exercised directly — 400 on missing required fields,
  `{"success":false}` with the documented "`NOTIFICATION_WEBHOOK_URL` not configured"
  reason when unset in this scratch env (expected no-op per the endpoint's own
  comment, not a bug). Lint and design-sync audit both clean. All scratch test infra
  (Postgres, both dev servers, scratch `.env` files) torn down afterward; ran one
  extra `next build` at the end specifically to leave `next-env.d.ts` back in its
  committed build-mode state (dev mode rewrites two of its import lines to
  `.next/dev/types/*`, the drift already documented above) before committing.
- **2026-08-20** — **Stage 2 page group 3 of 7** done: the homepage (`apps/cms/src/app/
  (frontend)/page.tsx`), ported from `apps/web/src/pages/index.astro` — the largest
  template in the whole plan (297 lines). Structure and data logic are verbatim; only
  syntax changed (Astro frontmatter → async Server Component, `class` → `className`,
  inline animation style strings → style objects). Marked `export const dynamic =
  'force-dynamic'` since stock/availability/promotions change from admin actions and
  the МойСклад sync, not from anything Next can see at request time. New Local API
  data layer, same pattern as part 1's `lib/data/siteSettings.ts`: `lib/data/
  categories.ts`, `products.ts` (its `GetProductsParams` intentionally drops a
  `categorySlug` field the REST version declared but never actually read — dead code,
  not carried over), `promotions.ts`. `lib/mediaUrl.ts` ported too — Local API's
  populated-relation shape needs no origin resolution at all, unlike the old REST
  client's `CMS_INTERNAL_URL`/`PUBLIC_PAYLOAD_URL` split (Payload media URLs are
  already browser-relative here). `lib/categoryTree.ts` duplicated (`getSubtreeIds` is
  what the homepage's per-category product-count aggregation needs;
  `buildCategoryTree`/`flattenCategoryTree` came along unused for now — they're for the
  catalog sidebar, the next page group). Two new components: `ProductCard.tsx`
  (deliberately *not* `'use client'` — its `[data-add-to-cart]` button relies on the
  single delegated click listener already wired up by `CartActionsInit.tsx`/`scripts/
  cart-actions.ts` from part 1, same as the Astro version, so no interactivity of its
  own is needed) and `PromoCarousel.tsx` (client island, ported verbatim — it was
  already a React component in `apps/web`, just needed `'use client'` and import-path
  fixes). `proxy.ts`'s matcher gained `|$` in its negative-lookahead alternation: the
  existing pattern only excluded non-empty literal path prefixes, and for the bare
  root `/` the remainder after the leading slash is an empty string, which trivially
  satisfies a negative lookahead against a list of non-empty alternatives — so `/` kept
  falling through to the Astro proxy fallback even after the homepage was served
  natively here, until `$` (end-of-string) was added as an alternative. Also fixed a
  second gap in `tools/design-sync.mjs`'s keyframe-detection regex (the first, missing-
  quote-tolerance, was fixed in part 1): it tolerated a leading `'` or `"` but not a
  backtick, so `PromoCarousel`'s progress-bar animation (written as a template literal
  — `` `bnBar ${ROTATE_MS}ms...` `` — since its duration comes from a JS constant, not
  a literal) still silently audited as a false `0×`. Continued the duration-200 →
  duration-240/`ease-expo` gap-closing from parts 1–2: bumped 4 more instances
  (`ProductCard`'s add-to-cart button, 3 in `PromoCarousel`'s nav buttons/row) — post-
  fix audit shows only the one deliberately-left-alone shared `global.css` `.btn`
  utility still at `duration-200` (same reasoning as before: don't diverge the two
  still-live `global.css` copies over this).
  Verified live: local Postgres 16, `next build` — confirms `/` now compiles as `ƒ`
  (dynamic/server-rendered) rather than static, other four Stage 2 routes stay static
  `○`; a TypeScript error surfaced during this build (`Record<string, unknown>[]` not
  assignable to Payload's `Where[]` in `lib/data/products.ts`'s `and` array), fixed by
  importing and using Payload's own `Where` type instead. Then real concurrent `next
  dev` (3000) + `astro dev` (4322): curl-verified `/` 200 natively off port 3000 with
  real hero/CTA copy in the HTML, zero `astro-island` markers in the output (confirms
  it's genuinely server-rendered by Next now, not still proxied), clean dev-server log
  with no runtime errors. This session's local dev DB was empty (no synced МойСклад
  data), so the data-dependent sections (category tiles, kits, marquee, popular
  products) correctly didn't render — confirmed this was expected empty-data behavior
  by directly querying `/api/categories` and `/api/products` and getting zero docs,
  not just assumed from the missing HTML. `/catalog` (still unported) still 200
  through the Astro proxy fallback, confirming the matcher's `|$` change didn't affect
  any other route. Lint clean (only the same pre-existing `next/image` advisory
  warnings every other ported page already has). All scratch test infra (Postgres,
  both dev servers, scratch `.env` files, and the extra `next build` cycle to leave
  `next-env.d.ts` in committed build-mode state) torn down and redone before
  committing.
- **2026-08-20** — **Stage 2 page group 4 of 7** done: catalog (`apps/cms/src/app/
  (frontend)/catalog/page.tsx` + `catalog/[slug]/page.tsx`), ported from `apps/web/src/
  pages/catalog/index.astro` + `catalog/[slug].astro` — both thin wrappers, both marked
  `force-dynamic` since search/sort/category-filter results depend on the query
  string. `[slug]/page.tsx` redirects to `/catalog` when the slug doesn't resolve
  (`Astro.redirect()` → `next/navigation`'s `redirect()`) and has its own
  `generateMetadata()` for the per-category page title; `getCategoryBySlug()` (new, in
  `lib/data/categories.ts`) is wrapped in React's `cache()` since `generateMetadata()`
  and the page component both call it and Local API calls aren't `fetch()`, so they
  don't get Next's automatic per-request dedup for free the way part 3's homepage data
  calls do. `CatalogPage.tsx` (ported from `CatalogPage.astro`) stays a plain async
  Server Component, orchestrating breadcrumb/heading, sidebar, search form, and product
  grid same as the original. `CategorySidebar.tsx` is `'use client'` — new for this
  migration (earlier ports mostly reused already-client apps/web sources or stayed
  server-only) — because the mobile `<select>`'s `onChange` needs a real handler
  (`window.location.href = ...`), which Astro's plain string `onchange="..."` attribute
  can't express in JSX; everything else in it is static props-driven markup passed down
  from `CatalogPage`. `scripts/catalog-availability.ts` duplicated from `apps/web` (same
  duplicate-not-move pattern as `cart-actions.ts` etc. from part 1), wiring the "only
  free" toggle + live per-card availability, wired into the page via
  `CatalogAvailabilityInit.tsx` (same `useEffect`-wrapper pattern as part 1's
  `CartActionsInit.tsx`). Its `getRentalAvailabilityBulk()` needed a genuinely new file,
  `lib/rentalAvailability.ts` — a browser-only client doing a plain relative `fetch` to
  `/api/rental-availability-bulk`, since this can only ever run client-side (selected
  rental dates are sessionStorage-backed, unknowable at SSR time) and the old REST
  client's `CMS_INTERNAL_URL`/`PUBLIC_PAYLOAD_URL` split doesn't apply — this app's own
  `/api` is already same-origin. Continued the duration-200 → duration-240/`ease-expo`
  sweep in `CategorySidebar.tsx`'s ported links; post-port `design-sync audit` showed no
  new gaps — the toggle knob's `duration-[320ms]` with the overshoot cubic-bezier,
  carried over verbatim from the Astro source, already matches the design spec's own
  value exactly (unlike the `duration-200` instances fixed in earlier parts).
  `proxy.ts`'s matcher extended to exclude `catalog`.
  Verified live: local Postgres 16, `next build` compiles both new routes as dynamic
  `ƒ`. Since this session's dev DB again had zero synced МойСклад data (same as every
  prior part) and catalog rendering genuinely needs real category/product rows to
  verify sidebar counts, product-card rendering, category filtering, and search
  filtering meaningfully (not just "does it 500"), a real category + 2 products were
  seeded directly via a scratch Local API script (`tsx`, run from inside `apps/cms` so
  Node module resolution worked) — then deleted via a second scratch script, both
  scratch files removed, before committing, so no test data or scratch files persisted.
  With that data live: curl-verified `/catalog` shows the sidebar category count and
  both product cards; `/catalog/kamery` (the seeded slug) shows the same filtered set;
  `?q=Sony` correctly narrows to one card; a nonexistent slug (`/catalog/does-not-
  exist`) returns a 307 redirect to `/catalog`. Also noticed and confirmed as expected
  (not a bug): the results-count text ("2 позиции") appears in the raw HTML split by
  empty HTML comments (`2<!-- --> <!-- -->позиции`) — React's own SSR hydration-
  boundary markers for adjacent JSX text-node siblings, invisible once rendered/
  hydrated in a real browser. `/product/1` (still unported) continues to reach the
  Astro app through the proxy fallback, confirmed via a real request. Lint clean (only
  the same pre-existing `next/no-html-link-for-pages` advisory warnings already present
  on the committed Navbar, from the deliberate plain-`<a>`-not-`next/link` choice made
  in earlier parts). All scratch test infra (Postgres, both dev servers, scratch `.env`
  files, seeded test data, seed/cleanup scripts, and the extra `next build` cycle for
  `next-env.d.ts`) torn down before committing.
  **Page group 5 of 7 (product detail)** done — `product/[id]/page.tsx`, ported from
  `apps/web/src/pages/product/[id].astro`, `force-dynamic` like every data-driven page
  group so far. `generateMetadata()` and the page component both need the same product
  lookup, so both funnel through one `loadProduct()` helper in `page.tsx` — a plain
  shared async function, not React's `cache()` (unlike part 4's `getCategoryBySlug()`),
  since there's no risk here of the same lookup firing twice from independent call
  sites. `getProductById()` (`lib/data/products.ts`) now returns `Product | null` via
  Payload's `disableErrors: true` on `findByID`, replacing the REST client's
  throw-and-instanceof-check-`PayloadApiError` pattern the Astro source used — Payload's
  Local API has a first-class "not found" story, so no error class import was needed.
  The page still explicitly guards NaN/non-numeric ids before ever calling
  `getProductById`, matching the Astro source's own validation, since `disableErrors`
  only suppresses "not found," not a malformed query. `lib/rentalAvailability.ts`
  (created in part 4 for the catalog's bulk availability check) gained a sibling
  `getRentalAvailability()` (singular) for this page's live per-product availability
  panel — same "browser-only, dates are sessionStorage-backed, unknowable at SSR"
  reasoning as the bulk version. Two new islands: `ProductPurchasePanel.tsx` (price,
  availability calendar, quantity selector, add-to-cart) and `QuantitySelector.tsx`
  (tiny, ported verbatim). `ProductPurchasePanel.tsx` hit a new ESLint conflict not seen
  in parts 1–4: `react-hooks/set-state-in-effect` flagged three `setState` calls. Two
  were the already-familiar `mounted` hydration-guard pattern (same as
  `CartBadge.tsx`/`RentalDatePicker.tsx` from part 1, same inline
  `eslint-disable-next-line` suppression with rationale). The third was new: the
  availability-fetch effect's synchronous `setChecking(true)` called before the async
  fetch starts — the effect as a whole otherwise matches the rule's own recommended
  shape (fetch an external system, `setState` from the callback), so this was
  suppressed with its own comment explaining why the initial loading flag is a
  legitimate exception to the "`setState` only in callback" mold. `proxy.ts` matcher
  extended to exclude `product`. Verified live (real `next build` + `next dev` +
  `astro dev` against a real local Postgres): build compiles `/product/[id]` as dynamic
  (ƒ); with a real (temporary, deleted before commit) seeded product + category,
  curl-verified title/subtitle/description/breadcrumb (Главная / Каталог / category
  name)/category-badge/in-stock-badge/related-products-section all render; verified
  price formatting specifically — a naive grep for "5 000 ₽" (regular space) missed it
  because `Intl.NumberFormat('ru-RU')` uses a non-breaking space, caught via a
  byte-level Python check (`5\xa0000\xa0₽`) rather than assumed broken; confirmed
  `ProductPurchasePanel`'s props (including price) are present in the RSC payload sent
  for client hydration. Both an out-of-range numeric id and a non-numeric id correctly
  307-redirect to `/catalog`. `/checkout` (still unported) continues to reach Astro
  through the proxy fallback, confirmed via a real request. Lint clean after the
  set-state-in-effect fixes (only the same pre-existing `no-img-element`/
  `no-html-link-for-pages` advisories from earlier parts, plus two `exhaustive-deps`
  warnings on a deliberate `.getTime()`-based effect dependency array carried over
  verbatim from the original — avoids re-running the effect on every new-but-value-equal
  `Date` object). `design-sync` audit showed no new gaps (`duration-300` on the
  thumbnail-hover transition matched the design spec's own value, not flagged). All
  scratch test infra (Postgres, both dev servers, scratch `.env` files, seeded test
  data, seed/cleanup scripts, extra `next build` cycle for `next-env.d.ts`) torn down
  before committing.
  **Page group 6 of 7 done** (`3c72106`): promotions detail
  (`promotions/[slug]/page.tsx`), the smallest port of the six so far — the
  `Promotions` collection, its admin CRUD, and this route's whole content model
  (slug/kicker/text/content/linkedProducts/linkedCategories) already existed from
  2026-08-14's "Страница акции /promotions/:slug" work, so this pass needed zero new
  data-layer code: `getActivePromotions()`/`getPromotionBySlug()` were both already
  written in part 3 (for the homepage's promo carousel) and just sat unused until now.
  `Astro.redirect('/404')` became `next/navigation`'s `notFound()` — apps/web never had
  an actual `/404.astro` route either, so the original just fell through to Astro's own
  default not-found handling for that path; `notFound()` is the direct idiomatic
  equivalent. `proxy.ts` matcher extended to exclude `promotions`. Verified live: this
  page needed more seeded state than any prior part, since `Promotions.image` is a
  required (non-nullable) upload field and both the linked-products and
  linked-categories sections needed real linked data to exercise — the scratch seed
  script created a real media doc via Payload's Local API file upload (same shape
  `moysklad/sync.ts`'s own image-upload code uses) alongside a temporary category,
  product, and promotion, all deleted before committing, with cleanup this time
  verified to actually remove the uploaded file from disk (checked via `find`, not just
  the DB row). With that data live: curl-verified title/kicker/content/image, the
  linked-products section (a real `ProductCard`, including its correct
  `/api/media/file/...` URL), and the linked-categories tile; a nonexistent slug
  correctly 404s via `notFound()` rather than a redirect loop or 500. **Caught reviewing
  the commit, not by the verification originally run**: the commit message initially
  claimed `getPromotionBySlug()` "gained the same React `cache()` wrap part 4 gave
  `getCategoryBySlug()`" — the actual first-pass diff only added `import { cache } from
  'react'` to `lib/data/promotions.ts` without ever wrapping the function itself (still
  `export async function getPromotionBySlug(...)`, not `export const getPromotionBySlug
  = cache(...)`), so `generateMetadata()` and the page component would have kept
  issuing two separate Payload queries per request instead of one deduped call, and the
  `cache` import would have been dead code. Neither `eslint` nor `tsc --noEmit` flag an
  unused-but-imported `cache`, so this slipped past the checks that were actually run.
  Found while reviewing the roadmap-chronicler's write-up of the commit (its own
  independent verification against the diff caught the mismatch between the claim and
  the code) and fixed immediately, in the same unpushed commit, rather than left as a
  known gap — `getPromotionBySlug` is now genuinely `cache(async (slug) => ...)`,
  re-verified with a clean `eslint`/`next build`. `/checkout` (last page group) still
  falls through the proxy to Astro, confirmed via a real request. Lint and design-sync
  audit both otherwise clean, no new gaps. **Checkout is next up and last** in Stage
  2's page order — per `docs/PLAN-next-migration.md`, the one page group needing the
  most care, since it's the only one with a real mutation (`submitOrder()`, planned to
  become a Server Action on the Local API rather than a client-side REST POST, retiring
  the `mutate()`/`{ doc, message }` wrapper along with the REST call it exists for).
- **2026-08-20** — **Stage 2 page group 7 of 7 (checkout) done — Stage 2 complete.**
  Ports `apps/web`'s `checkout.astro` + `CheckoutPage.tsx` to `apps/cms`'s
  `(frontend)/checkout/page.tsx` + `components/CheckoutPage.tsx`. This is the plan's
  own flagged "needs the most care" page group — the only one with a real mutation
  (order creation) — so unlike parts 1–6 (straight syntax ports), this one got a real
  architectural change: `submitOrder()` becomes a Server Action
  (`checkout/actions.ts`'s `submitCheckout()`) using the Local API directly, instead of
  the old REST flow's 1+N+1 separate HTTP round trips (`createOrder`, one
  `createOrderItem` per cart line, `submitOrder`) through `apps/web/src/lib/payload.ts`'s
  `mutate()`/`{ doc, message }` wrapper. The `/:id/submit` custom Payload endpoint's
  actual business logic (МойСклад push, notification webhook, `submittedAt` stamping)
  lived entirely inline in its handler (`apps/cms/src/collections/Orders.ts`) before
  this commit — extracted into a new shared file, `apps/cms/src/lib/rental/
  submitOrder.ts`, so the new Server Action and the endpoint (still needed as-is,
  unchanged behavior, for `apps/web`'s REST-based checkout until Stage 4 deletes that
  app) call the exact same code rather than duplicating the МойСклад-push/notification
  logic. `Orders.ts`'s endpoint handler is now a thin wrapper: it still owns the
  `submitToken` check specifically (an HTTP-boundary-specific authorization concept —
  protects the public endpoint from someone force-submitting an order by guessing/
  enumerating ids — that the Server Action doesn't need, since it only ever submits the
  order it just created in the same request, not an arbitrary externally-supplied id).
  The Server Action's `payload.create()` calls for orders/orderItems explicitly pass
  `overrideAccess: false` — Payload's Local API defaults to `true` (bypassing
  collection access control entirely), but this is genuinely public/anonymous
  checkout, so it's deliberately evaluated under the real collection access rules a
  genuine anonymous REST caller would hit, not silently bypassed. Kept the original's
  rollback-on-item-failure behavior (delete any orderItems already created if a later
  cart line fails validation) and its "leave the order shell in place" behavior
  (deleting orders is admin-only by design — same constraint the old REST flow had,
  since a checkout flow was never allowed to delete the order shell itself). Two
  TypeScript quirks surfaced wiring the Local API `create()` calls: an explicit `notes:
  undefined` key in the create-data object routed `payload.create()`'s overload
  resolution into a confusing "missing draft property" error rather than the expected
  one — fixed by only including the `notes` key in the object when it's actually set.
  And `status`, despite having a schema `defaultValue` (`'pending'`), still needs to be
  passed explicitly in the `create()` call's data — Payload's generated `Data` type for
  a required field doesn't know about runtime-applied defaults, so TypeScript still
  demands it. `proxy.ts` matcher extended to exclude `checkout` — nothing is left in
  the fallback list that isn't ported.
  Verification was more thorough than any prior part, deliberately, given this is the
  one page group with a real mutation: confirmed Playwright is available globally on
  this machine (at `/opt/node22/lib/node_modules/playwright`, using the pre-installed
  Chromium at `/opt/pw-browsers`) even though it's not a project dependency, and used a
  real browser session (not just curl) for the first time in this whole migration
  effort. Seeded a real product+category via a scratch Local API script (same pattern
  as parts 4–6), then drove a real Chromium session: navigated to the product page,
  clicked two days in the live availability calendar to pick rental dates, clicked "В
  корзину", navigated to `/checkout`, filled the contact form, checked both consent
  checkboxes, and submitted — reached the real "Заявка отправлена!" success state with
  zero browser console errors. Then queried the Local API directly (a second scratch
  script) to confirm the order and orderItem genuinely persisted with correct data:
  right `totalPrice`/`lineTotal`/dates/status, `submittedAt` actually set (proving
  `submitOrder()` really ran, not just that the client showed a success message). Also
  confirmed via the dev server log that the graceful-МойСклад-failure path was
  genuinely exercised, not just theoretically present in the code — the log showed the
  real caught "MOYSKLAD_API_TOKEN is not set" error (this scratch env has no real
  credentials, per this project's standing rule to never exercise live МойСклад
  credentials without explicit sign-off), and checkout still completed successfully
  despite that failure, exactly as designed. Ran a second, deliberately adversarial
  browser session: added the same product to cart, then used the checkout page's own
  quantity +/- control to push the requested quantity past the seeded stock (6
  requested against 3 in stock) and submitted. The exact validation message from the
  `OrderItems` `beforeValidate` hook ("Only a limited quantity of \"Sony FX3\" is
  available for these dates (requested 6)") surfaced correctly in the UI's error
  banner. Checked the DB afterward and confirmed the expected partial-failure state:
  an orphaned order shell (empty items array, `totalPrice` 0, `submittedAt` null) with
  no orphaned orderItem — matching the intended rollback design exactly, not a phantom
  row. All seeded test data (2 orders, 1 orderItem, 1 product, 1 category) deleted via
  scratch scripts before committing, scratch scripts and Playwright test scripts
  removed. `next build` compiles `/checkout` as static ○ (unlike the other 6 page
  groups, all force-dynamic or otherwise server-data-driven) — checkout has no server
  data fetching of its own, the cart is entirely client-side localStorage. Lint clean
  after applying the same `react-hooks/set-state-in-effect` suppression pattern
  established in parts 1 and 5 (one new instance here: an early-exit branch in the
  availability-check effect that resets state to `{}` when there are no dates
  selected). `design-sync` audit showed no new gaps introduced.
  **This is the last page group — Stage 2 (storefront port) is now fully done, all 7
  page groups landed the same day they were started.** `docs/ROADMAP-2.0.md` updated
  accordingly (Stage 2's own line flipped from "in progress" to "done", the plan's
  overall Net summary, and the "suggested order of attack" list, which now points at
  Stage 3 — admin port — as the next real body of work). Remaining on
  `docs/PLAN-next-migration.md`: Stage 3 (admin port) and Stage 4 (cleanup, delete
  `apps/web`) — both still fully unstarted.
- **2026-08-20** — **Stage 3 (admin port) started** — the plan's own "main win," since
  the custom `/admin` UI's entire REST/proxy/dual-URL surface (Step 1–2 of
  `docs/PLAN-docker-admin.md`) existed only because `apps/web` and `apps/cms` were
  separate processes; that reason is gone now that Stage 2 made `apps/cms` the
  single public entry point. First commit covers 3.1 (auth) + 3.2 (shell) + page
  group 1 of 6 (`login`, `first-register`), per the plan's own page order (section
  3.5). `apps/cms/src/lib/admin/auth.ts` replaces `apps/web/src/lib/admin/
  session.ts` entirely — no more manual `payload-token` cookie read +
  `Authorization: JWT` re-forward, since that hack existed solely to cross a process
  boundary that no longer exists; `payload.auth({ headers: await headers() })` reads
  real request cookies directly, same process. A new top-level `(admin)/admin/
  layout.tsx` route group (sibling to `(frontend)` and `(payload)`, matching the
  plan's own route-group table) hosts the real auth guard, per the plan's own
  instruction that `proxy.ts` should do at most a cheap cookie-presence check — here
  it doesn't even need that, since every not-yet-ported `/admin/*` subpath still
  falls through to Astro's own still-active guard. One deliberate simplification,
  flagged rather than silently dropped: the new guard's redirect to `/admin/login`
  does *not* preserve a `next=` deep-link param the way Astro's guard did (a Server
  Component layout has no built-in current-pathname the way `context.url` gave
  Astro) — confirmed low impact today since the only guarded page that exists yet
  (bare `/admin`) always redirects onward to `/admin/orders` regardless
  (`apps/web/src/pages/admin/index.astro` is genuinely nothing but that one
  redirect, nothing more to port there), but worth revisiting once a guarded page
  with real content is ported and a mid-navigation session expiry becomes a real
  scenario to preserve. `AdminSidebar.tsx` (`'use client'`, needs `usePathname()`
  for the active-tab highlight and a logout click handler) uses `next/link` for
  nav — real client-side transitions between admin tabs instead of Astro's
  full-page-reload-per-click, the concrete thing this stage exists to fix.
  `AdminPageHeader.tsx` exists because Next's shared layout can't receive the
  `title`/`subtitle`/`activeTab`/`actionLabel` props each Astro page used to pass
  into `AdminLayout.astro` — every admin page now renders its own header via this
  small component instead; same visual output, different composition. `/admin/
  login` and `/admin/first-register` deliberately live under `(frontend)`, not
  `(admin)` — matching the Astro source's own choice to import the site's `Layout`,
  not `AdminLayout`, for exactly those two pages — so they never pass through the
  new guard at all. `proxy.ts`'s matcher gained `admin/login`, `admin/first-
  register`, and `admin$` — the last reusing Stage 2's own empty-remainder trick (an
  empty match remainder trivially satisfies a negative lookahead over non-empty
  alternatives) for the bare `/admin` literal specifically; a plain `admin`
  alternative without the `$` anchor would have incorrectly excluded every other
  not-yet-ported `/admin/*` subpath from proxying too, since the matcher's
  alternation tests "starts with," not "equals." Verified live with a real
  Playwright browser session (the second time in the whole migration a real browser
  was used instead of curl, appropriate here since auth/session is exactly the kind
  of stateful, cookie-dependent behavior curl verifies poorly): registered a real
  first admin through `/admin/first-register`, then followed the full redirect
  chain — guard passes -> `/admin` -> `/admin/orders` (not yet ported, correctly
  fell through the proxy to Astro's own `/admin/orders.astro`, which recognized the
  same `payload-token` cookie and rendered real KPI data) — confirming session
  continuity survives the process boundary, the single most load-bearing thing to
  check about this commit specifically (a session that didn't survive the handoff
  would have silently broken every not-yet-ported admin page the moment this
  landed). Also verified: a fresh unauthenticated visit to `/admin/login` stays put
  (no redirect loop); revisiting either `/admin/login` or `/admin/first-register`
  while already authenticated bounces straight through to `/admin/orders`;
  unauthenticated `/admin/orders` still hits Astro's own guard with `next=`
  preserved, unaffected by this port. Zero browser console errors throughout. Test
  admin user deleted via a scratch Local API script before committing (confirmed
  `/admin/first-register` renders again afterward, not `/admin/login`, restoring
  the dev DB to uninitialized state). `next build` compiles all three new routes as
  dynamic (auth state can't be cached). Lint clean, one `@next/next/no-location-
  assign-relative-destination` warning suppressed inline in `AdminRegisterForm.tsx`
  with a rationale comment (a full page navigation via `window.location.href` after
  establishing a brand-new session cookie is deliberate — avoids any client-side
  router transition carrying over stale RSC/state from the pre-auth render — not an
  oversight). `design-sync audit` shows no new gaps. Five of six Stage 3 page
  groups remain, per the plan's own section 3.5: shell + `index` (the `index` half
  of which, per the Astro source just confirmed, is only ever that one redirect —
  nothing left to actually build there beyond what already shipped this commit),
  orders list + `orders/[id]`, calendar/stock/clients/analytics, categories/
  promotions/`products/[id]`, media/users/settings.
- **2026-08-20** — **Stage 3 (admin port), second commit**: 3.3 (endpoint→
  server-function conversions) + 3.4 (Server Actions) + page group 3 of 6
  (`orders` list + `orders/[id]`) — the plan's own flagged "most complex" admin
  page group: status, notes, per-item quantity/date edits, item/order delete,
  submit-to-МойСклад. `lib/admin/data/{kpi,orders}.ts` turn `endpoints/admin/
  {kpi,orders,orderDetail}.ts`'s endpoint bodies into plain server-only
  functions — same queries verbatim, minus each endpoint's own explicit
  `req.user` check (custom Payload endpoints bypass collection access control
  entirely; these functions are now only ever called from inside the guarded
  `(admin)/admin/layout.tsx` subtree, so that layout's guard covers it). The
  endpoints themselves are untouched, still serving `apps/web`'s REST-based
  admin until Stage 4 deletes that app. `(admin)/admin/orders/[id]/actions.ts`
  holds the six Server Actions (`updateOrderStatus`, `updateOrderNotes`,
  `updateOrderItem`, `deleteOrderItem`, `deleteOrder`, `submitOrderToMoySklad`),
  replacing the old inline `<script>`'s browser-side `fetch()` calls against
  Payload's own REST endpoints. `submitOrderToMoySklad` calls the same
  `lib/rental/submitOrder.ts` the checkout Server Action (Stage 2 part 7) and
  the REST `/:id/submit` endpoint already share — a third caller, still one
  implementation.

  Worth its own paragraph: every action re-checks `getAdminUser()` itself
  before mutating, which goes beyond what section 3.3 covers (3.3 only talks
  about read endpoints relying on the layout guard). Reason: unlike a page
  render, a Server Action compiles to its own independently-invokable
  endpoint — Next does not gate it behind the referencing page's layout guard
  just because that page lives under it (documented Next.js behavior, not a
  gap specific to this app). And a Local API call has no real `req.user` of
  its own to satisfy Orders'/OrderItems' access control (`Boolean(req.user)`)
  unless a request context is actually built and authenticated first — so
  skipping the explicit check wouldn't "fail safe" via the collection's own
  access rules, it would fail broken (every mutation would 401/silently
  no-op, not just be insecure).

  **The real bug, found and root-caused while verifying `submitOrderToMoySklad`
  live**: every other mutation (status, notes, item edit, item delete, order
  delete) succeeded consistently in live testing, but `submitOrderToMoySklad`
  failed *every* time with a generic "Unauthorized" thrown from inside the
  action's own `requireAdmin()` check — even though the exact same admin
  session, the exact same valid, non-expired JWT cookie, was demonstrably
  still valid (confirmed the session genuinely existed in the DB; confirmed
  the cookie was present and byte-identical on every request via a temporary
  header dump). Root cause: `payload.config.ts`'s `cors`/`csrf` arrays are
  hardcoded to a single value, `process.env.WEB_URL`, and `apps/cms/
  .env.example` (the local, non-Docker dev copy of the env file, distinct
  from the root `.env.example`) still set `WEB_URL=http://localhost:4322` —
  `apps/web`'s *own* address, a stale leftover from before Stage 1
  (2026-08-20, earlier today) made `apps/cms` the single public entry point.

  The actual mechanism, since this is the valuable part for a future reader:
  Payload's cookie-JWT auth strategy (`extractJWT`, in `node_modules/payload/
  dist/auth/extractJWT.js` — not app code, but worth naming so a future
  reader can go find it again) checks the request's `Origin` header against
  the `csrf` allowlist *only* when an Origin header is present; when Origin
  is absent, it falls back to checking `Sec-Fetch-Site` instead (allowing
  `same-origin`/`same-site`/`none`), a check a plain browser page navigation
  typically satisfies regardless of the csrf allowlist, since navigations
  often don't carry Origin at all. A Next Server Action's own internal POST
  *does* carry an Origin header, though — matching this app's real running
  address, not the stale `apps/web` one baked into the local env file — so
  `extractJWT` silently rejected the cookie on every Server Action call
  specifically, while every plain Server Component page-render's own
  `payload.auth()` check (in the guarded layout, and in the read-endpoints-
  turned-functions) kept succeeding, because those never send an Origin the
  csrf allowlist would need to recognize. This is exactly why it looked like
  "everything works except this one specific action" rather than "auth is
  broadly broken" — the split maps precisely onto "page render" vs "Server
  Action," not onto anything about the specific mutation. It also explains
  why this went completely unnoticed through the entirety of Stage 1 and
  Stage 2: Stage 2's only prior Server Action (`submitCheckout`, Stage 2 part
  7) is anonymous checkout and never calls `payload.auth()` at all, so it
  never exercised this path — this is the first Server Action in the whole
  migration that reads the admin session.

  **Fixed** by updating `apps/cms/.env.example`'s `WEB_URL` value from
  `http://localhost:4322` to `http://localhost:3000` (this app's own local
  dev address), with a rewritten comment explaining that `WEB_URL` has meant
  "this app's own public origin" since Stage 1, not `apps/web`'s — kept the
  variable name for consistency with the root `.env.example` and
  `compose.yaml`, both of which already had this correct (their own `WEB_URL`
  comments already describe it as the deployment's public URL, matching
  `WEB_PORT`) — only the `apps/cms`-local, non-Docker dev copy was stale.
  Also rewrote the neighboring `cors`/`csrf` comment in `payload.config.ts`
  itself, which had its own stale explanation ("Lets the storefront, a
  different origin, do a credentialed fetch...", describing the pre-Stage-1
  architecture) — replaced with an explanation of the actual current
  mechanism (Origin/Sec-Fetch-Site validation against this app's own origin,
  still needed even though there's no genuinely different origin anymore).
  Also updated the literal fallback default in both `cors: [...]` and
  `csrf: [...]` from `'http://localhost:4322'` to `'http://localhost:3000'`.

  Root-causing process worth a sentence or two, since it demonstrates real
  rigor rather than a lucky guess: ruled out a bare Payload/Local-API-level
  bug first (a tight loop of 10 sequential `payload.findByID()` calls outside
  any Next.js context, all 10 succeeded — ruling out a DB/connection-pool
  explanation); ruled out a missing/mismatched cookie by adding a temporary
  diagnostic that dumped the raw `Cookie` header and auth result inside
  `getAdminUser()` on every call (cookie present and byte-identical on every
  call, both succeeding and failing ones); then reproduced the exact same
  failure pattern under a genuine `next build && next start` production
  server (not just `next dev`/Turbopack), which ruled out a dev-mode-only
  artifact before finally reading Payload's own `extractJWT` source to find
  the real Origin/csrf/Sec-Fetch-Site branching that explained it. All
  temporary diagnostic logging was removed before committing.

  Verified live (real Playwright/Chromium sessions again — third time in the
  migration after checkout and Stage 3 part 1's login flow, and the first
  time production-mode `next start` was also exercised, specifically to rule
  out the dev-mode theory before landing on the real cause): full login →
  orders list (real KPI cards + a real order row) → order detail page →
  status change → notes save (blur-triggered) → item quantity edit, with the
  recomputed `lineTotal`/order `totalPrice` confirmed via a direct Local API
  query afterward, not just trusted from the UI → submit-to-МойСклад,
  exercising the same graceful-failure path Stage 2's checkout already
  verified (real caught "MOYSKLAD_API_TOKEN is not set" error, order still
  marked submitted) → item delete (via a native `confirm()` dialog,
  auto-accepted through Playwright's `page.on('dialog', ...)` API, which the
  2026-08-14 dev log already noted works fine even though raw CDP
  click-dispatch on a `confirm()`-guarded button doesn't) → order delete,
  confirmed via a direct Local API query afterward that both the order and
  its remaining item were genuinely gone (Payload's own `NotFound` error on a
  direct `findByID`, not just absent from a list view). Zero browser console
  errors across every run. All seeded test data (2 products, 1 category, 1
  admin user, and the order/order-items created and then deleted during the
  delete-flow test) removed before committing. `next build` compiles both new
  routes (`/admin/orders`, `/admin/orders/[id]`) as dynamic. Lint clean, with
  one real fix (not just a suppression): a plain `<a>` tag was switched to
  `next/link`'s `Link` for consistency with the rest of the new admin shell
  (which already uses `Link` throughout), unlike the storefront's own
  deliberate plain-`<a>` choice from earlier stages. `design-sync audit`
  shows no new gaps.

  Three of six page groups remain: calendar/stock/clients/analytics,
  categories/promotions/`products/[id]`, media/users/settings.
- **2026-08-20** — **Stage 3 (admin port), third commit**: page group 4 of 6
  per section 3.5 — `calendar`, `stock`, `clients`, `analytics`. All four are
  read-only, so unlike the previous commit's `orders` group, no new Server
  Actions were needed — just four `lib/admin/data/*.ts` functions
  (`endpoints/admin/{calendar,stock,clients,analytics}.ts`'s bodies minus
  their own `req.user` check, same pattern as `kpi.ts`/`orders.ts`) and four
  pages calling them directly. The endpoints themselves stay untouched,
  still serving `apps/web`'s REST-based admin until Stage 4. The calendar
  page's Gantt-bar hover already used the design's overshoot curve
  (`cubic-bezier(0.34,1.56,0.64,1)`, `scaleY(1.16)`) verbatim in the Astro
  source — the one place section 3.6 flagged in advance as still linear in
  the old code turned out to already be correct here, nothing to fix.
  `proxy.ts` matcher extended to exclude all four routes.

  One real tooling snag, unrelated to the port itself: the scratch Local API
  seed script (`tsx`, same pattern used throughout Stage 2) crashed on
  `payload/dist/bin/loadEnv.js`'s `const { loadEnvConfig } = nextEnvImport`
  destructure — `nextEnvImport` came back `undefined` under `tsx`'s
  esbuild-based CJS transform specifically, not under `next dev` itself.
  Root cause not fully chased down (most likely version skew: `pnpm ls`
  shows both `@next/env@16.3.1` and a stale `@next/env@15.5.23` still
  present in `node_modules`, and `tsx`'s module resolution for a bare
  standalone script may be picking a different one than Next's own bundler
  does) — worked around by seeding through direct authenticated REST calls
  (`/api/users/first-register` for the token, then `Authorization: JWT
  <token>` on plain `fetch`/`curl` POSTs to `/api/{categories,products,
  orders,orderItems}`) instead of the Local API script, which sidesteps the
  broken import path entirely. Flagged here rather than fixed since it only
  affects scratch verification tooling, not shipped code — worth a proper
  look if a future session hits it again, e.g. `pnpm why @next/env` to find
  what still pulls in 15.5.23.

  Verified live: a real Playwright/Chromium session logged in through
  `/admin/login` and landed on `/admin/orders` (confirming the bare `/admin`
  redirect still works end to end), then visited all four new pages with
  real seeded category/product/order/orderItem data — calendar Gantt bar,
  stock row, client card, and analytics revenue bar all confirmed rendering
  the real values, zero browser console errors on any page. All scratch
  data deleted afterward via the same REST/JWT approach; confirmed
  `/api/users/init` back to `{"initialized":false}`. `next build` compiles
  all four new routes as dynamic. Lint clean. `design-sync audit` shows no
  new gaps — `bnRule` and `bnBar` both hit their exact design counts (2/2,
  1/1) for the first time this migration.

  Two of six page groups remain: `categories`/`promotions`/`products/[id]`,
  `media`/`users`/`settings`.
- **2026-08-20** — **Stage 3 (admin port), fourth commit**: page group 5 of 6
  per section 3.5 — `categories`, `promotions`, `products/[id]`. Categories
  and promotions get full list + `[id]` detail (an `id === 'new'` branch
  handles both create and edit from one route, same as the Astro sources —
  no separate near-duplicate "new" page); `products` stays edit-only,
  matching the standing constraint that `moySkladId` is required+readOnly so
  products only ever originate from `sync:moysklad`. Unlike page group 4's
  four read-only tabs, this group's mutations are genuine writes — each of
  `categories`/`promotions`/`products` gets its own `[id]/actions.ts` with
  the same `requireAdmin()`-before-`overrideAccess` pattern the previous
  commit's `orders/[id]/actions.ts` established (a Server Action isn't
  gated by the layout guard just because its page lives under it — that
  reasoning doesn't change per-collection). New `lib/admin/data/
  {categories,promotions,products}.ts` are deliberately separate from the
  storefront's own `lib/data/*.ts` — different depth/filter needs (the
  admin list wants the full set including hidden/inactive rows at depth:0,
  the storefront wants only active/available rows at depth:1) — except the
  product edit page, which reuses `lib/data/products.ts`'s existing
  `getProductById()` unchanged rather than adding a redundant admin-only
  wrapper, since it already does exactly what the edit form needs.
  `lib/admin/mediaUpload.ts` replaces `apps/web/src/scripts/admin-media-
  upload.ts` — the `define:vars` + runtime-`import('/src/scripts/...')`
  hack that file carried was purely an Astro workaround (see its own header
  comment and the 2026-08-14 dev log entry that first added it); a plain
  client module needs none of it. `CategoryForm`/`PromotionForm`/
  `ProductForm.tsx` replace the Astro sources' raw DOM manipulation for the
  image-reorder/remove and kit-item-row UI with ordinary React state
  arrays — same end behavior, idiomatic for the framework instead of a
  hand-rolled DOM diff. `proxy.ts` matcher extended to exclude `admin/
  categories`, `admin/promotions`, `admin/products`.

  Verified live with a real Playwright session against real seeded data (a
  parent+child category pair, one product, created and deleted via
  authenticated REST/JWT calls — the same scratch-tooling workaround page
  group 4 introduced for the still-unresolved `tsx`/`@next/env` crash):
  the categories list rendered the parent+child hierarchy with the correct
  indent; created a new category through the live form and confirmed the
  redirect to its own edit page; opened the child category's edit page and
  confirmed the parent `<select>` correctly pre-selected the seeded parent
  (id match verified, not just visually); deleted it, confirmed the list
  updated. Promotions: created one through the form with a real uploaded
  image (`page.setInputFiles`, not a simulated click), linked the seeded
  product and category via the two multi-selects, saved, and confirmed the
  resulting `/promotions/:slug` public page actually rendered the title and
  the linked product card — the first time this migration verified an
  admin write by checking its effect on the *public* site, not just the
  admin UI or a direct API query. Deleted it afterward and confirmed via a
  second, temporary admin registration that the uploaded media doc *and*
  its file on disk were both actually gone (Payload doesn't cascade-delete
  a referenced media doc when the referencing promotion is deleted, so this
  needed its own explicit cleanup step, caught by checking `/api/media`
  came back empty and `find`-ing the upload directory rather than assuming
  the promotion delete was enough). Products: toggled `isKit` on, added a
  kit item, changed the price, saved, and confirmed all three persisted via
  a direct API query afterward. Zero browser console errors across every
  step. `next build` compiles all six new routes as dynamic. Lint clean
  (only the same pre-existing `no-img-element` advisories already present
  on earlier ported pages, from the same deliberate plain-`<img>` choice).
  `design-sync audit` shows no new gaps.

  One page group remains: `media`/`users`/`settings` — the last of Stage 3,
  after which only Stage 4 (delete `apps/web`, cleanup) is left on the
  whole `docs/PLAN-next-migration.md` plan.
- **2026-08-20** — **Stage 3 (admin port), fifth and final commit — Stage 3
  complete.** Page group 6 of 6 per section 3.5: `media`, `users`,
  `settings` — the plan's own "long tail" grouping, all three screens the
  delivered mockup never designed at all (same reasoning as Категории/Акции
  from the previous commit). Same Server Actions pattern as every prior
  group. `changeOwnPassword()` (`(admin)/admin/users/actions.ts`) reads the
  acting admin's own id from `getAdminUser()` itself rather than trusting a
  client-supplied id — the same "this is you" self-guard the original
  Astro page enforced client-side (only rendering a delete button for other
  rows), now enforced server-side too, so it can't be bypassed by calling
  the action directly with someone else's id. `settings` always POSTs the
  whole `SiteSettings` object, never a partial patch — the standing risk on
  this global, called out since the 2026-08-14 Step 7 dev log entry, is a
  save that silently drops a field. `MediaGrid`/`UsersPanel`/
  `SettingsForm.tsx` replace the Astro sources' raw DOM manipulation with
  React state, same pattern the previous commit's Category/Promotion/
  ProductForm established.

  With all 17 `/admin/*` pages now ported, `proxy.ts`'s matcher lost its
  dozen granular per-route `admin/*` exclusions in favor of one plain
  `admin` alternative — nothing under `/admin/*` falls through to Astro
  anymore, so the earlier discipline (exclude only what's actually ported,
  to keep the strangler-fig invariant honest) no longer has anything left
  to protect.

  **Real bug found and fixed, unrelated to this page group's own logic**:
  `apps/cms/.gitignore`'s `media/` line (meant to exclude the synced-upload
  directory `apps/cms/media/`, re-downloadable via `sync:moysklad`) was
  unanchored — gitignore patterns without a leading `/` match a directory
  of that name at *any* depth, so it also silently swallowed this page
  group's own `src/app/(admin)/admin/media/` route the moment it was
  created: `git status` never listed `actions.ts`/`page.tsx` for that
  route at all. Caught immediately, before committing, because the number
  of files staged via `git add` didn't match the number actually written —
  fixed by anchoring the pattern to `/media/` (relative to that
  `.gitignore`'s own directory), confirmed via `git check-ignore` both ways
  (the real upload directory still ignored, the admin route no longer is).

  Verified live: real Playwright session — media page's file count and a
  real per-item alt-text save (confirmed via a direct API check, not just
  the UI); users page correctly shows "это вы" only on the acting admin's
  own row; created a second admin and confirmed it appeared in the list;
  changed the acting admin's own password and confirmed a **fresh login
  with the new password actually works** (logged out and back in for
  real, not just trusted the UI's success message); deleted the second
  admin and confirmed removal; settings page saved a real field edit plus
  an added "Как это работает" step, confirmed via a direct API query that
  `howItWorksSteps` grew to 5 rows with the right content and nothing else
  was dropped — the exact scenario the standing risk note above exists to
  catch. All scratch state (two admin users, one uploaded media file, the
  extra settings step, the edited field) reverted/deleted afterward;
  confirmed `/api/users/init` back to `{"initialized":false}` and zero
  remaining media docs. Zero browser console errors. `next build` compiles
  all three new routes as dynamic. Lint clean (only the same pre-existing
  `no-img-element` advisories). `design-sync audit` shows no new gaps.

  **This closes Stage 3** — all six page groups (auth+shell+login/first-
  register; index; orders; calendar/stock/clients/analytics; categories/
  promotions/products; media/users/settings) landed the same day they were
  started, across six commits, the same cadence Stage 2 set. Only **Stage 4
  (cleanup)** remains on the whole `docs/PLAN-next-migration.md` plan:
  delete `apps/web` entirely, drop the fallback proxy from `proxy.ts`, drop
  `cors`/`csrf`/`serverActions.allowedOrigins` down to a single origin, drop
  `CMS_INTERNAL_URL`/`PUBLIC_PAYLOAD_URL`, and decide the fate of
  `packages/shared-types` and the `/cms` route now that the custom admin UI
  it was staged behind is fully live in this same process.
