// Ported from the old app's src/utils/pricingUtils.ts (post "rework discount
// system": flat per-day rate, no tiered discounts). This is the single
// source of truth for day-counting/pricing — `lib/pricing.ts` re-exports
// from here rather than keeping its own copy (see that file's header for
// the history of why there were once two).

/**
 * Rental convention (revised 2026-10-07, owner-confirmed with real bookings):
 * a rental day (сутки) is a full 24 hours of elapsed time between pickup and
 * return, rounded UP — `Math.ceil(hours / 24)`, minimum one. This is the old
 * app's own rule (`Math.ceil(hours / 24)`), restored. Examples at 1600 RUB/day:
 *   Oct  1 10:00 -> Oct  2 10:00 = exactly 24h            = 1 day
 *   Oct  3 10:00 -> Oct  8 10:00 = 120h                   = 5 days
 *   Oct 15 10:00 -> Oct 23 21:00 = 8 days 11h             = 9 days
 *   any period up to 24h (even the 4h minimum booking)    = 1 day
 *
 * History: the 2026-08-24 audit's "A1" replaced this with calendar days
 * inclusive of both ends (`+1`), then 2026-09-30 dropped the `+1` leaving a
 * plain calendar-date difference. Both ignored the return hour, so a return
 * at 21:00 priced the same as one at 10:00 — the owner's real tariff charges
 * the extra started day, hence this revision. The deliberate consequence:
 * the price DOES depend on pickup/return time, and returning later than the
 * pickup hour on the last day costs another day.
 *
 * The minimum is one full day (`Math.max(1, ...)`) — this floor lives here,
 * in the one function that prices a rental, rather than being duplicated
 * (or forgotten) at each of the several places a user can pick dates.
 *
 * Returns 0 when either date is missing or invalid (`NaN`) — that means "no
 * rental period chosen/known yet", which is a different case from "a
 * same-day rental" and must not be priced as if it were one day.
 *
 * Note what the floor does to a *backwards* range (end before start): it
 * clamps to 1, so a nonsensical selection prices as one full day rather than
 * 0 or an error. This function does not reject it. The write path guards
 * against that explicitly — see the `differenceInCalendarDays(...) < 0` check
 * in `collections/OrderItems.ts`'s `beforeValidate` hook — and the date
 * pickers cannot currently produce such a range. Any new caller that can
 * must do its own check rather than expect one here.
 */
const MS_PER_DAY = 24 * 60 * 60 * 1000

export function calculateRentalDays(startDate: Date | null | undefined, endDate: Date | null | undefined): number {
  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0
  return Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / MS_PER_DAY))
}

export function calculateRentalPrice(
  basePrice: number,
  startDate: Date | null | undefined,
  endDate: Date | null | undefined,
): number {
  const days = calculateRentalDays(startDate, endDate)
  if (days <= 0) return 0
  return Math.round(basePrice * days)
}

export function calculateLineTotal(params: {
  listingType: 'rental' | 'sale'
  unitPrice: number
  quantity: number
  startDate?: Date | null
  endDate?: Date | null
}): number {
  const { listingType, unitPrice, quantity } = params
  if (listingType === 'sale') {
    return Math.round(unitPrice * quantity)
  }
  if (!params.startDate || !params.endDate) return 0
  return calculateRentalPrice(unitPrice, new Date(params.startDate), new Date(params.endDate)) * quantity
}
