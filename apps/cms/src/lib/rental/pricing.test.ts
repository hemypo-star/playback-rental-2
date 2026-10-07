// Unit tests for the day-counting/pricing convention revised 2026-10-07 (see
// this directory's pricing.ts JSDoc): elapsed time between pickup and return
// in whole 24h blocks, rounded UP, floored at one day. Unlike the superseded
// calendar-date conventions, the return HOUR matters (a started extra day is
// charged). Run with `pnpm test` (apps/cms/package.json).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateRentalDays, calculateRentalPrice } from './pricing'

// Local-time constructor — matches how real dates flow through this app.
function at(month: number, day: number, hour = 10, minute = 0): Date {
  return new Date(2026, month - 1, day, hour, minute, 0)
}

test('owner-reported cases at 1600/day', () => {
  const base = 1600
  // Oct 1 10:00 -> Oct 2 10:00: exactly 24h = 1 day.
  assert.equal(calculateRentalDays(at(10, 1), at(10, 2)), 1)
  assert.equal(calculateRentalPrice(base, at(10, 1), at(10, 2)), 1600)
  // Oct 3 -> Oct 8 same time of day: 120h = 5 days.
  assert.equal(calculateRentalDays(at(10, 3), at(10, 8)), 5)
  assert.equal(calculateRentalPrice(base, at(10, 3), at(10, 8)), 8000)
  // Oct 15 10:00 -> Oct 23 21:00: 8 days 11h -> 9 days (screenshot case).
  assert.equal(calculateRentalDays(at(10, 15, 10), at(10, 23, 21)), 9)
  assert.equal(calculateRentalPrice(base, at(10, 15, 10), at(10, 23, 21)), 14400)
})

test('n x 24h exactly gives n days, one minute more gives n+1', () => {
  for (let n = 1; n <= 29; n++) {
    assert.equal(calculateRentalDays(at(1, 1), at(1, 1 + n)), n, `${n}*24h`)
    assert.equal(calculateRentalDays(at(1, 1), at(1, 1 + n, 10, 1)), n + 1, `${n}*24h + 1min`)
  }
})

test('any period up to 24h (incl. the 4h minimum booking) is one day, full rate', () => {
  const base = 1500
  assert.equal(calculateRentalDays(at(10, 10, 9), at(10, 10, 13)), 1) // 4h
  assert.equal(calculateRentalDays(at(10, 10, 9), at(10, 10, 18)), 1)
  assert.equal(calculateRentalDays(at(10, 10, 9), at(10, 10, 9)), 1) // equal
  assert.equal(calculateRentalPrice(base, at(10, 10, 9), at(10, 10, 18)), base)
})

test('return hour matters: 12 Aug 10:00 -> 14 Aug 10:00 is 2 days, -> 18:00 is 3 days', () => {
  assert.equal(calculateRentalDays(at(8, 12, 10), at(8, 14, 10)), 2)
  assert.equal(calculateRentalDays(at(8, 12, 10), at(8, 14, 18)), 3)
})

test('missing dates => 0 days, 0 price (not the 1-day minimum — "no rental period chosen" is not "a zero-length rental")', () => {
  assert.equal(calculateRentalDays(undefined, undefined), 0)
  assert.equal(calculateRentalDays(null, null), 0)
  assert.equal(calculateRentalDays(at(1, 1), undefined), 0)
  assert.equal(calculateRentalDays(undefined, at(1, 2)), 0)
  assert.equal(calculateRentalDays(at(1, 1), null), 0)

  assert.equal(calculateRentalPrice(1000, undefined, undefined), 0)
  assert.equal(calculateRentalPrice(1000, null, null), 0)
  assert.equal(calculateRentalPrice(1000, at(1, 1), undefined), 0)
})

test('invalid Date (NaN) => 0 days, 0 price', () => {
  const invalid = new Date('not-a-real-date')
  assert.ok(Number.isNaN(invalid.getTime()))
  assert.equal(calculateRentalDays(invalid, at(1, 5)), 0)
  assert.equal(calculateRentalDays(at(1, 5), invalid), 0)
  assert.equal(calculateRentalDays(invalid, invalid), 0)

  assert.equal(calculateRentalPrice(1000, invalid, at(1, 5)), 0)
  assert.equal(calculateRentalPrice(1000, at(1, 5), invalid), 0)
})

// Documents the floor's behaviour on a backwards range rather than endorsing
// it: the pricing function clamps to 1 day, so it is NOT what stops a
// nonsensical range from being sold. The write path is — see the
// `differenceInCalendarDays(...) < 0` guard in OrderItems' beforeValidate
// hook. Pinned here so that if the floor is ever changed to reject instead,
// that guard gets revisited deliberately rather than silently made redundant.
test('backwards range floors to 1 day — guarded at the write path, not here', () => {
  assert.equal(calculateRentalDays(at(1, 14), at(1, 12)), 1)
  assert.equal(calculateRentalPrice(4000, at(1, 14), at(1, 12)), 4000)
})
