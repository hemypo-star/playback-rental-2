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

  console.log('Public order security smoke passed')
}

main().catch((error) => {
  console.error('Public order security smoke failed')
  console.error(error)
  process.exit(1)
})
