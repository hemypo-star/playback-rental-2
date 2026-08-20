# Playback Rental 2.0 — working notes

Context for whoever (human or Claude) picks this branch up next. Setup/run instructions
are in `README.md`; this file is architecture, gotchas, and a running dev log.

## What this is

A full rewrite of the Playback Rental storefront + admin (camera/video equipment rental,
Kemerovo). Old app: React/Vite SPA + self-hosted Supabase, on `main`/`prod`, still live.
New app: Astro storefront (`apps/web`) + Payload CMS admin/backend (`apps/cms`), on this
branch (`2.0`), cut over once verified end-to-end.

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
- **Selected rental dates are session-scoped** (`apps/web/src/stores/dates.ts`,
  sessionStorage-backed) — resets per new tab/session, same behavior as the old app's
  `BookingDatesContext`. The store's initial value is always `{null, null}` on both
  server and the client's first render, with the persisted value applied a tick later —
  reading sessionStorage synchronously at module scope causes a React hydration
  mismatch (the server has no sessionStorage to agree with). Components that render
  date-derived text (`RentalDatePicker`) gate on a post-mount `mounted` flag for the
  same reason — don't remove it.
- **Payload's REST API wraps single-document create/update responses as `{ doc,
  message }`**, unlike GET which returns the document directly. `apps/web/src/lib/
  payload.ts` has a `mutate<T>()` helper that unwraps this — use it (not raw `request`)
  for any new POST/PATCH call, or the response will silently be the wrong shape (this
  exact bug made checkout create orders with no items for a while — order creation
  "succeeded" but `order.id` was `undefined`, so the follow-up orderItem POST silently
  omitted the `order` field).
- **`position: fixed` modals must portal to `document.body`.** The navbar header uses
  `backdrop-filter` (the frosted-glass look), which establishes a new containing block
  for `position: fixed` descendants — a modal rendered as a normal child anywhere under
  it gets confined to the header's own box instead of the viewport. `RentalDatePicker`'s
  modal uses `createPortal`; follow that pattern for any new modal.
- **New Payload custom admin component → regenerate the import map.** After adding or
  changing an `admin.components.*` entry (`payload.config.ts`) or a collection's
  `admin.components.Cell`, run `npx payload generate:importmap` from `apps/cms`, or the
  dev server throws `PayloadComponent not found in importMap` on that route.
- **Known open issue**: the Payload admin UI (`/admin`) renders with its base styling
  not fully applied (unstyled-looking inputs/buttons, though CSS custom properties like
  `--font-body`/`--style-radius-*` do apply). Confirmed not caused by `--turbo` (persists
  under plain `next dev` too) and not a build error — most likely pre-existing, since it
  reproduces on components untouched this session. Not yet root-caused; worth a fresh
  look if it's still there next time.

## Design system (light theme, applied 2026-08-13)

Ported from a delivered design (`Playback Rental - прокат техники.html`, a bundled
Claude Artifact — not plain HTML; see "extracting the design" below if it needs
re-reading). Tokens live in `apps/web/src/styles/global.css` as Tailwind v4 `@theme`
values:

| Token | Value | Use |
|---|---|---|
| `--color-background` | `#EFEEEB` | page canvas |
| `--color-foreground` / `--color-primary` | `#0A0A0A` | ink text, primary buttons |
| `--color-accent` / `--color-primary-hover` | `#D62410` | the one accent color — links, hover states, savings badges |
| `--color-card` | `#FFFFFF` | card surfaces |
| `--color-muted` / `--color-muted-well` | `#F4F3F1` / `#F9F8F7` | wells, inputs |
| `--color-subtle` | `#75736E` | secondary text |
| `--font-sans` | Golos Text | self-hosted variable font, `apps/web/public/fonts/` |

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
