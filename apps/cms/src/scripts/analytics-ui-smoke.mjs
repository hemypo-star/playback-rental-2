const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000'
const adminEmail = process.env.SMOKE_ADMIN_EMAIL
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD

if (!adminEmail || !adminPassword) {
  console.error('SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD are required')
  process.exit(1)
}

function url(pathname) {
  return new URL(pathname, baseUrl).toString()
}

function visibleText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function json(response) {
  const text = await response.text()
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text
  }
}

async function fetchAnalytics(pathname, auth) {
  const response = await fetch(url(pathname), {
    headers: auth,
    redirect: 'manual',
  })
  const html = await response.text()
  if (response.status !== 200) {
    throw new Error(`${pathname}: expected HTTP 200, got ${response.status}: ${html.slice(0, 500)}`)
  }
  const text = visibleText(html)
  if (!text.includes('Аналитика') || !text.includes('Выручка по категориям')) {
    throw new Error(`${pathname}: analytics UI did not render expected headings: ${text.slice(0, 1000)}`)
  }
  return text
}

function kemerovoDate() {
  // Kemerovo has a fixed UTC+7 offset. Construct the calendar date from a
  // shifted UTC timestamp instead of depending on runner locale/timezone.
  const shifted = new Date(Date.now() + 7 * 60 * 60 * 1000)
  return shifted.toISOString().slice(0, 10)
}

async function main() {
  const login = await fetch(url('/api/users/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  })
  const loginBody = await json(login)
  if (!login.ok || !loginBody?.token) {
    throw new Error(`Analytics smoke admin login failed: HTTP ${login.status} ${JSON.stringify(loginBody)}`)
  }
  const auth = { Authorization: `JWT ${loginBody.token}` }

  // Browser smoke has just created one pending 1500-ruble order with a 10%
  // promo snapshot, so the report must use NET revenue (1350), not the gross
  // order-item line total (1500).
  //
  // That order is a shared fixture with a limited life: order-lifecycle-smoke
  // takes the newest order for the same test customer and cancels it, and a
  // cancelled order contributes nothing here. So this script only holds while
  // it runs between those two, which is why CI keeps it in the browser-smoke
  // step rather than with the other admin smokes. Run out of order it reports
  // "0 ₽ / Пока нет данных" and reads as a revenue bug that isn't one.
  let text = await fetchAnalytics('/admin/analytics', auth)
  if (!text.includes('за всё время · 1 350 ₽')) {
    throw new Error(`all-time analytics did not show expected net 1 350 ₽ total: ${text.slice(0, 1500)}`)
  }
  console.log('PASS analytics all-time uses NET revenue: 1 350 ₽')

  const today = kemerovoDate()
  text = await fetchAnalytics(`/admin/analytics?from=${today}&to=${today}`, auth)
  if (!text.includes('1 350 ₽')) {
    throw new Error(`Kemerovo same-day analytics did not include checkout order for ${today}: ${text.slice(0, 1500)}`)
  }
  console.log(`PASS analytics same-day Kemerovo range includes checkout order (${today})`)

  text = await fetchAnalytics('/admin/analytics?from=2099-01-01&to=2099-01-02', auth)
  if (!text.includes('01.01.2099 — 02.01.2099 · 0 ₽') || !text.includes('За выбранный период данных нет')) {
    throw new Error(`future empty analytics range rendered unexpected output: ${text.slice(0, 1500)}`)
  }
  console.log('PASS analytics empty future range renders 0 ₽ and empty-state copy')

  text = await fetchAnalytics('/admin/analytics?from=2099-01-02&to=2099-01-01', auth)
  if (!text.includes('01.01.2099 — 02.01.2099 · 0 ₽')) {
    throw new Error(`reversed analytics range was not normalized: ${text.slice(0, 1500)}`)
  }
  console.log('PASS analytics reversed from/to range is normalized')

  console.log('Analytics UI smoke passed')
}

main().catch((error) => {
  console.error('Analytics UI smoke failed')
  console.error(error)
  process.exit(1)
})
