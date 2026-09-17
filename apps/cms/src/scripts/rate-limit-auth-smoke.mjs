const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000'

function url(pathname) {
  return new URL(pathname, baseUrl).toString()
}

async function responseText(response) {
  return (await response.text()).slice(0, 1000)
}

async function expectDenied(label, pathname, options = {}) {
  const response = await fetch(url(pathname), {
    redirect: 'manual',
    ...options,
  })
  const body = await responseText(response)
  if (response.status !== 401 && response.status !== 403) {
    throw new Error(`${label}: expected 401/403, got HTTP ${response.status}: ${body}`)
  }
  console.log(`PASS ${label}: HTTP ${response.status}`)
}

async function assertAnonymousAdminRedirect() {
  const response = await fetch(url('/admin'), { redirect: 'manual' })
  const location = response.headers.get('location') || ''
  const pathname = location ? new URL(location, baseUrl).pathname : ''
  if (![301, 302, 303, 307, 308].includes(response.status) || pathname !== '/admin/login') {
    const body = await responseText(response)
    throw new Error(
      `anonymous /admin: expected redirect to /admin/login, got HTTP ${response.status} location=${location}: ${body}`,
    )
  }
  console.log(`PASS anonymous /admin redirects to /admin/login: HTTP ${response.status}`)
}

async function assertUsersCollectionClosed() {
  await expectDenied('anonymous users list blocked', '/api/users?limit=1&depth=0')
  await expectDenied('anonymous users create blocked', '/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'must-not-create@example.invalid',
      password: 'must-not-create-password',
    }),
  })
}

async function loginAttempt(email) {
  return fetch(url('/api/users/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'definitely-wrong-password' }),
    redirect: 'manual',
  })
}

async function assertLoginRateLimit() {
  const email = 'rate-limit-login@example.invalid'

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = await loginAttempt(email)
    const body = await responseText(response)
    if (response.status !== 400 && response.status !== 401) {
      throw new Error(`login attempt ${attempt}: expected normal auth rejection, got HTTP ${response.status}: ${body}`)
    }
    console.log(`PASS login attempt ${attempt} reaches auth and is rejected normally: HTTP ${response.status}`)
  }

  const blocked = await loginAttempt(email)
  const body = await responseText(blocked)
  if (blocked.status !== 429 || !body.includes('Слишком много попыток входа')) {
    throw new Error(`login rate limit: expected HTTP 429 with public throttle message, got HTTP ${blocked.status}: ${body}`)
  }
  console.log('PASS login account rate limit blocks the third attempt with HTTP 429')
}

async function contactAttempt(email) {
  return fetch(url('/api/contact-notification'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Rate Limit Smoke',
      email,
      phone: '+7 (900) 222-33-44',
      subject: 'CI rate-limit smoke',
      message: 'Disposable CI contact notification',
    }),
    redirect: 'manual',
  })
}

async function assertContactRateLimit() {
  const email = 'rate-limit-contact@example.invalid'

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = await contactAttempt(email)
    const body = await response.json().catch(() => null)
    if (response.status !== 200 || body?.success !== true) {
      throw new Error(`contact attempt ${attempt}: expected accepted notification, got HTTP ${response.status}: ${JSON.stringify(body)}`)
    }
    console.log(`PASS contact attempt ${attempt} accepted and queued`)
  }

  const blocked = await contactAttempt(email)
  const body = await blocked.json().catch(() => null)
  if (blocked.status !== 429 || body?.code !== 'RATE_LIMITED' || body?.success !== false) {
    throw new Error(`contact rate limit: expected HTTP 429 RATE_LIMITED, got HTTP ${blocked.status}: ${JSON.stringify(body)}`)
  }
  console.log('PASS contact email rate limit blocks the third attempt with HTTP 429')
}

async function main() {
  await assertAnonymousAdminRedirect()
  await assertUsersCollectionClosed()
  await assertLoginRateLimit()
  await assertContactRateLimit()
  console.log('Rate-limit and admin auth smoke passed')
}

main().catch((error) => {
  console.error('Rate-limit and admin auth smoke failed')
  console.error(error)
  process.exit(1)
})
