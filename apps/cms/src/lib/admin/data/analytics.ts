import { getPayload } from 'payload'
import config from '@payload-config'
import type { OrderItem } from '../../../payload-types'

// Ported near-verbatim from apps/cms/src/endpoints/admin/analytics.ts
// (docs/PLAN-next-migration.md Stage 3.5, page group 4) — revenue by
// category, computed live from order items on non-cancelled orders. No
// invented figures.
export interface AdminAnalyticsRow {
  name: string
  revenue: number
}

// Review finding C (fix round on claude/promo-codes): item.lineTotal is
// GROSS (undiscounted) — recalcOrderTotal (OrderItems.ts) never touches it,
// the discount only ever shows up in orders.totalPrice/promoDiscount. Since
// the promo-codes feature landed, kpi.ts/clients.ts both sum
// order.totalPrice (NET), so summing raw lineTotal here would inflate this
// screen's revenue by exactly the sum of every order's discount, and it
// would stop reconciling with the KPI card next to it. Fixed by
// pro-rating each order's own already-computed promoDiscount across its
// own lines by lineTotal share, so this screen's total matches net revenue
// exactly, not just approximately.
function categoryName(item: OrderItem): string {
  const category = typeof item.product === 'object' ? item.product?.category : undefined
  return typeof category === 'object' && category ? category.name : 'Без категории'
}

function addRevenue(byCategory: Map<string, number>, item: OrderItem, amount: number): void {
  const name = categoryName(item)
  byCategory.set(name, (byCategory.get(name) ?? 0) + amount)
}

export async function getAdminAnalytics(): Promise<AdminAnalyticsRow[]> {
  const payload = await getPayload({ config })

  const cancelledOrders = await payload.find({
    collection: 'orders',
    where: { status: { equals: 'cancelled' } },
    limit: 0,
    depth: 0,
  })
  const cancelledIds = cancelledOrders.docs.map((o) => o.id)

  const items = await payload.find({
    collection: 'orderItems',
    where: cancelledIds.length ? { order: { not_in: cancelledIds } } : {},
    limit: 0,
    depth: 2,
  })

  // Group by order first — the discount is a per-ORDER amount
  // (order.promoDiscount, already computed by recalcOrderTotal) that needs
  // spreading back across that order's own lines, not something derivable
  // from a single line in isolation.
  const itemsByOrder = new Map<number, OrderItem[]>()
  for (const item of items.docs as OrderItem[]) {
    const orderId = typeof item.order === 'object' ? item.order?.id : item.order
    if (!orderId) continue
    const list = itemsByOrder.get(orderId)
    if (list) list.push(item)
    else itemsByOrder.set(orderId, [item])
  }

  const byCategory = new Map<string, number>()
  for (const orderItems of itemsByOrder.values()) {
    const gross = orderItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0)
    const firstOrder = orderItems[0]?.order
    const orderDiscount = typeof firstOrder === 'object' ? firstOrder?.promoDiscount || 0 : 0

    // Degenerate cases: no discount to spread, or nothing to spread it
    // across proportionally (gross <= 0 — an all-free-lines order; this
    // also guards the division below). Every line counts at its own gross
    // lineTotal, unchanged.
    if (gross <= 0 || orderDiscount <= 0) {
      for (const item of orderItems) addRevenue(byCategory, item, item.lineTotal || 0)
      continue
    }

    // Floor-round every line's proportional share except the last (sorted
    // by id for a deterministic "last"), which instead takes whatever
    // remains of orderDiscount — so the shares always sum to exactly
    // orderDiscount, never drifting a few kopecks off it the way summing
    // independently-rounded shares could.
    const sorted = [...orderItems].sort((a, b) => a.id - b.id)
    let allocated = 0
    sorted.forEach((item, index) => {
      const lineTotal = item.lineTotal || 0
      const isLast = index === sorted.length - 1
      const share = isLast ? orderDiscount - allocated : Math.floor((lineTotal / gross) * orderDiscount)
      allocated += share
      addRevenue(byCategory, item, lineTotal - share)
    })
  }

  return [...byCategory.entries()].sort((a, b) => b[1] - a[1]).map(([name, revenue]) => ({ name, revenue }))
}
