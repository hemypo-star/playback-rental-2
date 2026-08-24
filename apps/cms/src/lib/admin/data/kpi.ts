import { getPayload } from 'payload'
import config from '@payload-config'

// Ported from apps/cms/src/endpoints/admin/kpi.ts (docs/PLAN-next-
// migration.md Stage 3.3) — the endpoint's body, minus the explicit
// req.user check: custom Payload endpoints bypass collection access
// control and had to check it themselves, but this is now a plain
// server-only function only ever called from inside the guarded
// (admin)/admin/layout.tsx subtree, so the layout's own auth guard is the
// single place that check lives now. The endpoint itself (still needed for
// apps/web's REST-based admin until Stage 4) is untouched.
const ACTIVE_STATUSES = ['pending', 'confirmed']

export interface AdminKpi {
  weeklyRevenue: number
  weeklyOrdersCount: number
  pendingCount: number
  utilization: number
  activeRentalQty: number
  totalRentalStock: number
  avgOrderValue: number
  submittedCount: number
}

export async function getAdminKpi(): Promise<AdminKpi> {
  const payload = await getPayload({ config })
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [weeklyOrders, pendingOrders, submittedOrders, rentalProducts, activeOrders] = await Promise.all([
    payload.find({ collection: 'orders', where: { createdAt: { greater_than_equal: weekAgo.toISOString() } }, limit: 0, depth: 0 }),
    payload.find({ collection: 'orders', where: { status: { equals: 'pending' } }, limit: 0, depth: 0 }),
    payload.find({ collection: 'orders', where: { submittedAt: { exists: true } }, limit: 0, depth: 0 }),
    payload.find({ collection: 'products', where: { listingType: { equals: 'rental' } }, limit: 0, depth: 0 }),
    payload.find({ collection: 'orders', where: { status: { in: ACTIVE_STATUSES } }, limit: 0, depth: 0 }),
  ])

  const activeOrderIds = activeOrders.docs.map((o) => o.id)
  const activeItems =
    activeOrderIds.length === 0
      ? { docs: [] as { quantity: number }[] }
      : await payload.find({
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
        })

  const weeklyRevenue = weeklyOrders.docs.reduce((sum, o) => sum + (o.totalPrice || 0), 0)
  const avgOrderValue = submittedOrders.totalDocs
    ? submittedOrders.docs.reduce((sum, o) => sum + (o.totalPrice || 0), 0) / submittedOrders.totalDocs
    : 0

  const totalRentalStock = rentalProducts.docs.reduce((sum, p) => sum + (p.quantity || 0), 0)
  const activeRentalQty = activeItems.docs.reduce((sum, i) => sum + (i.quantity || 0), 0)
  const utilization = totalRentalStock > 0 ? Math.round((activeRentalQty / totalRentalStock) * 100) : 0

  return {
    weeklyRevenue,
    weeklyOrdersCount: weeklyOrders.totalDocs,
    pendingCount: pendingOrders.totalDocs,
    utilization,
    activeRentalQty,
    totalRentalStock,
    avgOrderValue: Math.round(avgOrderValue),
    submittedCount: submittedOrders.totalDocs,
  }
}
