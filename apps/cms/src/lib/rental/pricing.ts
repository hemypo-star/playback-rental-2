// Ported from the old app's src/utils/pricingUtils.ts (post "rework discount
// system": flat per-day rate, no tiered discounts). This is the single
// source of truth for day-counting/pricing — `lib/pricing.ts` re-exports
// from here rather than keeping its own copy (see that file's header for
// the history of why there were once two).
import { differenceInCalendarDays } from 'date-fns'

/**
 * Rental convention: calendar days of ownership, inclusive of both the
 * pickup day and the return day. Equivalent to "how many calendar dates did
 * the client have the gear" — the day it goes out and the day it comes back
 * both count, so picking it up and returning it on the same calendar date is
 * one full day, not zero.
 *
 * `differenceInCalendarDays` normalizes both dates to midnight before
 * subtracting, so the time of day (10:00 vs 18:00 pickup/return) can never
 * change the result — only the calendar date does. Pickup/return time is
 * kept elsewhere as information for the manager only; it must never affect
 * price.
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
export function calculateRentalDays(startDate: Date | null | undefined, endDate: Date | null | undefined): number {
  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0
  return Math.max(1, differenceInCalendarDays(endDate, startDate) + 1)
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
