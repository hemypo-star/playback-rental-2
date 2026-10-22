// Shared kit/component stock and the 90-day rental limit, end to end
// (lib/rental/kitStock.ts, OrderItems.ts beforeValidate). Needs smoke:seed's
// fixtures: camera smoke-ci-camera-001 (stock 3) and lens smoke-ci-lens-001
// (stock 2). Creates a disposable kit and one admin order, then cancels the
// order and switches the kit off so later smokes see untouched stock.
const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000'
const adminEmail = process.env.SMOKE_ADMIN_EMAIL || 'smoke-admin@example.invalid'
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD || 'ci-smoke-only-password-2026'

const url = (pathname) => new URL(pathname, baseUrl).toString()
const json = async (response) => response.json().catch(() => null)
const doc = (body) => body?.doc ?? body

async function main() {
  const login = await fetch(url('/api/users/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  })
  const token = (await json(login))?.token
  if (!token) throw new Error(`admin login failed: HTTP ${login.status}`)
  const auth = { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' }
  const api = async (method, pathname, body) => {
    const response = await fetch(url(pathname), { method, headers: auth, ...(body ? { body: JSON.stringify(body) } : {}) })
    return { status: response.status, body: await json(response) }
  }

  const products = await api('GET', '/api/products?where[moySkladId][in]=smoke-ci-camera-001,smoke-ci-lens-001&limit=10&depth=0')
  const camera = products.body?.docs?.find((p) => p.moySkladId === 'smoke-ci-camera-001')
  const lens = products.body?.docs?.find((p) => p.moySkladId === 'smoke-ci-lens-001')
  if (!camera || camera.quantity !== 3 || !lens || lens.quantity !== 2) {
    throw new Error(`unexpected smoke fixtures: ${JSON.stringify(products.body?.docs)}`)
  }

  const kitResponse = await api('POST', '/api/products', {
    title: 'Smoke Kit',
    listingType: 'rental',
    price: 2000,
    quantity: 5,
    category: typeof camera.category === 'object' ? camera.category.id : camera.category,
    moySkladId: `kit-smoke-${Date.now()}`,
    isKit: true,
    available: true,
    kitItems: [
      { label: 'Camera', productId: camera.id },
      { label: 'Lens', productId: lens.id },
    ],
  })
  const kit = doc(kitResponse.body)
  if (kitResponse.status !== 201 || !kit?.id) throw new Error(`kit create failed: HTTP ${kitResponse.status} ${JSON.stringify(kitResponse.body)}`)

  const start = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000)
  start.setUTCHours(3, 0, 0, 0) // 10:00 Kemerovo
  const end = new Date(start)
  end.setUTCHours(11, 0, 0, 0) // 18:00 Kemerovo
  const range = `start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`
  const available = async (id) => (await api('GET', `/api/rental-availability?productId=${id}&${range}`)).body

  const expectAvailable = async (label, id, expected) => {
    const result = await available(id)
    if (result?.available !== expected) throw new Error(`${label}: expected ${expected} free, got ${JSON.stringify(result)}`)
    console.log(`PASS ${label}: ${expected} free`)
    return result
  }

  let orderId
  try {
    await expectAvailable('kit limited by its scarcest component (2 lenses)', kit.id, 2)

    // Checkout's cart check: lines see the lines before them, in cart order.
    const cart = async (items) =>
      (await api('GET', `/api/rental-availability-bulk?productIds=${items.map(([id]) => id).join(',')}&items=${items.map(([id, q]) => `${id}:${q}`).join(',')}&${range}`)).body?.available
    const kitThenLenses = await cart([
      [kit.id, 1],
      [lens.id, 2],
    ])
    if (kitThenLenses?.[kit.id] !== 2 || kitThenLenses?.[lens.id] !== 1) {
      throw new Error(`cart kit then 2 lenses: expected kit 2 / lens 1, got ${JSON.stringify(kitThenLenses)}`)
    }
    const lensesThenKit = await cart([
      [lens.id, 2],
      [kit.id, 1],
    ])
    if (lensesThenKit?.[lens.id] !== 2 || lensesThenKit?.[kit.id] !== 0) {
      throw new Error(`cart 2 lenses then kit: expected lens 2 / kit 0, got ${JSON.stringify(lensesThenKit)}`)
    }
    console.log('PASS cart check counts a kit and its component in the same cart')

    const order = doc(
      (await api('POST', '/api/orders', { customerName: 'Kit Smoke', customerEmail: 'kit-smoke@example.invalid', customerPhone: '+7 (900) 555-00-07', status: 'pending' })).body,
    )
    orderId = order?.id
    if (!orderId) throw new Error('admin order create failed')
    const book = (product, quantity, from = start, to = end) =>
      api('POST', '/api/orderItems', { order: orderId, product, quantity, startDate: from.toISOString(), endDate: to.toISOString() })

    if ((await book(lens.id, 1)).status !== 201) throw new Error('booking one lens failed')
    await expectAvailable('one lens booked: kit drops to 1', kit.id, 1)

    if ((await book(kit.id, 1)).status !== 201) throw new Error('booking one kit failed')
    await expectAvailable('kit + bare lens use both lenses: lens 0 free', lens.id, 0)
    await expectAvailable('kit uses one camera: camera 2 free', camera.id, 2)
    await expectAvailable('no lens left: kit 0 free', kit.id, 0)

    const secondKit = await book(kit.id, 1)
    if (secondKit.status !== 400) throw new Error(`a kit without a free lens was accepted: HTTP ${secondKit.status}`)
    console.log('PASS kit refused once a component is used up: HTTP 400')

    if ((await book(camera.id, 2)).status !== 201) throw new Error('booking the two remaining cameras failed')
    console.log('PASS bare camera bookable alongside the kit while stock lasts')

    const lensCalendar = await available(lens.id)
    if (!lensCalendar?.bookedRanges?.length) throw new Error(`lens calendar shows no busy range: ${JSON.stringify(lensCalendar)}`)
    console.log('PASS calendar marks the fully used lens as busy')

    const DAY = 24 * 60 * 60 * 1000
    const later = (days) => new Date(start.getTime() + days * DAY)
    const tooLong = await book(camera.id, 1, later(400), later(400 + 366))
    if (tooLong.status !== 400 || tooLong.body?.errors?.[0]?.data?.reason !== 'too_long') {
      throw new Error(`366-day rental not refused as too_long: HTTP ${tooLong.status} ${JSON.stringify(tooLong.body)}`)
    }
    console.log('PASS 366-day rental refused (limit 365 days)')

    // Owner's minimum: 4 hours. A same-day backwards range used to slip
    // through (calendar-day comparison).
    const pickup = later(800)
    const tooShort = await book(camera.id, 1, pickup, new Date(pickup.getTime() + 2 * 60 * 60 * 1000))
    if (tooShort.status !== 400 || tooShort.body?.errors?.[0]?.data?.reason !== 'too_short') {
      throw new Error(`2-hour rental not refused as too_short: HTTP ${tooShort.status} ${JSON.stringify(tooShort.body)}`)
    }
    const backwards = await book(camera.id, 1, pickup, new Date(pickup.getTime() - 6 * 60 * 60 * 1000))
    if (backwards.status !== 400 || backwards.body?.errors?.[0]?.data?.reason !== 'backwards') {
      throw new Error(`same-day backwards range not refused: HTTP ${backwards.status} ${JSON.stringify(backwards.body)}`)
    }
    console.log('PASS 2-hour rental and a same-day backwards range refused')
  } finally {
    if (orderId) await api('PATCH', `/api/orders/${orderId}`, { status: 'cancelled' })
    await api('PATCH', `/api/products/${kit.id}`, { available: false })
  }
  console.log('Kit stock smoke passed')
}

main().catch((error) => {
  console.error('Kit stock smoke failed')
  console.error(error)
  process.exit(1)
})
