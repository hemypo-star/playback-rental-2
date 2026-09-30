// Unit tests for A2's phone-normalization helper (design_handoff_swiss_bento/
// 08-instruction.md) — the same human typing "+7 923…" and "8 923…" must
// land in one rate-limit bucket. Run with `pnpm test` (apps/cms/package.json).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizePhoneForRateLimit } from './phone'

test('+7 and 8 forms of the same number normalize to the same key', () => {
  const plus7 = normalizePhoneForRateLimit('+7 923 123-45-67')
  const eight = normalizePhoneForRateLimit('8 (923) 123 45 67')
  assert.equal(plus7, eight)
  assert.equal(plus7, '79231234567')
})

test('a bare 10-digit national number (no leading 7/8) normalizes to the same key too', () => {
  assert.equal(normalizePhoneForRateLimit('9231234567'), '79231234567')
})

test('different numbers normalize to different keys', () => {
  assert.notEqual(normalizePhoneForRateLimit('+7 923 123-45-67'), normalizePhoneForRateLimit('+7 923 123-45-68'))
})

test('an empty/garbage string does not throw and gets its own bucket', () => {
  assert.equal(normalizePhoneForRateLimit(''), 'empty')
  assert.equal(normalizePhoneForRateLimit('not a phone'), 'empty')
})
