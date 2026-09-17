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

  console.log('Manual order smoke passed')
}

main().catch((error) => {
  console.error('Manual order smoke failed')
  console.error(error)
  process.exit(1)
})
