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

async function main() {
  // The disposable smoke DB starts empty and the preceding browser smoke
  // creates its first order/item, so id=1 is deliberate here. These checks
  // run before the authenticated lifecycle smoke mutates that order.
  await expectDenied('anonymous order read blocked', '/api/orders/1?depth=0')
  await expectDenied('anonymous order update blocked', '/api/orders/1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes: 'must-not-save' }),
  })
  await expectDenied('anonymous order hard-delete blocked', '/api/orders/1', { method: 'DELETE' })

  // Public checkout may mutate its own *draft* line items while assembling an
  // order, but once checkout has submitted it the item becomes an immutable
  // booking record for anonymous callers. The browser smoke has already
  // submitted order/item #1 by this point.
  await expectDenied('anonymous submitted item update blocked', '/api/orderItems/1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity: 2 }),
  })
  await expectDenied('anonymous submitted item delete blocked', '/api/orderItems/1', { method: 'DELETE' })

  console.log('Public order security smoke passed')
}

main().catch((error) => {
  console.error('Public order security smoke failed')
  console.error(error)
  process.exit(1)
})
