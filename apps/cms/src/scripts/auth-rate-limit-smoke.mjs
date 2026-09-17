const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000'

function url(pathname) {
  return new URL(pathname, baseUrl).toString()
}

async function readBody(response) {
  const text = await response.text()
  try {
    return { text, json: text ? JSON.parse(text) : null }
  } catch {
    return { text, json: null }
  }
}

async function expectRedirectToLogin() {
  const response = await fetch(url('/admin/orders'), { redirect: 'manual' })
  const location = response.headers.get('location') || ''
  if (response.status < 300 || response.status >= 400 || !location.includes('/admin/login')) {
    const body = await response.text()
    throw new Error(`anonymous /admin/orders should redirect to /admin/login; got HTTP ${response.status}, location=${location}, body=${body.slice(0, 500)}`)
  }
  console.log(`PASS anonymous admin dashboard redirect: HTTP ${response.status} -> ${location}`)
}

async function expectUsersCollectionBlocked() {
  const response = await fetch(url('/api/users?limit=1&depth=0'), { redirect: 'manual' })
  if (response.status !== 401 && response.status !== 403) {
    const body = await response.text()
    throw new Error(`anonymous users collection should be blocked; got HTTP ${response.status}: ${body.slice(0, 500)}`)
  }
  console.log(`PASS anonymous users collection blocked: HTTP ${response.status}`)
}

async function exerciseLoginRateLimit() {
  const credentials = {
    email: 'rate-limit-nobody@example.invalid',
    password: 'definitely-not-a-real-password',
  }

  const attempt = async () => {
    const response = await fetch(url('/api/users/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    })
    const body = await readBody(response)
    return { response, body }
  }

  const first = await attempt()
  if (first.response.status === 429 || first.response.status >= 500) {
    throw new Error(`first login attempt should reach normal auth rejection, got HTTP ${first.response.status}: ${first.body.text.slice(0, 500)}`)
  }

  const second = await attempt()
  if (second.response.status !== 429) {
    throw new Error(`second login attempt should be rate-limited with configured max=1, got HTTP ${second.response.status}: ${second.body.text.slice(0, 500)}`)
  }
  const message = second.body.json?.errors?.[0]?.message || second.body.text
  if (!String(message).includes('Слишком много попыток входа')) {
    throw new Error(`login 429 did not expose the expected safe public message: ${second.body.text.slice(0, 500)}`)
  }
  console.log('PASS login account rate limit: normal rejection then HTTP 429')
}

async function exerciseContactRateLimit() {
  const payload = {
    name: 'Rate Limit Smoke',
    email: 'rate-limit-contact@example.invalid',
    phone: '+7 (900) 555-00-11',
    subject: 'Smoke',
    message: 'Disposable pre-deployment rate-limit smoke',
  }

  const submit = async () => {
    const response = await fetch(url('/api/contact-notification'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await readBody(response)
    return { response, body }
  }

  const first = await submit()
  if (first.response.status !== 200 || first.body.json?.success !== true) {
    throw new Error(`first contact submission should be accepted, got HTTP ${first.response.status}: ${first.body.text.slice(0, 500)}`)
  }

  const second = await submit()
  if (second.response.status !== 429 || second.body.json?.code !== 'RATE_LIMITED') {
    throw new Error(`second contact submission should be rate-limited, got HTTP ${second.response.status}: ${second.body.text.slice(0, 500)}`)
  }
  console.log('PASS contact email rate limit: accepted once then HTTP 429')
}

async function main() {
  await expectRedirectToLogin()
  await expectUsersCollectionBlocked()
  await exerciseLoginRateLimit()
  await exerciseContactRateLimit()
  console.log('Admin auth + HTTP rate-limit smoke passed')
}

main().catch((error) => {
  console.error('Admin auth + HTTP rate-limit smoke failed')
  console.error(error)
  process.exit(1)
})
