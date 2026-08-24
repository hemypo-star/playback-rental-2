import { getPayload } from 'payload'
import config from '@payload-config'

// Ported near-verbatim from apps/cms/src/endpoints/admin/analytics.ts
// (docs/PLAN-next-migration.md Stage 3.5, page group 4) — revenue by
// category, computed live from order items on non-cancelled orders. No
// invented figures.
export interface AdminAnalyticsRow {
  name: string
  revenue: number
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

  const byCategory = new Map<string, number>()
  for (const item of items.docs) {
    const category = typeof item.product === 'object' ? item.product?.category : undefined
    const name = typeof category === 'object' && category ? category.name : 'Без категории'
    byCategory.set(name, (byCategory.get(name) ?? 0) + (item.lineTotal || 0))
  }

  return [...byCategory.entries()].sort((a, b) => b[1] - a[1]).map(([name, revenue]) => ({ name, revenue }))
}
