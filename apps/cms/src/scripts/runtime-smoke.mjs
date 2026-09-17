const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000'

function url(pathname) {
  return new URL(pathname, baseUrl).toString()
}

async function waitForReady() {
  const deadline = Date.now() + 60_000
  let lastError = null

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url('/api/access'), { redirect: 'manual' })
      if (response.ok) return
      lastError = new Error(`/api/access returned ${response.status}`)
    } catch (error) {
      lastError = error
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000))
  }

  throw lastError || new Error('Application did not become ready in time')
}

async function expectStatus(pathname, expectedStatus) {
  const response = await fetch(url(pathname), { redirect: 'manual' })
  if (response.status !== expectedStatus) {
    const body = await response.text().catch(() => '')
    throw new Error(`${pathname}: expected ${expectedStatus}, got ${response.status}${body ? `\n${body.slice(0, 500)}` : ''}`)
  }
  console.log(`PASS ${pathname} -> ${response.status}`)
}

async function expectRedirect(pathname, expectedLocation) {
  const response = await fetch(url(pathname), { redirect: 'manual' })
  if (![301, 302, 303, 307, 308].includes(response.status)) {
    throw new Error(`${pathname}: expected redirect, got ${response.status}`)
  }

  const location = response.headers.get('location')
  if (!location) throw new Error(`${pathname}: redirect has no Location header`)

  const actualPath = new URL(location, baseUrl).pathname
  if (actualPath !== expectedLocation) {
    throw new Error(`${pathname}: expected redirect to ${expectedLocation}, got ${location}`)
  }

  console.log(`PASS ${pathname} -> ${response.status} ${actualPath}`)
}

async function expectContactValidation() {
  const response = await fetch(url('/api/contact-notification'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Smoke test' }),
  })

  if (response.status !== 400) {
    const body = await response.text().catch(() => '')
    throw new Error(`/api/contact-notification: expected 400 for malformed request, got ${response.status}${body ? `\n${body.slice(0, 500)}` : ''}`)
  }

  console.log('PASS /api/contact-notification rejects malformed payload -> 400')
}

async function main() {
  console.log(`Runtime smoke target: ${baseUrl}`)
  await waitForReady()

  for (const pathname of [
    '/api/access',
    '/',
    '/catalog',
    '/contact',
    '/privacy-policy',
    '/user-agreement',
    '/how-it-works',
    '/admin/first-register',
    '/cms',
  ]) {
    await expectStatus(pathname, 200)
  }

  await expectRedirect('/admin', '/admin/login')
  await expectRedirect('/admin/login', '/admin/first-register')
  await expectContactValidation()

  console.log('Runtime smoke passed')
}

main().catch((error) => {
  console.error('Runtime smoke failed')
  console.error(error)
  process.exit(1)
})
