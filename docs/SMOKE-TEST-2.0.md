# Playback Rental 2.0 — manual smoke-test checklist

This is the acceptance checklist for `2.0`. Automated CI remains mandatory, but CI does not replace visual checks, real external integrations, or final-host validation.

Status notation:

- `[x] (CI)` — currently exercised by automated disposable-environment acceptance in `2.0 CI`.
- `[ ]` — still requires manual, real-integration, or deployment-host verification.
- A CI-marked item must be re-opened if its corresponding smoke step is removed or starts failing.

Use this checklist twice:

1. **Pre-deployment** against a disposable/local environment with representative seeded data.
2. **Final deployment gate** against the real deployment before cutover from the legacy app.

Do not run destructive checks against legacy `main` / `prod` data.

## 0. Automated gate

Before manual testing:

- [x] (CI) `2.0 CI` is green on the exact commit being tested.
- [x] (CI) Payload migrations apply successfully to an empty/test PostgreSQL database.
- [x] (CI) `lint`, `tsc --noEmit`, unit tests and `next build` all pass.
- [ ] No uncommitted/generated type changes remain after `payload generate:types`.

## 1. App startup and shared chrome

- [ ] App starts with the documented Docker/dev workflow.
- [x] (CI) `/` loads with no browser-console errors.
- [ ] Navbar, cart badge, footer and mobile navigation render correctly.
- [x] (CI, 375px core routes) At 360–390px viewport width there is no horizontal page overflow.
- [x] (CI) `prefers-reduced-motion` does not leave required homepage content hidden or inaccessible.
- [x] (CI) `/privacy-policy`, `/user-agreement`, `/how-it-works` and `/contact` load normally.

## 2. Catalog and product browsing

- [x] (CI, seeded data) `/catalog` loads products. Real-МойСклад category counts remain a manual integration check.
- [x] (CI, seeded data) Category navigation works for nested categories; visually confirm parent navigation manually.
- [x] (CI for description/tag; title remains manual) Search matches title/description/tag as expected.
- [ ] Search/filter navigation preserves the intended catalog section.
- [ ] Product cards show stock state, price and image without layout shift.
- [x] (CI route/title) `/product/[id]` renders the seeded product route; gallery/breadcrumb/related-product presentation remains manual.
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
- [x] (CI) Percentage promo code applies the expected discount.
- [x] (CI) Fixed-rouble promo code applies the expected discount.
- [x] (CI) Minimum-order threshold is enforced for both promo types.
- [x] (CI API/acceptance; confirm final visual copy manually) Invalid/inactive/expired promo is rejected as expected.
- [x] (CI) Order total equals line-item gross total minus the stored order-level promo discount.
- [ ] Failed item validation does not leave partial order items behind.
- [x] (CI for created order number; visually confirm date presentation manually) Checkout success state shows the created order number and selected dates.
- [x] (CI) Public checkout cannot read/update/delete arbitrary existing orders.
- [x] (CI) Rate-limit behaviour works for the automated login/contact boundaries; checkout remains covered by unit/business-flow checks and should be spot-checked manually.

## 5. Custom `/admin` authentication

- [x] (CI) Unauthenticated `/admin/*` access redirects to login.
- [ ] Admin can log in and log out.
- [x] (CI) Password change works and a fresh login with the new password succeeds.
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
- [x] (CI) Deleting the final item **cancels** the order; it never hard-deletes the order.
- [x] (CI lifecycle) Cancelling through the tested final-item lifecycle releases the order from active availability; manually spot-check direct status change.

## 7. Calendar, stock and other admin screens

- [ ] Calendar renders overlapping reservations in separate lanes.
- [ ] Calendar deficit indication matches product quantity and does not falsely flag same-instant handover.
- [ ] Calendar can navigate beyond the original 14-day window and bars link to the correct order.
- [ ] Stock search and category filter work.
- [x] (CI) Categories create/edit/delete flow works, including parent preservation.
- [x] (CI) Promotions create/edit/delete flow works and linked public promotion page renders.
- [x] (CI) Product edit preserves sync-owned vs admin-owned field boundaries.
- [x] (CI) Media upload fixture and alt-text edit work.
- [x] (CI) Users screen/API flow can create/delete another admin and does not expose self-delete in the tested UI.
- [x] (CI) Settings save preserves unrelated scalar and array business fields in the full SiteSettings object.

## 8. Analytics

- [x] (CI render) `/admin/analytics` loads the all-time report UI by default.
- [ ] `from` only filters orders created from that Kemerovo calendar day onward.
- [ ] `to` only includes the entire selected end day.
- [x] (CI helper + UI rendering) Same-day `from` + `to` is interpreted as one Kemerovo calendar day.
- [x] (CI) Reversed dates are normalized visibly rather than returning a silently empty report.
- [ ] Cancelled orders are excluded.
- [ ] Filtered category totals reconcile to net order revenue after promo discounts.
- [x] (CI label/render) KPI cards remain labelled as all-time and unaffected by the report range.
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
- [x] (CI) With `NOTIFICATIONS_ENABLED=true` but **without** starting the jobs profile, disposable events create pending JSON jobs and perform no external delivery.
- [x] (CI) The queued JSON contains intended event/customer/order data but no Telegram/MAX/VK/SMTP credentials.

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
