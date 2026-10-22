// Owner's booking limits (2026-10-15). Enforced in OrderItems.ts's
// beforeValidate, so checkout, manual orders and the API all obey them.

/** Longest rental, in billed rental days (calculateRentalDays). Owner, 2026-10-21: one year, as the user agreement says. */
export const MAX_RENTAL_DAYS = 365

/** Shortest rental, in hours (user agreement). Billed as one day. */
export const MIN_RENTAL_HOURS = 4

/**
 * Units of one product per order line. Real stock is far below this; the cap
 * only keeps a crafted request from asking for absurd counts. The floor (1)
 * is what matters: 0 and negative lines used to price an order down to 0 ₽.
 */
export const MAX_ITEM_QUANTITY = 99
