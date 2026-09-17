# Playback Rental 2.0 — Current Execution Roadmap

_Last updated: 2026-09-17. This is the short operational route sheet. `docs/ROADMAP-2.0.md` remains the detailed historical/consolidated record._

## Ground rules

- Work only from `2.0` and short-lived feature branches.
- Do not touch `main` or `prod` until the final cutover.
- No VDS/production deployment until development items are complete.
- Real GlitchTip delivery is intentionally deferred until deployment exists; the integration stays disabled when DSN variables are empty.

## Design handoff — `design_handoff_swiss_bento`

The design/UX work was a separate initiative from `docs/ROADMAP-2.0.md`, which is why it was easy to miss in the main roadmap. It is now explicitly tracked here.

Source of truth: `design_handoff_swiss_bento/08-instruction.md`, backed by `docs/design-reference/` and the dev log in `CLAUDE.md`.

| Block | Scope | Status |
|---|---|---|
| A | Money, stock, rate limiting, checkout error behaviour | ✅ Done |
| B | Date flow, cart calculations, business hours, pluralisation, consent controls | ✅ Done |
| C | Navigation/performance/images/catalog query cleanup | ✅ Done, except backlog item 9's optional origin-size optimisation below |
| D | Operator admin UX: order editing, rollback, totals, calendar, filters, undocumented admin screens | ✅ Done |
| E | Screen-by-screen visual reconciliation, motion tokens, mobile admin, legal layout, carousel/product-card variants | ✅ Done |
| Follow-up | Navbar horizontal overflow at 360–390px (PR #24) | ✅ Done |

A–E were recovered into `2.0` in catch-up commit `eef63c1` after the original PR history was unavailable in the recovered repository. The detailed per-block notes remain in `CLAUDE.md`.

## Feature backlog — current state

### Wave 1 — independent fixes

- ✅ Item 10 — remove catalog-wide 500-row fetches / targeted aggregates.
- ✅ Item 6 — cart quantity guard + per-line checkout error attribution.
- ✅ Item 8 — search title + description + tag.
- ✅ Item 4 remainder — admin orders pagination.

### Wave 2 — orders/pricing

- ✅ Item 2 — cancel orders instead of hard-delete.
- ✅ Last-item deletion — deleting the final order item auto-cancels the order; orders are never deleted by this path.
- ✅ Item 5 — promo codes, percentage and fixed-rouble discounts, applied at order level.

### Wave 3 — infrastructure

- ✅ Item 3 — optional GlitchTip/Sentry-compatible integration landed in `2.0` (`10e7b944`). Full CI added at the same time.
- ⏸ Real GlitchTip server/browser event delivery — deferred until the final deployment stage because no VDS exists during development.
- ✅ Item 13 — cache categories, site settings and catalog aggregates with immediate admin invalidation and a 60s fallback TTL (`1a8e779`). Product lists and availability remain uncached.

### Wave 4 — image source optimisation

- 🟡 Item 9 remainder — `next/image` already serves correctly sized images to users, but `mediaUrl()` still gives Next the original Payload file. Remaining question/work: add context-sized Payload image variants so a cold Next image-optimizer cache does not have to fetch the original first.
- Scope must stay narrow: do not regress existing `next/image`, responsive `sizes`, lazy loading or hero priority behaviour.

### Wave 5 — analytics

- ⬜ Item 14 — date-range filtering for revenue-by-category analytics.

## Deferred / owner decisions

- ⏸ Item 11 — auto-cancel abandoned checkout orders: prior discussion indicates this is probably declined because every request is processed manually; confirm before building.
- ⏸ Retire `/cms` — keep as break-glass fallback until explicitly decided otherwise. Before removing it, ensure there is an intentional in-app path for any operation still available only there.
- ⏸ Rename `apps/cms` — naming/clarity only; current directory now contains the whole application.
- ⏸ Manual order creation — still an owner/product decision if it is required before cutover.
- ⏸ Cutover timing/process — only after development, final smoke tests and deployment setup.

## Final deployment gate

After Wave 5 and any confirmed owner-decision work:

1. Run full CI and a manual smoke checklist against `2.0`.
2. Provision the deployment host/VDS.
3. Configure PostgreSQL, persistent media storage, secrets, MoySklad and notification webhook.
4. Deploy GlitchTip or choose its hosted equivalent; set server/browser DSNs and verify one real server error and one real browser error.
5. Run end-to-end checkout/admin/MoySklad smoke tests on the deployed environment.
6. Decide `/cms` fate and `apps/cms` naming only if still desired.
7. Perform cutover from legacy `main`/`prod` to 2.0 using an explicit rollback plan.

## Immediate next action

**Wave 4 / item 9 remainder:** decide and implement Payload image variants + `mediaUrl()` size selection only where it materially reduces origin fetch size. Then run CI and merge into `2.0` before starting item 14.
