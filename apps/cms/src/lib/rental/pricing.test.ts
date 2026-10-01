// Unit tests for the day-counting/pricing convention revised 2026-09-30 (see
// this directory's pricing.ts JSDoc): one calendar-date transition between
// pickup and return per day (no "+1, inclusive of both ends" — that was the
// superseded 2026-08-24 "A1" convention), floored at one full day, and
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

test('calculateRentalPrice(base, d) === base * d for d = 1..29 (n nights => n days)', () => {
  const base = 1000
  for (let d = 1; d <= 29; d++) {
    // A d-day rental: picking up on day 1 and returning on day 1+d spans d
    // calendar-date transitions (differenceInCalendarDays === d exactly, no
    // +1). E.g. Oct 1 -> Oct 2 is d=1 (one day, one night), not two.
    const start = jan(1)
    const end = jan(1 + d)
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

test('time-independence: 12 Aug 10:00 -> 14 Aug 10:00 and 12 Aug 10:00 -> 14 Aug 18:00 both give 2 days, same price', () => {
  const base = 4000
  const start = new Date(2026, 7, 12, 10, 0, 0)
  const endSameHour = new Date(2026, 7, 14, 10, 0, 0)
  const endLaterHour = new Date(2026, 7, 14, 18, 0, 0)

  assert.equal(calculateRentalDays(start, endSameHour), 2)
  assert.equal(calculateRentalDays(start, endLaterHour), 2)

  const priceSameHour = calculateRentalPrice(base, start, endSameHour)
  const priceLaterHour = calculateRentalPrice(base, start, endLaterHour)
  assert.equal(priceSameHour, 2 * base)
  assert.equal(priceLaterHour, 2 * base)
  assert.equal(priceSameHour, priceLaterHour)
})

test('owner-reported cases: Oct 1 10:00 -> Oct 2 10:00 is 1 day; Oct 3 -> Oct 8 is 5 days', () => {
  const base = 1600
  const oct1 = new Date(2026, 9, 1, 10, 0, 0)
  const oct2 = new Date(2026, 9, 2, 10, 0, 0)
  assert.equal(calculateRentalDays(oct1, oct2), 1)
  assert.equal(calculateRentalPrice(base, oct1, oct2), 1600)

  const oct3 = new Date(2026, 9, 3, 10, 0, 0)
  const oct8 = new Date(2026, 9, 8, 10, 0, 0)
  assert.equal(calculateRentalDays(oct3, oct8), 5)
  assert.equal(calculateRentalPrice(base, oct3, oct8), 8000)
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
