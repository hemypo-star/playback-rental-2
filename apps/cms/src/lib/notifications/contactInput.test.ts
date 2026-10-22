// Unit tests for SEC-026's contact-form validation (contactInput.ts). Run with
// `pnpm test` (apps/cms/package.json).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTACT_LIMITS, parseContactInput } from './contactInput'

const valid = { name: ' Иван ', email: 'ivan@example.ru', phone: '+7 900 000-00-00', message: 'Есть ли камера?', agreeData: true }

test('accepts a valid payload and trims fields', () => {
  const result = parseContactInput(valid)
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.value.name, 'Иван')
    assert.equal(result.value.subject, undefined)
  }
})

test('keeps an optional subject when present', () => {
  const result = parseContactInput({ ...valid, subject: 'Аренда' })
  assert.equal(result.ok && result.value.subject, 'Аренда')
})

test('requires the personal-data consent', () => {
  assert.equal(parseContactInput({ ...valid, agreeData: undefined }).ok, false)
  assert.equal(parseContactInput({ ...valid, agreeData: 'true' }).ok, false)
})

test('rejects missing required fields', () => {
  for (const key of ['name', 'email', 'phone', 'message'] as const) {
    const body: Record<string, unknown> = { ...valid }
    delete body[key]
    assert.equal(parseContactInput(body).ok, false, key)
  }
})

test('rejects non-string fields instead of throwing', () => {
  assert.equal(parseContactInput({ ...valid, email: ['a@b.c'] }).ok, false)
  assert.equal(parseContactInput({ ...valid, message: { text: 'x' } }).ok, false)
  assert.equal(parseContactInput({ ...valid, subject: 5 }).ok, false)
})

test('rejects over-long fields', () => {
  assert.equal(parseContactInput({ ...valid, message: 'x'.repeat(CONTACT_LIMITS.message + 1) }).ok, false)
  assert.equal(parseContactInput({ ...valid, message: 'x'.repeat(CONTACT_LIMITS.message) }).ok, true)
})

test('rejects a malformed email', () => {
  assert.equal(parseContactInput({ ...valid, email: 'not-an-email' }).ok, false)
})

test('rejects a non-object body', () => {
  assert.equal(parseContactInput(null).ok, false)
  assert.equal(parseContactInput([valid]).ok, false)
  assert.equal(parseContactInput('text').ok, false)
})
