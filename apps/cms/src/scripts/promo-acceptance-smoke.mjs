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

async function body(response) {
  const text = await response.text()
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text
  }
}

function doc(value) {
  return value?.doc ?? value
}

async function expectPromo(code, expected) {
  const response = await fetch(url(`/api/promo-codes/validate?code=${encodeURIComponent(code)}`))
  const value = await body(response)
  if (!response.ok || JSON.stringify(value) !== JSON.stringify(expected)) {
    throw new Error(`Promo ${code} mismatch: HTTP ${response.status} ${JSON.stringify(value)} != ${JSON.stringify(expected)}`)
  }
  console.log(`PASS promo ${code}: ${JSON.stringify(value)}`)
}

async function main() {
  await expectPromo('smokefixed', {
    valid: true,
    discountType: 'fixed',
    discountValue: 500,
    minOrderAmount: 1500,
  })
  await expectPromo('SMOKEINACTIVE', { valid: false })
  await expectPromo('SMOKEEXPIRED', { valid: false })
  await expectPromo('THIS-CODE-DOES-NOT-EXIST', { valid: false })

  const anonymousList = await fetch(url('/api/promoCodes?limit=1'))
  if (anonymousList.status !== 401 && anonymousList.status !== 403) {
    throw new Error(`Promo-code collection is publicly enumerable: HTTP ${anonymousList.status}`)
  }
  console.log(`PASS promo collection remains admin-only: HTTP ${anonymousList.status}`)

  const login = await fetch(url('/api/users/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  })
  const loginBody = await body(login)
  if (!login.ok || !loginBody?.token) throw new Error(`Promo smoke admin login failed: ${JSON.stringify(loginBody)}`)
  const auth = { Authorization: `JWT ${loginBody.token}` }

  const productsResponse = await fetch(
    url('/api/products?where[moySkladId][in]=smoke-ci-camera-001,smoke-ci-lens-001&limit=10&depth=0'),
    { headers: auth },
  )
  const productsBody = await body(productsResponse)
  if (!productsResponse.ok || !Array.isArray(productsBody?.docs)) {
    throw new Error(`Could not load smoke products: ${JSON.stringify(productsBody)}`)
  }
  const camera = productsBody.docs.find((product) => product.moySkladId === 'smoke-ci-camera-001')
  const lens = productsBody.docs.find((product) => product.moySkladId === 'smoke-ci-lens-001')
  if (!camera || camera.price !== 1500 || !lens || lens.price !== 700) {
    throw new Error(`Unexpected smoke products: ${JSON.stringify(productsBody.docs)}`)
  }

  const date = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
  date.setUTCHours(10, 0, 0, 0)
  const startDate = date.toISOString()
  const end = new Date(date)
  end.setUTCHours(18, 0, 0, 0)
  const endDate = end.toISOString()

  async function createSnapshotOrder(product, label, expectedDiscount, expectedTotal) {
    const orderResponse = await fetch(url('/api/orders'), {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: `Promo Smoke ${label}`,
        customerEmail: `promo-${label.toLowerCase()}@example.invalid`,
        customerPhone: '+7 (900) 555-00-00',
        status: 'pending',
        promoCode: 'SMOKEFIXED',
        promoDiscountType: 'fixed',
        promoDiscountValue: 500,
        promoMinOrderAmount: 1500,
      }),
    })
    const orderBody = await body(orderResponse)
    const order = doc(orderBody)
    if (!orderResponse.ok || !order?.id) {
      throw new Error(`${label}: order create failed: HTTP ${orderResponse.status} ${JSON.stringify(orderBody)}`)
    }

    const itemResponse = await fetch(url('/api/orderItems'), {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order: order.id,
        product: product.id,
        quantity: 1,
        startDate,
        endDate,
      }),
    })
    const itemBody = await body(itemResponse)
    const item = doc(itemBody)
    if (!itemResponse.ok || !item?.id) {
      throw new Error(`${label}: item create failed: HTTP ${itemResponse.status} ${JSON.stringify(itemBody)}`)
    }

    const storedResponse = await fetch(url(`/api/orders/${order.id}?depth=0`), { headers: auth })
    const stored = await body(storedResponse)
    if (!storedResponse.ok || stored.promoDiscount !== expectedDiscount || stored.totalPrice !== expectedTotal) {
      throw new Error(
        `${label}: fixed threshold math mismatch: ${JSON.stringify({ promoDiscount: stored?.promoDiscount, totalPrice: stored?.totalPrice })}`,
      )
    }

    await fetch(url(`/api/orders/${order.id}`), {
      method: 'PATCH',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    const deleteItem = await fetch(url(`/api/orderItems/${item.id}`), { method: 'DELETE', headers: auth })
    if (!deleteItem.ok) throw new Error(`${label}: cleanup item delete failed: HTTP ${deleteItem.status}`)

    console.log(`PASS ${label}: discount ${expectedDiscount}, net ${expectedTotal}`)
  }

  // 700 ₽ is below the 1500 ₽ threshold: the code snapshot is preserved but
  // no discount is applied. 1500 ₽ is exactly the threshold and must qualify.
  await createSnapshotOrder(lens, 'below-threshold', 0, 700)
  await createSnapshotOrder(camera, 'exact-threshold', 500, 1000)

  console.log('Promo acceptance smoke passed')
}

main().catch((error) => {
  console.error('Promo acceptance smoke failed')
  console.error(error)
  process.exit(1)
})
