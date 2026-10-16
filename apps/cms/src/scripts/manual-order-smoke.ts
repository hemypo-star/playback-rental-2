import { getPayload } from 'payload'
import config from '@payload-config'
import { createManualOrder } from '../lib/admin/manualOrder'

async function main() {
  const payload = await getPayload({ config })

  const productResult = await payload.find({
    collection: 'products',
    where: { moySkladId: { equals: 'smoke-ci-camera-001' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const product = productResult.docs[0]
  if (!product) throw new Error('Seeded smoke rental product not found')

  const start = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
  start.setUTCHours(10, 0, 0, 0)
  const end = new Date(start)
  end.setUTCHours(18, 0, 0, 0)

  let orderId: number | null = null
  try {
    orderId = await createManualOrder(payload, {
      customerName: 'Smoke Manual Order',
      customerEmail: 'smoke-manual@example.invalid',
      customerPhone: '+7 (900) 222-33-44',
      notes: 'Disposable manual-order acceptance',
      items: [
        {
          productId: product.id,
          quantity: 1,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
      ],
    })

    const [order, items] = await Promise.all([
      payload.findByID({ collection: 'orders', id: orderId, depth: 0, overrideAccess: true }),
      payload.find({
        collection: 'orderItems',
        where: { order: { equals: orderId } },
        limit: 10,
        depth: 0,
        overrideAccess: true,
      }),
    ])

    if (order.status !== 'pending') throw new Error(`Manual order status should be pending, got ${order.status}`)
    if (order.submittedAt) throw new Error('Manual order must not auto-submit')
    if (order.moySkladOrderId) throw new Error('Manual order must not have a MoySklad id before explicit submit')
    if (items.totalDocs !== 1) throw new Error(`Expected one manual order item, got ${items.totalDocs}`)
    const item = items.docs[0]
    if (!item || (item.lineTotal ?? 0) <= 0) throw new Error('Manual order item was not priced by OrderItems hook')
    if ((order.totalPrice ?? 0) !== (item.lineTotal ?? 0)) {
      throw new Error(`Order total ${order.totalPrice} does not match item lineTotal ${item.lineTotal}`)
    }

    console.log(`PASS manual order ${orderId}: pending, priced, not externally submitted`)
  } finally {
    if (orderId) {
      const items = await payload.find({
        collection: 'orderItems',
        where: { order: { equals: orderId } },
        limit: 0,
        depth: 0,
        overrideAccess: true,
      })
      for (const item of items.docs) {
        await payload.delete({ collection: 'orderItems', id: item.id, overrideAccess: true })
      }
      // Cleanup of disposable CI fixture only. Ordinary operator hard-delete
      // remains denied by OrdersWithLifecyclePolicy.
      await payload.delete({ collection: 'orders', id: orderId, overrideAccess: true })
    }
  }

  await kitAndComponentInOneOrder(payload)

  console.log('Manual order smoke passed')
  process.exit(0)
}

// A kit and one of its own components in ONE order, written in one
// transaction (createManualOrder, same as checkout): each line must see the
// lines before it, and a refused line must leave no order behind.
async function kitAndComponentInOneOrder(payload: Awaited<ReturnType<typeof getPayload>>) {
  const fixtures = await payload.find({
    collection: 'products',
    where: { moySkladId: { in: ['smoke-ci-camera-001', 'smoke-ci-lens-001'] } },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  })
  const camera = fixtures.docs.find((p) => p.moySkladId === 'smoke-ci-camera-001')
  const lens = fixtures.docs.find((p) => p.moySkladId === 'smoke-ci-lens-001')
  if (!camera || !lens || lens.quantity !== 2) throw new Error('Seeded camera/lens fixtures not found (lens stock must be 2)')

  const kit = await payload.create({
    collection: 'products',
    data: {
      title: 'Smoke Txn Kit',
      listingType: 'rental',
      price: 2000,
      quantity: 5,
      category: typeof camera.category === 'object' ? camera.category.id : camera.category,
      moySkladId: `kit-smoke-txn-${Date.now()}`,
      isKit: true,
      available: true,
      kitItems: [
        { label: 'Camera', productId: camera.id },
        { label: 'Lens', productId: lens.id },
      ],
    },
    overrideAccess: true,
  })

  const start = new Date(Date.now() + 150 * 24 * 60 * 60 * 1000)
  start.setUTCHours(3, 0, 0, 0)
  const end = new Date(start)
  end.setUTCHours(11, 0, 0, 0)
  const line = (productId: number, quantity: number) => ({ productId, quantity, startDate: start.toISOString(), endDate: end.toISOString() })
  const customerEmail = 'smoke-kit-txn@example.invalid'
  const order = (items: ReturnType<typeof line>[]) =>
    createManualOrder(payload, { customerName: 'Smoke Kit Txn', customerEmail, customerPhone: '+7 (900) 222-33-55', items })
  const ordersOfCustomer = async () =>
    (await payload.find({ collection: 'orders', where: { customerEmail: { equals: customerEmail } }, limit: 0, depth: 0, overrideAccess: true })).docs

  let okOrderId: number | null = null
  try {
    // 2 lenses in stock: the kit takes one, so two more must be refused.
    let refused = false
    try {
      await order([line(kit.id, 1), line(lens.id, 2)])
    } catch {
      refused = true
    }
    if (!refused) throw new Error('kit + 2 lenses was accepted with only 2 lenses in stock')
    if ((await ordersOfCustomer()).length !== 0) throw new Error('refused order left an empty order behind (transaction not rolled back)')
    console.log('PASS kit + its component in one order: refused when short, no empty order left')

    okOrderId = await order([line(kit.id, 1), line(lens.id, 1)])
    const items = await payload.find({ collection: 'orderItems', where: { order: { equals: okOrderId } }, limit: 10, depth: 0, overrideAccess: true })
    if (items.totalDocs !== 2) throw new Error(`expected 2 items in the kit + lens order, got ${items.totalDocs}`)
    console.log('PASS kit + its component in one order: accepted while stock lasts')
  } finally {
    for (const o of await ordersOfCustomer()) {
      const items = await payload.find({ collection: 'orderItems', where: { order: { equals: o.id } }, limit: 0, depth: 0, overrideAccess: true })
      for (const item of items.docs) await payload.delete({ collection: 'orderItems', id: item.id, overrideAccess: true })
      await payload.delete({ collection: 'orders', id: o.id, overrideAccess: true })
    }
    await payload.delete({ collection: 'products', id: kit.id, overrideAccess: true })
  }
}

main().catch((error) => {
  console.error('Manual order smoke failed')
  console.error(error)
  process.exit(1)
})
