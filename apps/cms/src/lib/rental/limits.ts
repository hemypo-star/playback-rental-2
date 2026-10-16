// Owner's booking limits (2026-10-15). Enforced in OrderItems.ts's
// beforeValidate, so checkout, manual orders and the API all obey them.

/** Longest rental, in billed rental days (calculateRentalDays). */
export const MAX_RENTAL_DAYS = 90
