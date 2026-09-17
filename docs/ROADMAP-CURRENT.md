# Playback Rental 2.0 — Current Execution Roadmap

_Last updated: 2026-09-18. This is the operational route sheet. `docs/ROADMAP-2.0.md` remains the detailed historical/consolidated record; when its old point-in-time statuses disagree with this file, use this file for current execution state._

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

### Post-roadmap owner request — direct notifications

- ✅ n8n removed from the 2.0 notification architecture. Checkout and contact events are persisted to a durable local Docker volume and delivered by a dedicated VDS worker.
- ✅ Direct Telegram Bot API delivery with multiple configured recipients.
- ✅ Direct MAX Bot API delivery with multiple configured recipients.
- ✅ Direct SMTP delivery: admin notification plus customer order confirmation.
- ✅ Optional VK community-message delivery via `messages.send`.
- ✅ Per-recipient retry state prevents a failed channel from duplicating already-successful channels.
- ✅ Messenger/SMTP secrets are worker-only; the public `cms` container receives no channel credentials.
- ⏸ Live provider delivery is a deployment-only smoke test because the VDS/production credentials do not exist during development. See [`NOTIFICATIONS.md`](NOTIFICATIONS.md).

## QA / documentation state

- ✅ Full PR CI exists for `2.0`: PostgreSQL service → install → Payload types → migrations → lint → typecheck → tests → production build.
- ✅ Production runtime smoke verifies core public routes, Payload access, admin auth redirects and malformed contact-request rejection.
- ✅ Headless-Chrome smoke verifies browser runtime errors, 375px overflow on core storefront routes, reduced-motion rendering, seeded catalog/search/category/product flows and a real checkout submission.
- ✅ Security/lifecycle smoke verifies public order isolation, order hard-delete denial, final-item cancellation and availability release.
- ✅ Promo acceptance verifies percentage/fixed codes, inactive/expired/unknown codes, threshold behaviour and order-level persisted discount math.
- ✅ Rate-limit/auth smoke verifies real HTTP limits and admin authentication boundaries.
- ✅ Admin-data/content smoke verifies admin page rendering, analytics date-range behaviour, category/user CRUD, SiteSettings preservation, product field ownership, media upload/alt edit, promotion CRUD and password change/re-login.
- ✅ Docker regression coverage verifies `pnpm@11.21.0` is available inside the image with `--network none`, preventing the Codespaces/runtime Corepack download failure fixed in PR #19.
- ✅ The acceptance checklist is maintained in [`SMOKE-TEST-2.0.md`](SMOKE-TEST-2.0.md), with CI-confirmed items marked separately from manual/VDS checks.
- ✅ Direct-notification deployment/configuration is documented in [`NOTIFICATIONS.md`](NOTIFICATIONS.md).
- ✅ The missing audit file referenced by stable code comments was reconstructed, without inventing unavailable prose, as [`audits/2026-08-24-baseline.md`](audits/2026-08-24-baseline.md).
- ⏳ Remaining pre-deployment QA is primarily visual/manual and real-МойСклад integration. Provider delivery, GlitchTip and persistence/backup checks remain deployment-only.

## Independent development status

**All independently actionable Wave 1–5 coding items and the direct-notification replacement are complete.**

What remains is intentionally separated below so deployment work is not confused with product decisions and so owner decisions are not silently guessed by an implementation agent.

## Owner/product decisions still open

- ⏸ Item 11 — auto-cancel abandoned checkout orders. Prior discussion indicates this is probably unnecessary because every request is handled manually after notification; confirm decline/acceptance before building anything.
- ⏸ Manual order creation — decide whether operators need a first-class `/admin` flow for creating an order before cutover.
- ⏸ Retire `/cms` — currently retained as a break-glass fallback. It is a route inside the existing Next/Payload `cms` service, not a separate container, so idle CPU/RAM impact is negligible; the real tradeoff is extra authenticated admin attack surface and maintenance. Operational recommendation: keep it through the initial cutover/rollback window, then retire it only after `/admin` has proven sufficient.
- ⏸ Rename `apps/cms` — naming/clarity only; the directory now contains the whole application. This does not block functionality or deployment.

## Pre-deployment QA gate

Before provisioning the production host:

1. ✅ Automated disposable-environment acceptance is in CI and currently covers runtime/browser/checkout/security/order lifecycle/promo/rate-limit/admin/analytics/media/settings/password plus Docker offline-pnpm startup.
2. ⏳ Run the remaining visual/manual storefront + admin checks in [`SMOKE-TEST-2.0.md`](SMOKE-TEST-2.0.md).
3. ⏳ Run the real-МойСклад integration section with the intended non-legacy credentials.
4. Resolve any defect found by those checks on a short-lived branch into `2.0`.
5. Resolve the owner/product decisions above that are considered cutover blockers; explicitly mark non-blockers as deferred/declined rather than leaving them ambiguous.
6. Confirm the exact `2.0` SHA that will become the deployment candidate.

## Final deployment gate

Only after the user chooses to provision the deployment host/VDS:

1. Provision the host and persistent PostgreSQL, media and notification-queue storage.
2. Configure production secrets, `WEB_URL`, MoySklad credentials/webhook secret and direct notification channel credentials.
3. **Rotate the MAX token that was exposed in the old exported n8n workflow; never reuse that token.**
4. Apply migrations and run the one-time existing-media size backfill.
5. Enable `NOTIFICATIONS_ENABLED=true`, start the direct notification worker and verify Telegram, MAX, SMTP and (if configured) VK delivery, including one controlled retry/restart test.
6. Deploy GlitchTip or choose a hosted Sentry-compatible endpoint; set server/browser DSNs and verify one controlled server error and one controlled browser error.
7. Run the deployment-only sections of [`SMOKE-TEST-2.0.md`](SMOKE-TEST-2.0.md), including checkout → notification → МойСклад end to end.
8. Confirm database/media backups, notification-queue persistence and an explicit rollback procedure.
9. Decide `/cms` fate and the `apps/cms` rename only if they are still desired for this release.
10. Perform cutover from the legacy deployment only after the acceptance record is complete.

## Immediate next action

**No independent feature wave remains.** Automated pre-deployment acceptance is now broad and green. Next: complete the remaining visual/manual smoke pass, run the real-МойСклад integration checks, and resolve the four owner/product decisions above. VDS/production setup remains postponed until those gates are complete.
