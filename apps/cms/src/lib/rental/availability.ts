import { sql } from '@payloadcms/db-postgres'
import type { PostgresAdapter } from '@payloadcms/db-postgres'
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

// Confirmed by live reproduction (docs/audits/2026-08-24-baseline.md,
// RENTAL-001): getAvailableRentalQuantity/getAvailableSaleQuantity below are
// a plain read with no row lock — under Postgres's default READ COMMITTED
// isolation, two concurrent bookings for the same product can both read
// "available" before either commits, both pass, and both succeed. Two
// genuinely concurrent `POST /api/orderItems` for a quantity-1 product both
// returned 201, oversold 2-for-1.
//
// pg_advisory_xact_lock serializes the check-then-write per product without
// needing SELECT ... FOR UPDATE on the products row (which would also
// contend with unrelated concurrent product edits, e.g. an admin changing
// price). It auto-releases the moment the current transaction commits or
// rolls back — no manual unlock, no risk of a forgotten release on an early
// throw, and critically it blocks a second concurrent request's own check
// until the first request's write has actually landed (or been abandoned),
// which a lock acquired-then-released before the hook returns would not:
// Payload's own write+commit for this operation happens *after*
// beforeValidate returns, so releasing before that point would still leave
// the exact race window open between "hook returned" and "transaction
// committed."
//
// Call this only from the write path (OrderItems.ts's beforeValidate) —
// never from the public, read-only availability-display endpoints
// (rentalAvailability(Bulk).ts). Those are just showing booked-out dates to
// a visitor; serializing a read against real bookings would only add
// contention with no correctness benefit.
//
// `sessions`/`drizzle` are real fields on PostgresAdapter (@payloadcms/
// db-postgres, a direct dependency) — the cast just asserts the concrete
// adapter type this app always uses, since `payload.db`'s own declared type
// doesn't carry it through automatically. This mirrors @payloadcms/drizzle's
// internal getTransaction() utility logic without importing an unexported
// path from a package that isn't even a direct dependency of this app.
export async function lockProductForBooking(req: PayloadRequest, productId: number): Promise<void> {
  const adapter = req.payload.db as unknown as PostgresAdapter
  const db = req.transactionID ? (adapter.sessions?.[String(await req.transactionID)]?.db ?? adapter.drizzle) : adapter.drizzle
  await db.execute(sql`SELECT pg_advisory_xact_lock(${productId})`)
}

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
