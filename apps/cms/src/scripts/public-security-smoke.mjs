const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000'

function url(pathname) {
  return new URL(pathname, baseUrl).toString()
}

async function expectDenied(label, pathname, options = {}) {
  const response = await fetch(url(pathname), {
    redirect: 'manual',
    ...options,
  })
  const body = await response.text()
  if (response.status !== 401 && response.status !== 403) {
    throw new Error(`${label}: expected 401/403, got HTTP ${response.status}: ${body.slice(0, 500)}`)
  }
  console.log(`PASS ${label}: HTTP ${response.status}`)
}

// SEC-019: Payload's own admin panel used to live at /cms, and its custom
// views (clients, calendar, analytics) skipped Payload's login redirect and
// served customer contacts to anyone. The panel is retired; none of its
// routes may answer, and none may leak customer data.
async function expectRetiredCmsRoute(pathname) {
  const response = await fetch(url(pathname), { redirect: 'manual' })
  const body = await response.text()
  if (response.status !== 404) {
    throw new Error(`${pathname}: expected 404 (Payload admin retired), got HTTP ${response.status}: ${body.slice(0, 500)}`)
  }
  if (/[a-z0-9._-]+@example\.invalid/i.test(body)) {
    throw new Error(`${pathname}: response contains customer contact data`)
  }
  console.log(`PASS ${pathname} -> 404 (Payload admin retired)`)
}

// SEC-020: the login page hands `next` to window.location.href after a
// successful login, so it must never carry an off-origin or script URL. The
// raw query string is echoed elsewhere in the RSC payload, so read the
// serialized `nextPath` prop itself rather than searching the whole page.
async function expectLoginNext(next, expected) {
  const response = await fetch(url(`/admin/login?next=${encodeURIComponent(next)}`), { redirect: 'manual' })
  const body = await response.text()
  if (response.status !== 200) {
    throw new Error(`login next=${JSON.stringify(next)}: expected HTTP 200, got ${response.status}`)
  }
  const nextPath = body.match(/nextPath\\":\\"([^"\\]*)\\"/)?.[1]
  if (nextPath !== expected) {
    throw new Error(`login next=${JSON.stringify(next)}: expected nextPath ${JSON.stringify(expected)}, got ${JSON.stringify(nextPath)}`)
  }
  console.log(`PASS login next=${JSON.stringify(next)} -> ${expected}`)
}

async function latestSubmittedFixture() {
  // orderItems are intentionally public-readable so storefront availability
  // can be rendered anonymously. Use that public surface to discover the
  // item just created by the preceding browser smoke instead of assuming
  // PostgreSQL sequence ids restart at 1 after disposable visual fixtures
  // are created and removed.
  const response = await fetch(url('/api/orderItems?sort=-id&limit=1&depth=0'))
  if (!response.ok) throw new Error(`Failed to discover latest smoke order item: HTTP ${response.status}`)
  const body = await response.json()
  const item = body?.docs?.[0]
  if (!item?.id) throw new Error(`Latest smoke order item is missing: ${JSON.stringify(body)}`)
  const orderId = typeof item.order === 'object' ? item.order?.id : item.order
  if (!orderId) throw new Error(`Latest smoke order relationship is missing: ${JSON.stringify(item)}`)
  return { orderId, itemId: item.id }
}

async function main() {
  const { orderId, itemId } = await latestSubmittedFixture()

  await expectDenied('anonymous order read blocked', `/api/orders/${orderId}?depth=0`)
  await expectDenied('anonymous order update blocked', `/api/orders/${orderId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes: 'must-not-save' }),
  })
  await expectDenied('anonymous order hard-delete blocked', `/api/orders/${orderId}`, { method: 'DELETE' })

  // Public checkout may mutate its own draft line items while assembling an
  // order, but once checkout has submitted it the item becomes an immutable
  // booking record for anonymous callers.
  await expectDenied('anonymous submitted item update blocked', `/api/orderItems/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity: 2 }),
  })
  await expectDenied('anonymous submitted item delete blocked', `/api/orderItems/${itemId}`, { method: 'DELETE' })

  // SEC-004/SEC-006: orders are created anonymously only by the checkout
  // Server Action. A direct REST/GraphQL create could otherwise write its own
  // promo snapshot (0 ₽ order) or mass-create pending orders holding stock.
  const forgedOrder = {
    customerName: 'Forged Order',
    customerEmail: 'forged-order@example.invalid',
    customerPhone: '+7 (900) 555-00-01',
    status: 'pending',
    promoCode: 'FORGED',
    promoDiscountType: 'percent',
    promoDiscountValue: 100,
  }
  await expectDenied('anonymous REST order create blocked', '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(forgedOrder),
  })
  const graphqlResponse = await fetch(url('/api/graphql'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `mutation { createOrder(data: { customerName: "Forged Order", customerEmail: "forged-order@example.invalid", customerPhone: "+7 (900) 555-00-01", status: pending, promoDiscountType: percent, promoDiscountValue: 100 }) { id } }`,
    }),
  })
  const graphqlBody = await graphqlResponse.json().catch(() => null)
  if (graphqlBody?.data?.createOrder?.id || !graphqlBody?.errors?.length) {
    throw new Error(`anonymous GraphQL order create was not rejected: HTTP ${graphqlResponse.status} ${JSON.stringify(graphqlBody)}`)
  }
  console.log('PASS anonymous GraphQL order create blocked')

  for (const pathname of ['/cms', '/cms/login', '/cms/clients', '/cms/calendar', '/cms/analytics', '/cms/collections/orders']) {
    await expectRetiredCmsRoute(pathname)
  }

  // SEC-026: the contact endpoint validates before rate limiting, so these
  // spend no rate-limit slots.
  const contact = (body, headers = {}) =>
    fetch(url('/api/contact-notification'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
  const nonString = await contact({ name: 'Smoke', email: ['x@example.invalid'], phone: '+79000000000', message: 'hi' })
  if (nonString.status !== 400) throw new Error(`contact with a non-string email: expected 400, got ${nonString.status}`)
  console.log('PASS contact rejects a non-string field: HTTP 400')
  const tooLong = await contact({ name: 'Smoke', email: 'long@example.invalid', phone: '+79000000000', message: 'x'.repeat(5001) })
  if (tooLong.status !== 400) throw new Error(`contact with an over-long message: expected 400, got ${tooLong.status}`)
  console.log('PASS contact rejects an over-long message: HTTP 400')
  const oversized = await contact({ name: 'Smoke', email: 'big@example.invalid', phone: '+79000000000', message: 'x'.repeat(40 * 1024) })
  if (oversized.status !== 413) throw new Error(`contact with a 40 KB body: expected 413, got ${oversized.status}`)
  console.log('PASS contact rejects an oversized body: HTTP 413')

  // The same-origin case proves the nextPath extraction works at all.
  await expectLoginNext('/admin/orders', '/admin/orders')
  for (const next of ['javascript:alert(1)', '//evil.example', 'https://evil.example', '/\t/evil.example', '/admin/../..//evil.example']) {
    await expectLoginNext(next, '/admin')
  }

  console.log('Public order security smoke passed')
}

main().catch((error) => {
  console.error('Public order security smoke failed')
  console.error(error)
  process.exit(1)
})
