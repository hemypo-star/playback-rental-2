# Playback Rental 2.0 — Consolidated Roadmap

*Compiled 2026-08-20 from every work-plan document found in the project, cross-checked against the actual code and git history — not just the docs' own claims.*

Three plans exist, written in sequence, each building on the last:

| # | Document | Scope |
|---|---|---|
| 1 | `~/.claude/plans/rosy-booping-spindle.md` *(local file, outside the repo)* | The master plan — audit + rewrite the whole site as Astro + Payload |
| 2 | [docs/PLAN-docker-admin.md](PLAN-docker-admin.md) | Replace Payload's stock admin with a custom UI, move everything into Docker |
| 3 | [docs/PLAN-next-migration.md](PLAN-next-migration.md) | Fold the Astro app into Payload's own Next.js app — kills the two-process split plan #2 introduced |

Below: each plan's own checklist, ~~struck through~~ where the code confirms it's actually done, followed by the open items every plan leaves behind, the places the three plans disagree with each other or with the code, and a suggested order of attack.

---

## 1. Master plan — `rosy-booping-spindle.md`

The original scope: audit the old Supabase/Vite app, don't rebuild its dead code, replace it with Astro + Payload + a МойСклад sync, cut over, retire the old stack.

- ~~**Phase 0 — Setup & МойСклад spike**~~ — done 2026-08-12. Branch `2.0`, monorepo scaffolded, account structure mapped (rental listings are Услуга/service entities, matched to a parallel Товар/product tree for stock).
- ~~**Phase 1 — Payload backend + МойСклад sync**~~ — done 2026-08-12. Collections, price/availability hook, two-way sync, order push to МойСклад, notification webhook.
- ~~**Phase 2 — Astro storefront**~~ — done 2026-08-13/14, plus the custom admin UI and Docker deployment that weren't in the original Phase 2 scope at all (see plan #2 below — added mid-stream, not planned here).
- **Phase 3 — Cutover** — **not started.** `main` still deploys the legacy Vite/Supabase app on every push (`.github/workflows/*.yml`, `pm2 reload ecosystem.config.cjs`); the `2.0` branch has never been merged or pointed at a domain.
- **Phase 4 — Retire old stack** — **not started**, blocked on Phase 3.

**Reality check on the estimate:** this plan budgeted "~5.5–7.5 weeks" total for Phases 0–4. Phases 0–2 alone have run 2026-08-12 → 2026-08-20 and, per the dev log, absorbed an entire second project (custom admin + Docker, plan #2) that this plan never scoped, and are about to absorb a *third* (the Next.js merge, plan #3) before Phase 3 can start. Nobody has re-cut the estimate since — worth doing before promising a cutover date.

---

## 2. `docs/PLAN-docker-admin.md`

Two goals: a fully custom `/admin` UI (Payload demoted to headless backend, keeping `/cms` as a safety net), and everything running through Docker on one public port.

| Step | Scope | Status |
|---|---|---|
| 0 | Design reference extraction, plan committed to repo | ~~Done~~ |
| 1 | Proxy fixes (gzip double-decode bug, Server Actions origin, split `CMS_INTERNAL_URL`/`PUBLIC_PAYLOAD_URL`, Payload admin moved to `/cms`) | ~~Done~~ — verified live 2026-08-14 |
| 2 | Docker (`compose.yaml`/`compose.dev.yaml`, multi-stage Dockerfiles, single published port) | ~~Done~~ — verified with a real `docker compose up` |
| 3 | Admin shell + auth (`/admin/*` guard, JWT-header SSR auth, login/logout) | ~~Done~~ |
| 4 | Dashboards (KPI, orders, calendar, stock, clients, analytics — 6 new `GET /api/admin/*` endpoints) | ~~Done~~ — verified against real synced data |
| 5 | Order operations (status, notes, item edits, delete, manual МойСклад submit) | ~~Done~~ — verified, including the `endDate < startDate` hook-error path |
| 6 | Catalog editing (Categories/Promotions CRUD, Products edit-only, image upload) + the deferred promotion detail page (`/promotions/:slug`) | ~~Done~~ |
| 7 | Long tail (`/admin/settings`, `/admin/media`, `/admin/users`) | ~~Done~~ |
| 8 | Retire `/cms` from the proxy allow-list (keep the route as a break-glass fallback) | **Not done — intentionally.** Plan requires "a week of the owner actually using `/admin`" first; it's been ~6 days since Step 7 shipped (2026-08-14 → today). Also now entangled with plan #3, see [Conflict 2](#conflicts) below. |

**Bonus item this plan doesn't track:** the long-standing "unstyled Payload admin" bug called out as unresolved in `CLAUDE.md`'s design-system section — root-caused and fixed during Step 1 (missing `@payloadcms/next/css` import). ~~Resolved.~~

---

## 3. `docs/PLAN-next-migration.md`

Explicitly "a continuation of PLAN-docker-admin.md" — folds `apps/web` (Astro) into `apps/cms` (Next.js) entirely, because Payload's Local API only works in-process, and the two-process split from plan #2 is what forces the proxy/REST/dual-URL machinery that plan describes. End state: one Next.js app, `apps/web` deleted.

This is the **newest** plan (committed today, 2026-08-20, alongside the first real code from it) and is almost entirely unstarted:

**Stage 0 — Prep**

- [x] 0.1 Scope `typescript.ignoreBuildErrors`/`eslint.ignoreDuringBuilds` to specific paths instead of the whole app — **done 2026-08-20.** Added `apps/cms/eslint.config.mjs`; `no-explicit-any` suppression scoped to `app/(payload)/**`, `endpoints/**`, `components/admin/**`, `lib/rental/**`; `eslint.ignoreDuringBuilds` removed entirely. The handful of errors this surfaced outside those paths (real `any`s in `collections/OrderItems.ts`/`Orders.ts`, three admin nav links using `<a>` instead of `next/link`) were fixed, not suppressed.
- [x] 0.2 Upgrade Next 15 → 16.3 before migrating — **done 2026-08-20**, `apps/cms/package.json` now pins `"next": "^16.3"` (16.3.1 resolved). The `ReactPortal`/`LayoutProps` bug isn't fixed by the upgrade alone, but combined with the existing Fragment-wrap workaround in `layout.tsx`, `next build`'s generated-type check now passes — `typescript.ignoreBuildErrors` was removed.
- [x] 0.3 Extract the design bundle into a machine-checkable spec — `tools/design-sync.mjs` and `docs/design-reference/spec/{tokens.css,interactions.css}` exist, and both files are now actually wired in (`apps/cms/src/styles/global.css` imports both, done as part of Stage 1 — see below), not just generated.
- [ ] 0.4 Freeze the manual smoke-test checklist — still not done as a formal written checklist. Stage 1 itself was verified live (real `next dev` + `astro dev` against a real Postgres, not just `next build`), but that was ad hoc, not against a frozen list — worth doing before Stage 2 starts touching real pages.
- [ ] 0.5 Leave `MOYSKLAD_API_TOKEN`/`NOTIFICATION_WEBHOOK_URL` alone — trivially true so far (nothing's touched them).

**Stage 1 — Shell + proxy reversal** — **done 2026-08-20**, verified live. `apps/cms` (Next) is now the single public entry point; `apps/cms/src/proxy.ts` (named for Next 16's renamed convention, not `middleware.ts`) fallback-proxies everything not yet ported to the still-live Astro app, which lost its own proxy logic entirely (kept only the `/admin` session guard). `apps/cms/src/app/(frontend)/layout.tsx` exists as a skeleton (no Navbar/Footer yet — Stage 2 scope). One real bug found only by running real `next dev` + `astro dev` concurrently, not by `next build` alone: a same-origin redirect with a relative Location header crashed Next's Node-runtime proxy handling (`TypeError: Invalid URL`) the way Astro's own proxy never did — fixed by always rewriting to an absolute URL. `(admin)` route group still doesn't exist — that's Stage 3.

**Stage 2 — Storefront port** (7 page groups, Local API data layer, cache-freshness handling) — **in progress, started 2026-08-20.** Page group 1 of 7 done (legal pages: `/privacy-policy`, `/user-agreement`, both dropped out of `proxy.ts`'s fallback matcher). Since every page needs it, this pass also built the shared chrome Stage 1 deliberately deferred — Navbar/Footer, the `lib/data/siteSettings.ts` Local API layer, and near-verbatim ports of CartBadge/AdminPanelLink/RentalDatePicker — so page groups 2–7 inherit working chrome instead of each needing to build it. `design-sync audit` run against the ported chrome and fixed to spec (20/21 transitions now have explicit `ease-*`/`duration-240`, one pre-existing gap left alone in shared `global.css` to avoid apps/web drift). Page group 2 of 7 done (`/how-it-works` static port, `/contact` via `getSiteSettings()`, `ContactForm` client island posting to `apps/cms`'s own `/api/contact-notification` endpoint directly instead of `apps/web`'s REST wrapper — no new backend code, that endpoint already existed). Page group 3 of 7 done 2026-08-20: the homepage (`app/(frontend)/page.tsx`, 297-line source, the largest template in the plan), `export const dynamic = 'force-dynamic'` since stock/availability/promotions aren't visible to Next at request time; new `lib/data/{categories,products,promotions}.ts` and `lib/mediaUrl.ts`/`lib/categoryTree.ts` (the latter's `buildCategoryTree`/`flattenCategoryTree` carried over unused, needed by the catalog sidebar next); new `ProductCard.tsx` (plain Server Component, relies on part 1's delegated click listener) and `PromoCarousel.tsx` (client island, ported verbatim); `proxy.ts` matcher fixed to actually exclude the now-ported bare root `/` (previously fell through to Astro regardless, since an empty remainder trivially satisfies a negative lookahead over non-empty alternatives). Verified live against real `next build`/`next dev`+`astro dev`, including confirming category-tile/kit/marquee sections' absence in the empty local dev DB was genuinely zero-data, not a rendering bug. **Page group 4 of 7 done 2026-08-20**: catalog (`catalog/page.tsx` + `catalog/[slug]/page.tsx`, both `force-dynamic`; `[slug]` redirects to `/catalog` on an unresolved slug and has its own `generateMetadata()`, backed by a new `getCategoryBySlug()` wrapped in React's `cache()` since Local API calls don't get `fetch()`'s automatic per-request dedup); `CatalogPage.tsx` (plain Server Component) and `CategorySidebar.tsx` (new `'use client'` — the mobile `<select>`'s `onChange` needs a real handler, unlike Astro's string `onchange="..."`); `catalog-availability.ts` duplicated from `apps/web` (same duplicate-not-move pattern as `cart-actions.ts`), wired via `CatalogAvailabilityInit.tsx` (same `useEffect`-wrapper pattern as part 1's `CartActionsInit.tsx`); new `lib/rentalAvailability.ts`, a browser-only client hitting this app's own same-origin `/api/rental-availability-bulk` directly (the old REST client's `CMS_INTERNAL_URL`/`PUBLIC_PAYLOAD_URL` split doesn't apply here). `proxy.ts` matcher extended to exclude `catalog`. Verified live with a real (temporary, deleted before commit) seeded category + 2 products, since the dev DB otherwise has no synced МойСклад data: sidebar category count, both product cards, `/catalog/[slug]`, `?q=` search filtering, and the redirect-on-unknown-slug all curl-confirmed; `/product/1` still correctly falls through the proxy to Astro. Remaining: product (`[id]` + `ProductPurchasePanel`/`QuantitySelector` islands — `RentalDatePicker` already ported), promotions, checkout (in that order per the plan) — **product is next up.**

**Stage 3 — Admin port** (auth simplification, 7 endpoint→server-function conversions, Server Actions for mutations) — not started.

**Stage 4 — Cleanup** (delete `apps/web`, drop the proxy/dual-URL/cors machinery plan #2 built) — not started, and not startable until 2–3 are done.

**Net:** of the ~7 estimated working days in this plan, Stage 0 (0.1/0.2/0.3) and Stage 1 have landed, and Stage 2 is underway (4 of 7 page groups, plus the shared chrome all the rest depend on) as of 2026-08-20; Stages 3–4 are still fully unstarted.

---

## Unplanned work found in the code, not in any plan

**Hierarchical categories.** Today's commit (`a4c958f`) also added a `parent` relationship field to the `Categories` collection and a new `apps/web/src/lib/categoryTree.ts` (tree-building + depth-first flatten, used by `CatalogPage.astro`/`CategorySidebar.astro`). This is real, working scope — but it appears in **none** of the three plans, and the delivered design reference (`docs/design-reference/`) only specifies a flat, single-level sidebar. Two follow-on consequences nobody's written down yet:

- The design-sync `audit` tool (plan #3, §0.3) has no concept of this UI — it can check hover/transition fidelity against the bundle, not a layout the bundle never had.
- Plan #3 §3.6 already flags five *admin* screens (Категории, Акции, Медиатека, Пользователи, Настройки) the mockup never designed and says to "match the neighboring screens" — hierarchical categories on the **storefront sidebar** is a sixth instance of the same problem, on the public site this time, and isn't mentioned there.

---

## Open items — aggregated

Everything above that isn't struck through, in one place:

1. **Cutover to `2.0` (master plan Phase 3–4)** — blocked behind essentially all of plan #3.
2. **Retire `/cms` from the proxy (docker-admin Step 8)** — waiting on "a week of owner usage" *and* now overlaps plan #3's own Stage 4 decision on the same route (see conflict below).
3. **Next.js migration, Stages 1–4** — effectively the whole plan; only spec-generation (part of 0.3) is done.
4. ~~**Next.js migration 0.1/0.2**~~ — scope the lint/type-check ignore flags, upgrade to Next 16.3 — done 2026-08-20.
5. **~28 `: any` usages** in `apps/cms/src/lib/moysklad` and `apps/cms/src/endpoints` — tracked since 2026-08-14 as a follow-up, currently shielded by the blanket `ignoreDuringBuilds`/`ignoreBuildErrors` flags item 4 above is supposed to narrow.
6. **Design-token wiring** — `tokens.css`/`interactions.css` exist but aren't imported into either app yet; the 86-of-89-transitions-wrong-easing and missing-keyframe gaps `docs/DESIGN-SYNC.md` measured are still live in the shipped Astro code today.
7. ~~**Hierarchical categories UI**~~ — undocumented in every plan and in the design reference; needs an explicit design decision (indent depth, styling) rather than inheriting one from the bundle. Done 2026-08-20: documented the shipped storefront-sidebar behavior as a hand-authored spec, [`docs/design-reference/hierarchical-categories.md`](design-reference/hierarchical-categories.md), so Stage 2 of the Next.js migration has something to build against. The two admin-side gaps flagged alongside this in plan #3 §3.6 (Категории/Акции/etc. screens with no mockup) are still open — this only covers the public sidebar.
8. **`packages/shared-types` fate** — plan #3 §Stage 4 conditions its removal on whether "the legacy Vite/React app is still used" — that app has no retirement plan of its own except master-plan Phase 4, which is now several stages away.
9. **React 18/19 dedupe hack** (`resolve.dedupe` in `astro.config.mjs`) — plan #3 notes it disappears with Astro but the *cause* (legacy root app pinned to React 18, same pnpm workspace) persists until that app is actually deleted.

Deliberately **not** open items — decided and closed, not gaps: blog/content management, a real client/CRM collection, an off-hours pickup surcharge (all declined by the owner in favor of simpler alternatives, per the 2026-08-13 dev log).

---

## Conflicts

**1. Plan #3 quietly obsoletes most of plan #2's Docker work.**
Plan #2 built two Docker services (`web`, `cms`), a reverse proxy, a compression fix, `serverActions.allowedOrigins`, and a `CMS_INTERNAL_URL`/`PUBLIC_PAYLOAD_URL` split — all specifically to make one Astro process and one Next process share a port. Plan #3's whole premise is that this split shouldn't exist; its Stage 4 deletes the `web` service, the second Dockerfile, and every piece of machinery plan #2 Step 2 added. Framed as a "continuation," but in practice it's a rollback of real, verified infrastructure work from six days ago. **Practical implication:** don't invest further polish in `apps/web`'s Docker/proxy setup (e.g. finishing docker-admin Step 8) — it's scheduled for deletion, not hardening.

**2. Two plans both claim ownership of "when to retire `/cms`", and neither says the other exists.**
Docker-admin Step 8 gates it on a week of owner usage of `/admin`. Next-migration Stage 4 lists "решить судьбу Step 8 из старого плана" (decide the fate of the old plan's Step 8) as one of its own cleanup line items — but that's the *proxy prefix* question, and by Stage 4 `/cms` is a same-origin Next route group anyway, a different mechanism than the "proxy allow-list" plan #2 describes. Whoever picks this up should treat plan #2's Step 8 as superseded by plan #3, not as a parallel task to finish first.

**3. Master-plan scope has silently ~doubled with no updated estimate.**
The original plan priced Phases 0–4 at 5.5–7.5 weeks and said nothing about a custom admin or a mid-project framework consolidation. Both happened anyway (good calls individually, per the dev log's reasoning), but no document currently states a revised total timeline or an updated Phase 3 target date — worth a short note in the master plan or `CLAUDE.md` so "when does this ship" has one answer instead of three plans' worth of implicit ones.

**4. Hierarchical categories vs. the design reference.**
Not a plan-vs-plan conflict, but a code-vs-source-of-truth one: `CLAUDE.md` and plan #3 both treat `docs/design-reference/` as the single source of truth for what the storefront should look like ("верстать по спеке, а не по глазам"). The category tree feature has no spec there to build against, so whoever does the Stage-2 storefront port (plan #3) will have to design this UI from scratch mid-migration, the same class of "no spec exists" problem plan #3 §3.6 already flags for five admin screens — just not yet written down for this one.

---

## Suggested order of attack

1. **Decide the timeline question (Conflict 3) first** — it's cheap (one conversation) and changes how much of the below is worth doing before a cutover date is picked.
2. ~~**If proceeding with the Next.js migration:** do Stage 0.1/0.2 (scope lint flags, Next 16.3) before touching Stage 1~~ — done 2026-08-20.
3. ~~**Write a one-paragraph spec for hierarchical categories**~~ (open item 7) before Stage 2 gets there, so it's not designed from scratch mid-port — done 2026-08-20.
4. ~~**Stage 1 (shell + proxy reversal)**~~ — done 2026-08-20, verified live. **Stage 2 in progress**: legal pages + shared chrome (Navbar/Footer/data layer/islands) done, how-it-works/contact done, homepage (`index`, the largest template in the plan at 297 lines) done 2026-08-20, catalog (index + `[slug]` + `CategorySidebar`) done 2026-08-20; next up product (`[id]` + `ProductPurchasePanel`/`QuantitySelector` — `RentalDatePicker` already ported), then promotions, checkout last, per docs/PLAN-next-migration.md's own page order.
5. **Stop polishing `apps/web`'s Docker setup** (Conflict 1) — anything beyond what's already shipped is work plan #3 deletes.
6. **Revisit `/cms` retirement (open item 2) only after Stage 3 of plan #3 lands** — at that point it's a Next route-group decision, not a proxy one, and Step 8 as written no longer applies cleanly.
