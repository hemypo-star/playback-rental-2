import { getPayload } from 'payload'
import config from '@payload-config'
import type { Product } from '../../../payload-types'
import { getProductOrderStats, type ProductOrderStats } from '../../data/popularity'

// "Топ позиций" — per-product demand for the admin analytics screen. Same
// counting rules as lib/data/popularity.ts (distinct non-cancelled orders;
// rental days = calendar days × qty); this module only adds the product
// join + ranking. Date-range filtering happens at the ORDER level via
// AnalyticsDateRange, so a line counts only if its order was created inside
// the period (backlog item 14's rule, shared with analytics.ts).
import type { Where } from 'payload'
import type { AnalyticsDateRange } from '../analyticsDateRange'

export interface TopProductRow extends ProductOrderStats {
  id: number
  title: string
  listingType: string
}

export async function getTopProducts(range: AnalyticsDateRange = {}, limit = 15): Promise<TopProductRow[]> {
  const payload = await getPayload({ config })

  const orderConditions: Where[] = [{ status: { not_equals: 'cancelled' } }]
  if (range.fromIso) orderConditions.push({ createdAt: { greater_than_equal: range.fromIso } })
  if (range.toExclusiveIso) orderConditions.push({ createdAt: { less_than: range.toExclusiveIso } })

  const orders = await payload.find({
    collection: 'orders',
    where: orderConditions.length === 1 ? orderConditions[0] : { and: orderConditions },
    limit: 0,
    depth: 0,
    select: {},
  })
  const orderIds = orders.docs.map((o) => o.id)
  if (orderIds.length === 0) return []

  const items = await payload.find({
    collection: 'orderItems',
    where: { order: { in: orderIds.join(',') } },
    limit: 0,
    depth: 0,
  })

  const stats = new Map<number, ProductOrderStats>()
  const seenOrderPerProduct = new Set<string>()
  for (const item of items.docs) {
    const productId = typeof item.product === 'object' && item.product !== null ? item.product.id : (item.product as number | null)
    const orderId = typeof item.order === 'object' && item.order !== null ? item.order.id : (item.order as number | null)
    if (!productId || !orderId) continue
    let row = stats.get(productId)
    if (!row) {
      row = { timesOrdered: 0, unitsOrdered: 0, revenueDays: 0, revenue: 0 }
      stats.set(productId, row)
    }
    const key = `${orderId}:${productId}`
    if (!seenOrderPerProduct.has(key)) {
      seenOrderPerProduct.add(key)
      row.timesOrdered += 1
    }
    const quantity = item.quantity || 1
    row.unitsOrdered += quantity
    row.revenue += item.lineTotal || 0
    if (item.listingType === 'rental' && item.startDate && item.endDate) {
      const days = Math.round((new Date(item.endDate).getTime() - new Date(item.startDate).getTime()) / 86_400_000)
      row.revenueDays += (days > 0 ? days : 1) * quantity
    }
  }

  const ranked = [...stats.entries()].sort((a, b) => b[1].timesOrdered - a[1].timesOrdered || b[1].revenue - a[1].revenue).slice(0, limit)
  if (ranked.length === 0) return []

  // Titles are read here rather than passed through from orderItems because
  // depth:0 gives ids only; deleted products drop out of the join and thus
  // out of the table (their history would be unlabelable anyway).
  const products = await payload.find({
    collection: 'products',
    where: { id: { in: ranked.map(([id]) => id).join(',') } },
    limit: ranked.length,
    depth: 0,
    pagination: false,
  })
  const byId = new Map((products.docs as Product[]).map((p) => [p.id, p]))
  return ranked
    .filter(([id]) => byId.has(id))
    .map(([id, s]) => ({
      id,
      title: byId.get(id)!.title,
      listingType: String(byId.get(id)!.listingType ?? ''),
      ...s,
    }))
}
