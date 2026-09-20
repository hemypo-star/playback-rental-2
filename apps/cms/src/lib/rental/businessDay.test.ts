import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { businessDayIndex, isBeforeBusinessToday } from './businessDay'

// Kemerovo is UTC+7, so a Kemerovo calendar day starts at 17:00 UTC the
// previous day. Every fixture below is written as an explicit UTC instant
// and annotated with the Kemerovo wall-clock time it corresponds to, so a
// reader can check the arithmetic without a timezone library.
describe('businessDayIndex', () => {
  it('groups instants by Kemerovo calendar day, not UTC day', () => {
    // Both of these are 2026-09-20 in Kemerovo: 07:00 and 23:59 local.
    const morning = new Date('2026-09-20T00:00:00Z') // 07:00 Kemerovo
    const lateEvening = new Date('2026-09-20T16:59:00Z') // 23:59 Kemerovo
    assert.equal(businessDayIndex(morning), businessDayIndex(lateEvening))
  })

  it('rolls over at 17:00 UTC, which is Kemerovo midnight', () => {
    const lastMinute = new Date('2026-09-20T16:59:59Z') // 23:59:59 Kemerovo
    const firstMinute = new Date('2026-09-20T17:00:00Z') // 00:00:00 next day
    assert.equal(businessDayIndex(firstMinute), businessDayIndex(lastMinute) + 1)
  })
})

describe('isBeforeBusinessToday', () => {
  it('accepts a booking for later the same Kemerovo day', () => {
    const now = new Date('2026-09-20T07:00:00Z') // 14:00 Kemerovo
    const pickup = new Date('2026-09-20T03:00:00Z') // 10:00 Kemerovo, same day
    assert.equal(isBeforeBusinessToday(pickup, now), false)
  })

  it('rejects a booking on an earlier Kemerovo day', () => {
    const now = new Date('2026-09-20T07:00:00Z') // 14:00 Kemerovo, 20th
    const pickup = new Date('2026-09-19T07:00:00Z') // 14:00 Kemerovo, 19th
    assert.equal(isBeforeBusinessToday(pickup, now), true)
  })

  it('accepts a future booking', () => {
    const now = new Date('2026-09-20T07:00:00Z')
    const pickup = new Date('2026-09-25T03:00:00Z')
    assert.equal(isBeforeBusinessToday(pickup, now), false)
  })

  // The regression this module exists for: during the first seven hours of
  // a Kemerovo working day it is still the previous calendar day in UTC, so
  // a UTC-based check would reject a same-day booking made that morning.
  it('accepts a same-day booking made in the Kemerovo early morning', () => {
    const now = new Date('2026-09-19T22:00:00Z') // 05:00 Kemerovo on the 20th
    const pickup = new Date('2026-09-20T03:00:00Z') // 10:00 Kemerovo on the 20th
    assert.equal(isBeforeBusinessToday(pickup, now), false)
    // And the day before is still correctly refused from that same instant.
    const yesterday = new Date('2026-09-19T03:00:00Z') // 10:00 Kemerovo, 19th
    assert.equal(isBeforeBusinessToday(yesterday, now), true)
  })
})
