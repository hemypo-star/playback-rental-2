// Unit tests for the A1 day-counting/pricing convention (see this
// directory's pricing.ts JSDoc): calendar days of ownership, inclusive of
// both the pickup day and the return day, floored at one full day, and
// independent of the time of day. Run with `pnpm test` (apps/cms/package.json).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateRentalDays, calculateRentalPrice } from './pricing'

// Local-time constructor (not UTC) — matches how real dates flow through
// this app (browser Date objects, `new Date(isoString)` from Payload), and
// keeps calendar-day comparisons meaningful regardless of the host's
// timezone. `day` is 1-based within January 2026 (no month-boundary
// concerns for the 1..30 sweep below).
function jan(day: number, hour = 10): Date {
  return new Date(2026, 0, day, hour, 0, 0)
}

test('calculateRentalPrice(base, d) === base * d for d = 1..30', () => {
  const base = 1000
  for (let d = 1; d <= 30; d++) {
    // A d-day rental under the inclusive-both-ends convention: picking up on
    // day 1 and returning on day d spans d calendar days
    // (differenceInCalendarDays === d - 1, +1 === d).
    const start = jan(1)
    const end = jan(d)
    assert.equal(calculateRentalDays(start, end), d, `calculateRentalDays should be ${d} for a ${d}-day range`)
    assert.equal(calculateRentalPrice(base, start, end), base * d, `price should be ${base * d} for d=${d}`)
  }
})

test('equal dates (same calendar day pickup and return) => 1 day, full rate', () => {
  const base = 1500
  const start = jan(10, 9)
  const end = jan(10, 9) // exactly equal
  assert.equal(calculateRentalDays(start, end), 1)
  assert.equal(calculateRentalPrice(base, start, end), base)
})

test('same calendar day, different times => still 1 day, full rate', () => {
  const base = 1500
  const start = jan(10, 9)
  const end = jan(10, 18)
  assert.equal(calculateRentalDays(start, end), 1)
  assert.equal(calculateRentalPrice(base, start, end), base)
})

test('time-independence: 12 Aug 10:00 -> 14 Aug 10:00 and 12 Aug 10:00 -> 14 Aug 18:00 both give 3 days, same price', () => {
  const base = 4000
  const start = new Date(2026, 7, 12, 10, 0, 0)
  const endSameHour = new Date(2026, 7, 14, 10, 0, 0)
  const endLaterHour = new Date(2026, 7, 14, 18, 0, 0)

  assert.equal(calculateRentalDays(start, endSameHour), 3)
  assert.equal(calculateRentalDays(start, endLaterHour), 3)

  const priceSameHour = calculateRentalPrice(base, start, endSameHour)
  const priceLaterHour = calculateRentalPrice(base, start, endLaterHour)
  assert.equal(priceSameHour, 3 * base)
  assert.equal(priceLaterHour, 3 * base)
  assert.equal(priceSameHour, priceLaterHour)
})

test('missing dates => 0 days, 0 price (not the 1-day minimum — "no rental period chosen" is not "a zero-length rental")', () => {
  assert.equal(calculateRentalDays(undefined, undefined), 0)
  assert.equal(calculateRentalDays(null, null), 0)
  assert.equal(calculateRentalDays(jan(1), undefined), 0)
  assert.equal(calculateRentalDays(undefined, jan(2)), 0)
  assert.equal(calculateRentalDays(jan(1), null), 0)

  assert.equal(calculateRentalPrice(1000, undefined, undefined), 0)
  assert.equal(calculateRentalPrice(1000, null, null), 0)
  assert.equal(calculateRentalPrice(1000, jan(1), undefined), 0)
})

test('invalid Date (NaN) => 0 days, 0 price', () => {
  const invalid = new Date('not-a-real-date')
  assert.ok(Number.isNaN(invalid.getTime()))
  assert.equal(calculateRentalDays(invalid, jan(5)), 0)
  assert.equal(calculateRentalDays(jan(5), invalid), 0)
  assert.equal(calculateRentalDays(invalid, invalid), 0)

  assert.equal(calculateRentalPrice(1000, invalid, jan(5)), 0)
  assert.equal(calculateRentalPrice(1000, jan(5), invalid), 0)
})

// Documents the floor's behaviour on a backwards range rather than endorsing
// it: the pricing function clamps to 1 day, so it is NOT what stops a
// nonsensical range from being sold. The write path is — see the
// `differenceInCalendarDays(...) < 0` guard in OrderItems' beforeValidate
// hook. Pinned here so that if the floor is ever changed to reject instead,
// that guard gets revisited deliberately rather than silently made redundant.
test('backwards range floors to 1 day — guarded at the write path, not here', () => {
  assert.equal(calculateRentalDays(jan(14), jan(12)), 1)
  assert.equal(calculateRentalPrice(4000, jan(14), jan(12)), 4000)
})
