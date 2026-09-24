const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000'
const adminEmail = process.env.SMOKE_ADMIN_EMAIL
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD
const customerEmail = 'smoke-customer@example.invalid'

if (!adminEmail || !adminPassword) {
  console.error('SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD are required')
  process.exit(1)
}

function url(pathname) {
  return new URL(pathname, baseUrl).toString()
}

async function json(response) {
  const text = await response.text()
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text
  }
}

async function main() {
  const login = await fetch(url('/api/users/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    redirect: 'manual',
  })
  const loginBody = await json(login)
  if (!login.ok) throw new Error(`Admin login failed: HTTP ${login.status} ${JSON.stringify(loginBody)}`)
  if (!loginBody?.token) throw new Error(`Admin login returned no JWT token: ${JSON.stringify(loginBody)}`)

  // This smoke runs in Node, not in a browser, so there is no automatic
  // cookie jar between fetch() calls. Use Payload's login JWT explicitly
  // instead of relying on Set-Cookie persistence that Node fetch does not
  // provide. This exercises the same authenticated access policy without
  // coupling the test to browser cookie behavior already covered elsewhere.
  const authHeaders = { Authorization: `JWT ${loginBody.token}` }
  console.log('PASS lifecycle admin login')

  // The newest order for this customer is the one browser-smoke just created
  // by driving a real checkout. Cancelling it is the point of this script —
  // but it is also the fixture analytics-ui-smoke asserts its 1 350 ₽ net
  // revenue against, and a cancelled order is excluded from that report. CI
  // therefore runs analytics-ui before this; if you reorder the smokes, or
  // make this one cancel something else, check that script too.
  const orderSearch = await fetch(
    url(`/api/orders?where[customerEmail][equals]=${encodeURIComponent(customerEmail)}&sort=-createdAt&limit=1&depth=0`),
    { headers: authHeaders },
  )
  const orderSearchBody = await json(orderSearch)
  if (!orderSearch.ok || !Array.isArray(orderSearchBody?.docs) || orderSearchBody.docs.length !== 1) {
    throw new Error(`Smoke checkout order not found: ${JSON.stringify(orderSearchBody)}`)
  }
  const order = orderSearchBody.docs[0]
  if (order.status !== 'pending' || !order.submittedAt) {
    throw new Error(`Unexpected smoke order before lifecycle test: ${JSON.stringify(order)}`)
  }
  const orderId = order.id

  const itemsResponse = await fetch(url(`/api/orderItems?where[order][equals]=${orderId}&limit=10&depth=0`), {
    headers: authHeaders,
  })
  const items = await json(itemsResponse)
  if (!itemsResponse.ok || items?.totalDocs !== 1 || !items.docs?.[0]) {
    throw new Error(`Expected exactly one smoke order item: ${JSON.stringify(items)}`)
  }
  const item = items.docs[0]
  const itemId = item.id
  const productId = typeof item.product === 'object' ? item.product.id : item.product
  if (!item.startDate || !item.endDate || !productId) throw new Error(`Smoke order item is incomplete: ${JSON.stringify(item)}`)

  // The checkout smoke uses a same-calendar-day rental. Move only the return
  // time to 18:00 on that same UTC calendar day so availability has a non-zero
  // interval while pricing must remain exactly one rental day.
  const start = new Date(item.startDate)
  const end = new Date(item.endDate)
  end.setUTCHours(18, 0, 0, 0)
  if (end <= start) end.setTime(start.getTime() + 8 * 60 * 60 * 1000)

  const patchItem = await fetch(url(`/api/orderItems/${itemId}`), {
    method: 'PATCH',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ endDate: end.toISOString() }),
  })
  const patchedItem = await json(patchItem)
  if (!patchItem.ok || patchedItem?.doc?.lineTotal !== 1500) {
    throw new Error(`Admin order-item edit failed or repriced same-day rental: ${JSON.stringify(patchedItem)}`)
  }

  const patchedOrderResponse = await fetch(url(`/api/orders/${orderId}?depth=0`), { headers: authHeaders })
  const patchedOrder = await json(patchedOrderResponse)
  if (!patchedOrderResponse.ok || patchedOrder.totalPrice !== 1350 || patchedOrder.promoDiscount !== 150) {
    throw new Error(`Order total drifted after same-day time edit: ${JSON.stringify(patchedOrder)}`)
  }
  console.log('PASS admin item edit keeps one-day price/promo totals')

  const availabilityUrl = `/api/rental-availability-bulk?productIds=${productId}&start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`
  const beforeAvailabilityResponse = await fetch(url(availabilityUrl))
  const beforeAvailability = await json(beforeAvailabilityResponse)
  if (!beforeAvailabilityResponse.ok || beforeAvailability?.available?.[productId] !== 2) {
    throw new Error(`Active order did not reserve one of three units: ${JSON.stringify(beforeAvailability)}`)
  }
  console.log('PASS pending order reserves stock: 3 -> 2 available')

  const deleteItem = await fetch(url(`/api/orderItems/${itemId}`), {
    method: 'DELETE',
    headers: authHeaders,
  })
  if (!deleteItem.ok) throw new Error(`Deleting final order item failed: HTTP ${deleteItem.status} ${await deleteItem.text()}`)

  const cancelledOrderResponse = await fetch(url(`/api/orders/${orderId}?depth=0`), { headers: authHeaders })
  const cancelledOrder = await json(cancelledOrderResponse)
  if (
    !cancelledOrderResponse.ok ||
    cancelledOrder.status !== 'cancelled' ||
    cancelledOrder.totalPrice !== 0 ||
    cancelledOrder.promoDiscount !== 0
  ) {
    throw new Error(`Final-item deletion did not cancel/zero the order: ${JSON.stringify(cancelledOrder)}`)
  }

  const remainingItemsResponse = await fetch(url(`/api/orderItems?where[order][equals]=${orderId}&limit=10&depth=0`), {
    headers: authHeaders,
  })
  const remainingItems = await json(remainingItemsResponse)
  if (!remainingItemsResponse.ok || remainingItems.totalDocs !== 0) {
    throw new Error(`Order still has items after final-item deletion: ${JSON.stringify(remainingItems)}`)
  }
  console.log('PASS final-item deletion cancels order without deleting it')

  const afterAvailabilityResponse = await fetch(url(availabilityUrl))
  const afterAvailability = await json(afterAvailabilityResponse)
  if (!afterAvailabilityResponse.ok || afterAvailability?.available?.[productId] !== 3) {
    throw new Error(`Cancelled order did not release stock: ${JSON.stringify(afterAvailability)}`)
  }
  console.log('PASS cancelled order releases stock: 2 -> 3 available')

  const hardDelete = await fetch(url(`/api/orders/${orderId}`), {
    method: 'DELETE',
    headers: authHeaders,
  })
  if (hardDelete.ok || hardDelete.status < 400) {
    throw new Error(`Authenticated hard-delete unexpectedly succeeded: HTTP ${hardDelete.status}`)
  }

  const stillThere = await fetch(url(`/api/orders/${orderId}?depth=0`), { headers: authHeaders })
  const stillThereBody = await json(stillThere)
  if (!stillThere.ok || stillThereBody.status !== 'cancelled') {
    throw new Error(`Order disappeared after rejected hard-delete: ${JSON.stringify(stillThereBody)}`)
  }
  console.log(`PASS hard-delete blocked (HTTP ${hardDelete.status}); cancelled order remains`)

  console.log('Order lifecycle smoke passed')
}

main().catch((error) => {
  console.error('Order lifecycle smoke failed')
  console.error(error)
  process.exit(1)
})
