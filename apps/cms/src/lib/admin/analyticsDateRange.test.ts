import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeAnalyticsDateRange } from './analyticsDateRange'

test('empty analytics range leaves both bounds open', () => {
  assert.deepEqual(normalizeAnalyticsDateRange(), {
    from: undefined,
    to: undefined,
    fromIso: undefined,
    toExclusiveIso: undefined,
  })
})

test('Kemerovo calendar day converts to UTC+7 boundaries with inclusive end date', () => {
  assert.deepEqual(normalizeAnalyticsDateRange('2026-09-17', '2026-09-17'), {
    from: '2026-09-17',
    to: '2026-09-17',
    fromIso: '2026-09-16T17:00:00.000Z',
    toExclusiveIso: '2026-09-17T17:00:00.000Z',
  })
})

test('upper bound rolls across month and year boundaries', () => {
  const range = normalizeAnalyticsDateRange(undefined, '2026-12-31')
  assert.equal(range.to, '2026-12-31')
  assert.equal(range.toExclusiveIso, '2026-12-31T17:00:00.000Z')
})

test('reversed date range is normalized instead of producing an empty report', () => {
  const range = normalizeAnalyticsDateRange('2026-09-20', '2026-09-10')
  assert.equal(range.from, '2026-09-10')
  assert.equal(range.to, '2026-09-20')
  assert.equal(range.fromIso, '2026-09-09T17:00:00.000Z')
  assert.equal(range.toExclusiveIso, '2026-09-20T17:00:00.000Z')
})

test('invalid calendar dates are ignored independently', () => {
  assert.deepEqual(normalizeAnalyticsDateRange('2026-02-30', 'not-a-date'), {
    from: undefined,
    to: undefined,
    fromIso: undefined,
    toExclusiveIso: undefined,
  })
})
