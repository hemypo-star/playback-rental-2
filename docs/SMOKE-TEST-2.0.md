# Playback Rental 2.0 — manual smoke-test checklist

This is the frozen manual acceptance checklist for `2.0`. Automated CI remains mandatory, but CI does not replace the browser/integration checks below.

Use this checklist twice:

1. **Pre-deployment** against a disposable/local environment with representative seeded data.
2. **Final deployment gate** against the real deployment before cutover from the legacy app.

Do not run destructive checks against legacy `main` / `prod` data.

## 0. Automated gate

Before manual testing:

- [ ] `2.0 CI` is green on the exact commit being tested.
- [ ] Payload migrations apply successfully to an empty/test PostgreSQL database.
- [ ] `lint`, `tsc --noEmit`, unit tests and `next build` all pass.
- [ ] No uncommitted/generated type changes remain after `payload generate:types`.

## 1. App startup and shared chrome

- [ ] App starts with the documented Docker/dev workflow.
- [ ] `/` loads with no browser-console errors.
- [ ] Navbar, cart badge, footer and mobile navigation render correctly.
- [ ] At 360–390px viewport width there is no horizontal page overflow.
- [ ] `prefers-reduced-motion` does not leave required content hidden or inaccessible.
- [ ] `/privacy-policy`, `/user-agreement`, `/how-it-works` and `/contact` load normally.

## 2. Catalog and product browsing

- [ ] `/catalog` loads real products and category counts.
- [ ] Category navigation works for parent and nested categories.
- [ ] Search matches title/description/tag as expected.
- [ ] Search/filter navigation preserves the intended catalog section.
- [ ] Product cards show stock state, price and image without layout shift.
- [ ] `/product/[id]` shows gallery, category breadcrumb, description and related products.
- [ ] Responsive product/category/promotion images load through Next Image; no broken media URLs.
- [ ] After the real media volume is available, run `pnpm --dir apps/cms regenerate:media-sizes` once and confirm existing media receives `card` / `large` variants.

## 3. Dates, availability and cart

- [ ] Opening add-to-cart without dates leads to the intended date-selection flow rather than a dead end.
- [ ] Same-day rental is priced as one calendar day.
- [ ] Multi-day pricing matches the inclusive calendar-day convention.
- [ ] Displayed price does not change when only pickup/return time changes.
- [ ] Availability reflects overlapping confirmed/pending reservations according to the current business rules.
- [ ] An unavailable quantity produces a Russian actionable error, not an English/API error.
- [ ] Cart quantity cannot be reduced below 1.
- [ ] Cart without dates does not show misleading `0 ₽` totals.
- [ ] Checkout summary shows rate, duration, quantities and final total consistently.
- [ ] Consent controls are keyboard-operable native checkboxes.

## 4. Checkout and promo codes

Use disposable customer data.

- [ ] Checkout without a promo code creates an order and its order items.
- [ ] Percentage promo code applies the expected discount.
- [ ] Fixed-rouble promo code applies the expected discount.
- [ ] Minimum-order threshold is enforced for both promo types.
- [ ] Invalid/inactive/expired promo produces the expected inline state.
- [ ] Order total equals line-item gross total minus the stored order-level promo discount.
- [ ] Failed item validation does not leave partial order items behind.
- [ ] Checkout success state shows the created order number and selected dates.
- [ ] Public checkout cannot read/update/delete arbitrary existing orders.
- [ ] Rate-limit behaviour works for checkout/login/contact paths according to the implemented limits.

## 5. Custom `/admin` authentication

- [ ] Unauthenticated `/admin/*` access redirects to login.
- [ ] Admin can log in and log out.
- [ ] Password change works and a fresh login with the new password succeeds.
- [ ] Server Actions reject unauthenticated mutation attempts.
- [ ] Mobile admin navigation works without horizontal page overflow.

## 6. Orders admin

- [ ] Orders list pagination works and preserves active filters.
- [ ] Status filter works.
- [ ] Phone/name search works.
- [ ] Order detail displays customer, items, dates, totals, notes and status correctly.
- [ ] Editing item quantity/dates saves once on blur rather than on every keystroke.
- [ ] Invalid edit rolls the visible field back to the persisted value.
- [ ] Order total updates after item changes without stale client-side arithmetic.
- [ ] Deleting a non-final item leaves the order intact and recalculates totals.
- [ ] Deleting the final item **cancels** the order; it never hard-deletes the order.
- [ ] Changing status to cancelled releases the order from active availability.

## 7. Calendar, stock and other admin screens

- [ ] Calendar renders overlapping reservations in separate lanes.
- [ ] Calendar deficit indication matches product quantity and does not falsely flag same-instant handover.
- [ ] Calendar can navigate beyond the original 14-day window and bars link to the correct order.
- [ ] Stock search and category filter work.
- [ ] Categories create/edit/delete flow works, including parent selection.
- [ ] Promotions create/edit/delete flow works and linked public promotion page renders.
- [ ] Product edit preserves sync-owned vs admin-owned field boundaries.
- [ ] Media upload and alt-text edit work.
- [ ] Users screen can create/delete another admin but cannot misuse self-only actions.
- [ ] Settings save preserves the full SiteSettings object rather than dropping unrelated fields.

## 8. Analytics

- [ ] `/admin/analytics` loads all-time revenue-by-category by default.
- [ ] `from` only filters orders created from that Kemerovo calendar day onward.
- [ ] `to` only includes the entire selected end day.
- [ ] Same-day `from` + `to` returns exactly that Kemerovo calendar day.
- [ ] Reversed dates are normalized visibly rather than returning a silently empty report.
- [ ] Cancelled orders are excluded.
- [ ] Filtered category totals reconcile to net order revenue after promo discounts.
- [ ] KPI cards remain all-time and are clearly labelled as unaffected by the report range.
- [ ] Reset returns the report to all-time results.

## 9. МойСклад integration

Only run this section with the intended non-legacy credentials/environment.

- [ ] Sync touches only the Playback Rental folder subtree in the shared МойСклад account.
- [ ] Rental service entities map to the parallel inventory-product tree as expected.
- [ ] Sync does not overwrite admin-owned fields such as subtitle/tag/kit configuration.
- [ ] Product/category image sync does not repeatedly download already imported images.
- [ ] Order submission creates/updates the expected МойСклад customer order exactly once.
- [ ] Manual reconcile completes without an uncaught crash.
- [ ] Reconcile is not accidentally running continuously in local/dev Compose unless the jobs profile is intentionally enabled.

## 10. Direct notifications and monitoring

### Local/disposable notification boundary

No real messenger/SMTP credentials are needed for this sub-check.

- [ ] Normal `compose.dev.yaml` startup does not start the `notifications` worker.
- [ ] With `NOTIFICATIONS_ENABLED=false`, checkout/contact cannot accidentally send real messages.
- [ ] With `NOTIFICATIONS_ENABLED=true` but **without** starting the jobs profile, one disposable checkout/contact event creates a pending JSON job in the local notification queue and performs no external delivery.
- [ ] The queued JSON contains the intended event/customer/order data but no Telegram/MAX/VK/SMTP credentials.

### Final VDS delivery

Run only after production channel credentials have been configured on the VDS.

- [ ] The `notifications` worker is running and the queue volume is persistent across worker/container restart.
- [ ] One disposable order produces exactly one notification to every configured Telegram recipient.
- [ ] The same order produces exactly one notification to every configured MAX recipient.
- [ ] Admin SMTP email arrives with customer/items/net total.
- [ ] Customer order-confirmation email arrives at the checkout address.
- [ ] If VK is enabled, every configured VK peer receives exactly one message.
- [ ] Contact-form submission reaches the configured admin Telegram/MAX/VK/email destinations but does not send a customer order-confirmation email.
- [ ] Temporarily breaking one test destination causes retries while already-successful destinations are not duplicated.
- [ ] Stopping/restarting the worker while a job is pending does not lose the job.
- [ ] Queue/log inspection does not expose bot/API/SMTP secrets.
- [ ] Completed/terminally failed jobs older than `NOTIFICATION_RETENTION_DAYS` are purged; pending jobs are not expired.
- [ ] The MAX token exposed in the old n8n export has been rotated and is not reused.

### GlitchTip

- [ ] On the final deployed environment, configure GlitchTip/Sentry-compatible DSNs.
- [ ] Trigger one controlled server exception and verify it arrives in GlitchTip.
- [ ] Trigger one controlled browser exception and verify it arrives in GlitchTip.
- [ ] Confirm no unexpected PII, tracing or replay payload is being sent.

## 11. `/cms` break-glass fallback

Run while `/cms` is still intentionally retained.

- [ ] `/cms` login works.
- [ ] Core collections/globals are readable.
- [ ] One harmless edit/save can be completed.
- [ ] Decide explicitly whether `/cms` remains as a break-glass tool or is retired before cutover; do not remove it implicitly as part of another change.

## 12. Final deployment/cutover checks

Only after development items are complete and a deployment host exists.

- [ ] PostgreSQL persistent storage is mounted/backed up.
- [ ] Media persistent storage is mounted and the image-size backfill has completed.
- [ ] Notification queue uses persistent storage and direct channel credentials are worker-only.
- [ ] Production secrets are set outside git.
- [ ] `WEB_URL`, reverse-proxy origin handling and TLS/HTTPS are correct.
- [ ] Browser smoke test passes on the real public hostname.
- [ ] Admin smoke test passes on the real public hostname.
- [ ] Checkout → order → direct notification worker → МойСклад path passes end to end.
- [ ] GlitchTip server + browser event delivery passes.
- [ ] Database/media backup and rollback procedure is written and tested before changing traffic.
- [ ] Legacy deployment remains recoverable until the agreed rollback window expires.

## Acceptance record

For the final run, record:

- exact `2.0` commit SHA;
- tester/date;
- deployment hostname;
- PostgreSQL migration version/state;
- media backfill result;
- notification channels enabled and live-delivery result;
- any skipped checkbox and its explicit reason;
- final cutover/rollback decision.
