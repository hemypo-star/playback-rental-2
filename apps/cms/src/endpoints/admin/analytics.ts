import type { Endpoint } from 'payload'

// Ported near-verbatim from apps/cms/src/components/admin/AnalyticsView.tsx
// — revenue by category, computed live from order items on non-cancelled
// orders. No invented figures.
export const adminAnalyticsEndpoint: Endpoint = {
  path: '/admin/analytics',
  method: 'get',
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cancelledOrders = await req.payload.find({
      collection: 'orders',
      where: { status: { equals: 'cancelled' } },
      limit: 0,
      depth: 0,
      req,
    })
    const cancelledIds = cancelledOrders.docs.map((o: any) => o.id)

    const items = await req.payload.find({
      collection: 'orderItems',
      where: cancelledIds.length ? { order: { not_in: cancelledIds } } : {},
      limit: 0,
      depth: 2,
      req,
    })

    const byCategory = new Map<string, number>()
    for (const item of items.docs as any[]) {
      const category = typeof item.product === 'object' ? item.product?.category : undefined
      const name = typeof category === 'object' && category ? category.name : 'Без категории'
      byCategory.set(name, (byCategory.get(name) ?? 0) + (item.lineTotal || 0))
    }

    const rows = [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, revenue]) => ({ name, revenue }))

    return Response.json({ rows })
  },
}
