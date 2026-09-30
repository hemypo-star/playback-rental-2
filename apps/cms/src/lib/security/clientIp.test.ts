// Unit tests for A2's IP-resolution helper (design_handoff_swiss_bento/
// 08-instruction.md) — see clientIp.ts's own header comment for the full
// reasoning on TRUST_PROXY_HEADERS and why X-Forwarded-For's RIGHTMOST
// entry is the trustworthy one, not the leftmost. Run with `pnpm test`
// (apps/cms/package.json).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getClientIp } from './clientIp'

function headersFrom(entries: Record<string, string>): Pick<Headers, 'get'> {
  const map = new Map(Object.entries(entries).map(([k, v]) => [k.toLowerCase(), v]))
  return { get: (name: string) => map.get(name.toLowerCase()) ?? null }
}

// getClientIp reads process.env.TRUST_PROXY_HEADERS fresh on every call (not
// cached at module scope), same reasoning rateLimit.ts's getRateLimitConfig
// documents for its own env reads — lets each test set the flag without
// needing to reset a module-level cache or re-import the module. Restore it
// after every test so one test's setting can't leak into the next.
function withTrustProxyHeaders<T>(value: string | undefined, fn: () => T): T {
  const previous = process.env.TRUST_PROXY_HEADERS
  if (value === undefined) delete process.env.TRUST_PROXY_HEADERS
  else process.env.TRUST_PROXY_HEADERS = value
  try {
    return fn()
  } finally {
    if (previous === undefined) delete process.env.TRUST_PROXY_HEADERS
    else process.env.TRUST_PROXY_HEADERS = previous
  }
}

test('TRUST_PROXY_HEADERS unset (default): headers are never read, even a perfectly-formed one', () => {
  withTrustProxyHeaders(undefined, () => {
    const headers = headersFrom({ 'x-real-ip': '203.0.113.5', 'x-forwarded-for': '9.9.9.9, 203.0.113.5' })
    assert.equal(getClientIp(headers), null)
  })
})

test('TRUST_PROXY_HEADERS=false: same as unset — headers not read', () => {
  withTrustProxyHeaders('false', () => {
    const headers = headersFrom({ 'x-real-ip': '203.0.113.5' })
    assert.equal(getClientIp(headers), null)
  })
})

test('TRUST_PROXY_HEADERS unset with no headers at all still returns null, not "unknown" — no shared bucket when untrusted', () => {
  withTrustProxyHeaders(undefined, () => {
    assert.equal(getClientIp(headersFrom({})), null)
  })
})

test('TRUST_PROXY_HEADERS=true: X-Real-IP is preferred when present', () => {
  withTrustProxyHeaders('true', () => {
    const headers = headersFrom({ 'x-real-ip': '203.0.113.5', 'x-forwarded-for': '9.9.9.9, 203.0.113.5' })
    assert.equal(getClientIp(headers), '203.0.113.5')
  })
})

test('TRUST_PROXY_HEADERS=true: X-Forwarded-For takes the RIGHTMOST entry, not the leftmost — a client-forged leftmost entry must not win', () => {
  withTrustProxyHeaders('true', () => {
    // nginx's proxy_add_x_forwarded_for appends the real peer address; a
    // client sending its own forged X-Forwarded-For arrives as
    // "<forged>, <real>". The real one nginx observed is last.
    const headers = headersFrom({ 'x-forwarded-for': '1.2.3.4, 203.0.113.7' })
    assert.equal(getClientIp(headers), '203.0.113.7')
  })
})

test('TRUST_PROXY_HEADERS=true: X-Forwarded-For with a single hop (no forged prefix) still resolves correctly', () => {
  withTrustProxyHeaders('true', () => {
    const headers = headersFrom({ 'x-forwarded-for': '203.0.113.9' })
    assert.equal(getClientIp(headers), '203.0.113.9')
  })
})

test('TRUST_PROXY_HEADERS=true: X-Forwarded-For with extra whitespace around hops is trimmed', () => {
  withTrustProxyHeaders('true', () => {
    const headers = headersFrom({ 'x-forwarded-for': ' 1.2.3.4 ,  203.0.113.11  ' })
    assert.equal(getClientIp(headers), '203.0.113.11')
  })
})

test('TRUST_PROXY_HEADERS=true but neither header present: falls back to "unknown" (opt-in degradation, own bucket, not null)', () => {
  withTrustProxyHeaders('true', () => {
    assert.equal(getClientIp(headersFrom({})), 'unknown')
  })
})

test('TRUST_PROXY_HEADERS=true: an empty X-Real-IP value is ignored in favor of X-Forwarded-For', () => {
  withTrustProxyHeaders('true', () => {
    const headers = headersFrom({ 'x-real-ip': '', 'x-forwarded-for': '203.0.113.13' })
    assert.equal(getClientIp(headers), '203.0.113.13')
  })
})
