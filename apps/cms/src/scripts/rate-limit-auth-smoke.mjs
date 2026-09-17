const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000'

function url(pathname) {
  return new URL(pathname, baseUrl).toString()
}

async function expectStatus(label, pathname, expectedStatus, options = {}) {
  const response = await fetch(url(pathname), {
    redirect: 'manual',
    ...options,
  })
  const body = await response.text()
  if (response.status !== expectedStatus) {
    throw new Error(`${label}: expected HTTP ${expectedStatus}, got ${response.status}: ${body.slice(0, 500)}`)
  }
  console.log(`PASS ${label}: HTTP ${response.status}`)
  return body
}

async function main() {
  // Use a deliberately nonexistent account so exhausting this bucket never
  // interferes with the seeded smoke administrator used by later browser
  // and lifecycle checks. The account bucket is intentionally keyed from
  // submitted input before any user lookup, so nonexistent accounts must be
  // throttled exactly like real ones without leaking account existence.
  const loginBody = JSON.stringify({
    email: 'rate-limit-target@example.invalid',
    password: 'definitely-wrong-password',
  })
  const loginOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: loginBody,
  }

  await expectStatus('login attempt 1 allowed through limiter', '/api/users/login', 401, loginOptions)
  await expectStatus('login attempt 2 allowed through limiter', '/api/users/login', 401, loginOptions)
  const limitedLoginBody = await expectStatus('login attempt 3 rate-limited', '/api/users/login', 429, loginOptions)
  if (!limitedLoginBody.includes('Слишком много попыток входа')) {
    throw new Error(`Login 429 did not expose the expected public-safe message: ${limitedLoginBody.slice(0, 500)}`)
  }

  // Contact uses a separate email bucket. Two requests are accepted into the
  // local durable queue; the third must be rejected before enqueueing. This
  // verifies the real endpoint boundary, not just the rate-limit unit helper.
  const contactOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Rate Limit Smoke',
      email: 'rate-limit-contact@example.invalid',
      phone: '+7 (900) 555-11-22',
      subject: 'Rate-limit acceptance',
      message: 'Disposable CI request; no worker is running.',
    }),
  }

  for (const attempt of [1, 2]) {
    const body = await expectStatus(`contact attempt ${attempt} accepted`, '/api/contact-notification', 200, contactOptions)
    const parsed = JSON.parse(body)
    if (parsed?.success !== true) throw new Error(`Contact attempt ${attempt} was not queued successfully: ${body}`)
  }
  const limitedContactBody = await expectStatus('contact attempt 3 rate-limited', '/api/contact-notification', 429, contactOptions)
  const parsedLimitedContact = JSON.parse(limitedContactBody)
  if (parsedLimitedContact?.code !== 'RATE_LIMITED') {
    throw new Error(`Contact 429 returned unexpected body: ${limitedContactBody}`)
  }

  // The anonymous custom admin surface must not render protected pages. The
  // public login page itself remains reachable; authenticated access is
  // exercised by browser-smoke later in this same CI job.
  const adminResponse = await fetch(url('/admin/orders'), { redirect: 'manual' })
  if (![301, 302, 303, 307, 308].includes(adminResponse.status)) {
    throw new Error(`/admin/orders anonymous boundary: expected redirect, got HTTP ${adminResponse.status}`)
  }
  const location = adminResponse.headers.get('location')
  const redirectedPath = location ? new URL(location, baseUrl).pathname : ''
  if (redirectedPath !== '/admin/login') {
    throw new Error(`/admin/orders anonymous boundary: expected /admin/login, got ${location || '(missing Location)'}`)
  }
  console.log(`PASS anonymous /admin/orders -> ${adminResponse.status} /admin/login`)

  console.log('Rate-limit and admin-auth smoke passed')
}

main().catch((error) => {
  console.error('Rate-limit and admin-auth smoke failed')
  console.error(error)
  process.exit(1)
})
