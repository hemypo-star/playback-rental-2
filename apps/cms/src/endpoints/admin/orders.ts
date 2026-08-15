import type { Endpoint } from 'payload'

// Backs the "Заказы" tab's table (Номер · Клиент · Позиции · Даты · Сумма ·
// Статус — see docs/design-reference/markup.html's tabOrders block). No
// existing /cms view to port this from (the native admin just uses
// Payload's default Orders list) — built fresh, but same two-step
// orders-then-orderItems query shape as kpi/calendar/clients above, for the
// same reason: local API with limit: 0, not a REST round trip per order.
//
// Step 4 scope: most-recent orders only, no search/filter/status editing —
// that's Step 5 (order operations).
const RECENT_LIMIT = 50

export const adminOrdersEndpoint: Endpoint = {
  path: '/admin/orders',
  method: 'get',
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orders = await req.payload.find({
      collection: 'orders',
      sort: '-createdAt',
      limit: RECENT_LIMIT,
      depth: 0,
      req,
    })

    const orderIds = orders.docs.map((o: any) => o.id)
    const items =
      orderIds.length === 0
        ? { docs: [] as any[] }
        : await req.payload.find({
            collection: 'orderItems',
            where: { order: { in: orderIds } },
            limit: 0,
            depth: 1,
            req,
          })

    const itemsByOrder = new Map<number, any[]>()
    for (const item of items.docs as any[]) {
      const orderId = typeof item.order === 'object' ? item.order.id : item.order
      if (!itemsByOrder.has(orderId)) itemsByOrder.set(orderId, [])
      itemsByOrder.get(orderId)!.push(item)
    }

    const rows = orders.docs.map((o: any) => {
      const orderItems = itemsByOrder.get(o.id) || []
      const itemsSummary = orderItems
        .map((item) => `${typeof item.product === 'object' ? item.product?.title : '—'} ×${item.quantity}`)
        .join(', ')

      const rentalItems = orderItems.filter((item) => item.listingType === 'rental' && item.startDate && item.endDate)
      let dates: string | null = null
      if (rentalItems.length > 0) {
        const start = rentalItems.reduce((min, i) => (i.startDate < min ? i.startDate : min), rentalItems[0].startDate)
        const end = rentalItems.reduce((max, i) => (i.endDate > max ? i.endDate : max), rentalItems[0].endDate)
        dates = `${start}|${end}`
      }

      return {
        id: o.id,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        customerPhone: o.customerPhone,
        itemsSummary: itemsSummary || '—',
        itemCount: orderItems.length,
        dates,
        totalPrice: o.totalPrice,
        status: o.status,
        createdAt: o.createdAt,
      }
    })

    return Response.json({ orders: rows })
  },
}
