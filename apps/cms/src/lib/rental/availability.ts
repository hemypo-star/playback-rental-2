import type { PayloadRequest } from 'payload'

// Ported from the old app's src/utils/availabilityUtils.ts. Status lives only
// on the parent `orders` record in this rewrite (not duplicated onto every
// line item like the old `bookings.status` column was) — the old system
// needed a dedicated "analyzeAndFixOrderStatuses" repair utility specifically
// because per-line-item status could drift out of sync with its siblings.
// That whole class of bug doesn't exist here: status has exactly one home.
//
// Every call here takes `req` (not just `payload`) and threads it through to
// every local-API call, so these participate in the caller's transaction —
// omitting it caused a real bug in Phase 1 testing (a just-created sibling
// row wasn't visible to a query made without `req`, since it ran on a
// separate DB connection outside the parent operation's transaction).
const ACTIVE_STATUSES = ['pending', 'confirmed']

async function activeOrderIds(req: PayloadRequest): Promise<number[]> {
  const orders = await req.payload.find({
    collection: 'orders',
    where: { status: { in: ACTIVE_STATUSES } },
    limit: 0, // 0 = no limit in Payload's find
    depth: 0,
    req,
  })
  return orders.docs.map((o) => o.id as number)
}

/**
 * Available quantity for a rental product over a date range (or total
 * quantity if no range given). Excludes a specific order item (used when
 * re-checking availability while editing an existing booking's own dates).
 */
export async function getAvailableRentalQuantity(
  req: PayloadRequest,
  productId: number,
  startDate?: Date,
  endDate?: Date,
  excludeOrderItemId?: number,
): Promise<number> {
  const product = await req.payload.findByID({ collection: 'products', id: productId, req })
  if (!product || !product.available) return 0
  if (!startDate || !endDate) return product.quantity

  const orderIds = await activeOrderIds(req)
  if (orderIds.length === 0) return product.quantity

  const overlapping = await req.payload.find({
    collection: 'orderItems',
    where: {
      and: [
        { product: { equals: productId } },
        { order: { in: orderIds } },
        { startDate: { less_than: endDate.toISOString() } },
        { endDate: { greater_than: startDate.toISOString() } },
        ...(excludeOrderItemId ? [{ id: { not_equals: excludeOrderItemId } }] : []),
      ],
    },
    limit: 0,
    depth: 0,
    req,
  })

  const bookedQty = overlapping.docs.reduce((sum, item) => sum + (item.quantity || 1), 0)
  return Math.max(0, product.quantity - bookedQty)
}

export async function isRentalQuantityAvailable(
  req: PayloadRequest,
  productId: number,
  requestedQuantity: number,
  startDate?: Date,
  endDate?: Date,
  excludeOrderItemId?: number,
): Promise<boolean> {
  const available = await getAvailableRentalQuantity(
    req,
    productId,
    startDate,
    endDate,
    excludeOrderItemId,
  )
  return available >= requestedQuantity
}

/**
 * Available quantity for a sale product: total stock minus quantity already
 * committed to non-cancelled orders (no date dimension — ownership transfers
 * on sale, unlike rental).
 */
export async function getAvailableSaleQuantity(
  req: PayloadRequest,
  productId: number,
  excludeOrderItemId?: number,
): Promise<number> {
  const product = await req.payload.findByID({ collection: 'products', id: productId, req })
  if (!product || !product.available) return 0

  const orderIds = await activeOrderIds(req)
  if (orderIds.length === 0) return product.quantity

  const sold = await req.payload.find({
    collection: 'orderItems',
    where: {
      and: [
        { product: { equals: productId } },
        { order: { in: orderIds } },
        ...(excludeOrderItemId ? [{ id: { not_equals: excludeOrderItemId } }] : []),
      ],
    },
    limit: 0,
    depth: 0,
    req,
  })

  const soldQty = sold.docs.reduce((sum, item) => sum + (item.quantity || 1), 0)
  return Math.max(0, product.quantity - soldQty)
}
