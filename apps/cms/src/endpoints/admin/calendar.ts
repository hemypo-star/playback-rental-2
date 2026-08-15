import type { Endpoint } from 'payload'

// Data half of apps/cms/src/components/admin/CalendarView.tsx, ported
// near-verbatim (same 14-day occupancy window, same query shape) — the
// rendering (Gantt bars) moves to apps/web's Astro page instead of JSX here.
const DAYS_TO_SHOW = 14
const ACTIVE_STATUSES = ['pending', 'confirmed']

function startOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

export const adminCalendarEndpoint: Endpoint = {
  path: '/admin/calendar',
  method: 'get',
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = startOfDay(new Date())
    const days = Array.from({ length: DAYS_TO_SHOW }, (_, i) => addDays(today, i).toISOString())
    const rangeEnd = addDays(today, DAYS_TO_SHOW)

    const [products, activeOrders] = await Promise.all([
      req.payload.find({
        collection: 'products',
        where: { listingType: { equals: 'rental' } },
        limit: 0,
        depth: 0,
        req,
      }),
      req.payload.find({
        collection: 'orders',
        where: { status: { in: ACTIVE_STATUSES } },
        limit: 0,
        depth: 0,
        req,
      }),
    ])

    const activeOrderIds = activeOrders.docs.map((o: any) => o.id)
    const orderStatusById = new Map(activeOrders.docs.map((o: any) => [o.id, o.status]))

    const itemsInRange =
      activeOrderIds.length === 0
        ? { docs: [] as any[] }
        : await req.payload.find({
            collection: 'orderItems',
            where: {
              and: [
                { order: { in: activeOrderIds } },
                { listingType: { equals: 'rental' } },
                { startDate: { less_than: rangeEnd.toISOString() } },
                { endDate: { greater_than: today.toISOString() } },
              ],
            },
            limit: 0,
            depth: 1,
            req,
          })

    const itemsByProduct = new Map<number, any[]>()
    for (const item of itemsInRange.docs) {
      const productId = typeof item.product === 'object' ? item.product.id : item.product
      if (!itemsByProduct.has(productId)) itemsByProduct.set(productId, [])
      itemsByProduct.get(productId)!.push(item)
    }

    const productsWithBookings = products.docs.filter((p: any) => itemsByProduct.has(p.id))
    const productsWithoutBookings = products.docs.filter((p: any) => !itemsByProduct.has(p.id))
    const orderedProducts = [...productsWithBookings, ...productsWithoutBookings]

    const rows = orderedProducts.map((product: any) => ({
      id: product.id,
      title: product.title,
      items: (itemsByProduct.get(product.id) || []).map((item: any) => {
        const orderId = typeof item.order === 'object' ? item.order.id : item.order
        return {
          id: item.id,
          startDate: item.startDate,
          endDate: item.endDate,
          quantity: item.quantity,
          orderId,
          orderStatus: orderStatusById.get(orderId) ?? null,
        }
      }),
    }))

    return Response.json({ days, products: rows })
  },
}
