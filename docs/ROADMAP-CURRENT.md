# Playback Rental 2.0 — Current Execution Roadmap

_Last updated: 2026-09-17. This is the operational route sheet. `docs/ROADMAP-2.0.md` remains the detailed historical/consolidated record; when its old point-in-time statuses disagree with this file, use this file for current execution state._

## Ground rules

- Work only from `2.0` and short-lived feature branches.
- Do not touch `main` or `prod` until the final cutover.
- No VDS/production deployment until development items are complete.
- Real GlitchTip delivery is intentionally deferred until deployment exists; the integration stays disabled when DSN variables are empty.

## Design handoff — `design_handoff_swiss_bento`

The design/UX work was a separate initiative from `docs/ROADMAP-2.0.md`, which is why it was easy to miss in the main roadmap. It is explicitly tracked here.

Source of truth: `design_handoff_swiss_bento/08-instruction.md`, backed by `docs/design-reference/` and the dev log in `CLAUDE.md`.

| Block | Scope | Status |
|---|---|---|
| A | Money, stock, rate limiting, checkout error behaviour | ✅ Done |
| B | Date flow, cart calculations, business hours, pluralisation, consent controls | ✅ Done |
| C | Navigation/performance/images/catalog query cleanup | ✅ Done, including backlog item 9 origin-size optimisation |
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

- ✅ Item 9 remainder — Payload now generates width-preserving `card` (800px) and `large` (1600px) variants; `mediaUrl()` prefers a bounded source and falls back safely for old media; high-volume product cards use `card`. Existing media can be backfilled explicitly with `pnpm --dir apps/cms regenerate:media-sizes` once the real persistent media volume exists. Merged as `57844ae`.

### Wave 5 — analytics

- ✅ Item 14 — `/admin/analytics` now supports inclusive date-range filtering by order creation date in Kemerovo business time, while preserving exact net-revenue promo-discount allocation. Unit tests cover date validation/boundaries. Merged as `bc91f64`.

## QA / documentation state

- ✅ Full PR CI exists for `2.0`: PostgreSQL service → install → Payload types → migrations → lint → typecheck → tests → production build.
- ✅ The previously missing formal manual checklist is frozen in [`SMOKE-TEST-2.0.md`](SMOKE-TEST-2.0.md).
- ✅ The missing audit file referenced by stable code comments was reconstructed, without inventing unavailable prose, as [`audits/2026-08-24-baseline.md`](audits/2026-08-24-baseline.md).
- ⏳ Final manual smoke execution is still a gate, not completed by documentation alone. Run the local/disposable portion before deployment and the deployment-only portion on the final host.

## Independent development status

**All independently actionable Wave 1–5 coding items are complete.**

What remains is intentionally separated below so deployment work is not confused with product decisions and so owner decisions are not silently guessed by an implementation agent.

## Owner/product decisions still open

- ⏸ Item 11 — auto-cancel abandoned checkout orders. Prior discussion indicates this is probably unnecessary because every request is handled manually after notification; confirm decline/acceptance before building anything.
- ⏸ Manual order creation — decide whether operators need a first-class `/admin` flow for creating an order before cutover.
- ⏸ Retire `/cms` — currently retained as a break-glass fallback. Remove only after an explicit decision and after every needed operation has an intentional replacement in `/admin`.
- ⏸ Rename `apps/cms` — naming/clarity only; the directory now contains the whole application. This does not block functionality or deployment.

## Pre-deployment QA gate

Before provisioning the production host:

1. Run the non-deployment sections of [`SMOKE-TEST-2.0.md`](SMOKE-TEST-2.0.md) against a disposable environment with representative data.
2. Resolve any defect found by that run on a short-lived branch into `2.0`.
3. Resolve the owner/product decisions above that are considered cutover blockers; explicitly mark non-blockers as deferred/declined rather than leaving them ambiguous.
4. Confirm the exact `2.0` SHA that will become the deployment candidate.

## Final deployment gate

Only after the user chooses to provision the deployment host/VDS:

1. Provision the host and persistent PostgreSQL/media storage.
2. Configure production secrets, `WEB_URL`, MoySklad credentials/webhook secret and notification webhook.
3. Apply migrations and run the one-time existing-media size backfill.
4. Deploy GlitchTip or choose a hosted Sentry-compatible endpoint; set server/browser DSNs and verify one controlled server error and one controlled browser error.
5. Run the deployment-only sections of [`SMOKE-TEST-2.0.md`](SMOKE-TEST-2.0.md), including checkout → notification → МойСклад end to end.
6. Confirm database/media backups and an explicit rollback procedure.
7. Decide `/cms` fate and the `apps/cms` rename only if they are still desired for this release.
8. Perform cutover from the legacy deployment only after the acceptance record is complete.

## Immediate next action

**No new independent feature wave remains.** Next: run the pre-deployment/manual smoke pass and resolve the four owner/product decisions above. VDS/production setup remains deliberately postponed until those development/decision gates are complete.
