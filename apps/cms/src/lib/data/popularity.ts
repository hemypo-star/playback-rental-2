import { getPayload } from 'payload'
import config from '@payload-config'
import type { OrderItem } from '../../payload-types'

// Per-product order statistics, computed live from orders/orderItems — no
// denormalized counters on the Products collection (they would need a hook
// on every order-status transition and could drift; the dataset here is a
// rental park of hundreds of items over thousands of lines, small enough to
// aggregate in one pass). Shared by:
//  - the storefront "Популярные позиции" block (PrototypeHome) — sort by
//    timesOrdered instead of the old proxy (-lastSyncedAt);
//  - the admin analytics screen ("Топ позиций");
//  - the product page sidebar stats card.
//
// Counting rules (agreed with the owner):
//  - a product's timesOrdered = number of DISTINCT non-cancelled orders
//    containing it (multiple lines/qty of the same item in one order count
//    once — "how many times this was ordered", not "how many units");
//  - revenueDays sums calendar days between startDate/endDate × quantity
//    for rental lines only (sale lines have no dates — see OrderItems.ts);
//  - revenue is GROSS lineTotal. Unlike analytics.ts's category report this
//    table has no promo-discount pro-rating: per-line discounts are not
//    stored anywhere, so any split across lines would be invented. The
//    numbers answer "which positions drive demand", not accounting.

export interface ProductOrderStats {
  timesOrdered: number
  unitsOrdered: number
  revenueDays: number
  revenue: number
}

const EMPTY_STATS: ProductOrderStats = { timesOrdered: 0, unitsOrdered: 0, revenueDays: 0, revenue: 0 }

function toId(value: number | { id: number } | null | undefined): number | null {
  if (value === null || value === undefined) return null
  return typeof value === 'object' ? value.id : value
}

// Calendar-day length of a rental line, floored at 1 (a same-day pickup and
// return still occupies the gear for one shift). Mirrors pricing.ts's
// differenceInCalendarDays convention used when lineTotal is computed.
function rentalDays(start: string | null | undefined, end: string | null | undefined): number {
  if (!start || !end) return 0
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  if (!Number.isFinite(s) || !Number.isFinite(e)) return 0
  const days = Math.round((e - s) / 86_400_000)
  return days > 0 ? days : 1
}

export async function getProductOrderStats(): Promise<Map<number, ProductOrderStats>> {
  const payload = await getPayload({ config })

  // Period is defined at the ORDER level (same rule as analytics.ts backlog
  // item 14), and cancelled orders never counted toward KPI/revenue anyway.
  const orders = await payload.find({
    collection: 'orders',
    where: { status: { not_equals: 'cancelled' } },
    limit: 0,
    depth: 0,
    select: {},
  })
  const orderIds = orders.docs.map((o) => o.id)

  const result = new Map<number, ProductOrderStats>()
  if (orderIds.length === 0) return result

  const items = await payload.find({
    collection: 'orderItems',
    where: { order: { in: orderIds.join(',') } },
    limit: 0,
    depth: 0,
    // select intentionally omitted: with the products collection's field
    // level not narrowed, a partial select here would type item.product as
    // number|null and break the toId() narrowing below. The seven columns
    // this loop reads are all we touch anyway.
  })

  // Dedupe "product appears in order" across multiple lines of the same
  // product inside one order (possible via the admin UI — nothing prevents
  // two lines for the same item).
  const seenOrderPerProduct = new Set<string>()

  for (const item of items.docs as OrderItem[]) {
    const productId = toId(item.product as number | { id: number })
    const orderId = toId(item.order as number | { id: number })
    if (!productId || !orderId) continue

    let stats = result.get(productId)
    if (!stats) {
      stats = { ...EMPTY_STATS }
      result.set(productId, stats)
    }

    const key = `${orderId}:${productId}`
    if (!seenOrderPerProduct.has(key)) {
      seenOrderPerProduct.add(key)
      stats.timesOrdered += 1
    }

    const quantity = item.quantity || 1
    stats.unitsOrdered += quantity
    stats.revenue += item.lineTotal || 0
    if (item.listingType === 'rental') {
      stats.revenueDays += rentalDays(item.startDate, item.endDate) * quantity
    }
  }

  return result
}
