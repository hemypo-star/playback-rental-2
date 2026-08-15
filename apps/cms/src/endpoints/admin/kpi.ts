import type { Endpoint } from 'payload'

// Ported near-verbatim from apps/cms/src/components/admin/AdminKpiWidget.tsx
// (the native-/cms-admin version) — same queries, JSON instead of JSX, so
// the custom /admin UI (apps/web) can render the same 4 cards. Real numbers
// only, computed from orders/orderItems/products — no placeholder figures.
//
// Custom endpoints bypass collection access control entirely (they don't go
// through a collection's `access` functions), so req.user must be checked
// explicitly — same pattern as every other /admin/* endpoint here.
const ACTIVE_STATUSES = ['pending', 'confirmed']

export const adminKpiEndpoint: Endpoint = {
  path: '/admin/kpi',
  method: 'get',
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [weeklyOrders, pendingOrders, submittedOrders, rentalProducts, activeOrders] = await Promise.all([
      req.payload.find({
        collection: 'orders',
        where: { createdAt: { greater_than_equal: weekAgo.toISOString() } },
        limit: 0,
        depth: 0,
        req,
      }),
      req.payload.find({
        collection: 'orders',
        where: { status: { equals: 'pending' } },
        limit: 0,
        depth: 0,
        req,
      }),
      req.payload.find({
        collection: 'orders',
        where: { submittedAt: { exists: true } },
        limit: 0,
        depth: 0,
        req,
      }),
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
    const activeItems =
      activeOrderIds.length === 0
        ? { docs: [] as any[] }
        : await req.payload.find({
            collection: 'orderItems',
            where: {
              and: [
                { order: { in: activeOrderIds } },
                { listingType: { equals: 'rental' } },
                { startDate: { less_than_equal: now.toISOString() } },
                { endDate: { greater_than: now.toISOString() } },
              ],
            },
            limit: 0,
            depth: 0,
            req,
          })

    const weeklyRevenue = weeklyOrders.docs.reduce((sum: number, o: any) => sum + (o.totalPrice || 0), 0)
    const avgOrderValue = submittedOrders.totalDocs
      ? submittedOrders.docs.reduce((sum: number, o: any) => sum + (o.totalPrice || 0), 0) / submittedOrders.totalDocs
      : 0

    const totalRentalStock = rentalProducts.docs.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0)
    const activeRentalQty = activeItems.docs.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)
    const utilization = totalRentalStock > 0 ? Math.round((activeRentalQty / totalRentalStock) * 100) : 0

    return Response.json({
      weeklyRevenue,
      weeklyOrdersCount: weeklyOrders.totalDocs,
      pendingCount: pendingOrders.totalDocs,
      utilization,
      activeRentalQty,
      totalRentalStock,
      avgOrderValue: Math.round(avgOrderValue),
      submittedCount: submittedOrders.totalDocs,
    })
  },
}
