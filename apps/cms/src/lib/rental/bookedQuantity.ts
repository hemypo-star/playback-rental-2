import type { Payload, PayloadRequest, Where } from 'payload'
import { kitFreeQuantity, peakLoad } from './kitStock'
import { ACTIVE_ORDER_STATUSES, activeOrderIds, loadAllKitIds, loadRentalLoad, loadStock } from './rentalLoad'

// How much of each product is already committed over a date window.
//
// Extracted from endpoints/rentalAvailabilityBulk.ts, which had the only copy
// of this predicate. It now has two callers that must agree exactly: that
// endpoint (per-card "Доступно: N" badges on the catalog) and the catalog's
// own server-side "Только свободные" filter. If the two computed booked
// quantity differently, a card could be listed by the filter and then render
// a badge saying it is booked out, or be dropped from a page whose badge said
// it was free — so they share one implementation rather than two predicates
// that look alike today.
export { ACTIVE_ORDER_STATUSES }

export interface BookedQuantityParams {
  /** Restrict to these products. Omit to count bookings across all of them. */
  productIds?: number[]
  start?: Date
  end?: Date
  /** Passed through so a caller inside a transaction sees its own writes. */
  req?: PayloadRequest
}

export async function getBookedQuantities(payload: Payload, params: BookedQuantityParams): Promise<Map<number, number>> {
  const booked = new Map<number, number>()
  // Matches getAvailableRentalQuantity (the single-product authority, lib/
  // rental/availability.ts): with no date range there's nothing to check
  // overlap against, so availability is just raw stock — not stock minus
  // every booking ever made regardless of when it falls.
  // An unparseable ?start=/?end= reaches here as an Invalid Date, whose
  // toISOString() throws — treat it as "no window given" rather than a 500.
  if (!params.start || !params.end) return booked
  if (Number.isNaN(params.start.getTime()) || Number.isNaN(params.end.getTime())) return booked
  if (params.productIds && params.productIds.length === 0) return booked

  const orderIds = await activeOrderIds(payload)
  if (orderIds.length === 0) return booked

  // Sale items: no date dimension, every active order's quantity counts.
  const saleAnd: Where[] = [{ order: { in: orderIds } }, { listingType: { equals: 'sale' } }]
  if (params.productIds) saleAnd.push({ product: { in: params.productIds } })
  const saleItems = await payload.find({
    collection: 'orderItems',
    where: { and: saleAnd },
    limit: 0,
    depth: 0,
    overrideAccess: true,
    ...(params.req ? { req: params.req } : {}),
  })
  for (const item of saleItems.docs) {
    const productId = typeof item.product === 'object' ? item.product.id : item.product
    booked.set(productId, (booked.get(productId) || 0) + Math.max(0, item.quantity || 0))
  }

  // Rentals: shared kit/component stock and peak load over the window
  // (kitStock.ts), the same arithmetic the booking write path uses, so a
  // badge can't promise what checkout then refuses.
  const window = { start: params.start.getTime(), end: params.end.getTime() }
  const load = await loadRentalLoad(payload, { window, req: params.req })
  const loadedIds = [...new Set(load.map((b) => b.productId))]
  // A kit can be booked out without a booking of its own (its components
  // are), so kits are always considered: the requested ones, or every kit.
  const kitCandidates = params.productIds ?? (await loadAllKitIds(payload, params.req))
  const domain = [...new Set([...(params.productIds ?? loadedIds), ...kitCandidates])]
  const stock = await loadStock(payload, domain, params.req)
  const componentIds = [...stock.values()].flatMap((s) => [...s.composition.keys()])
  const componentStock = await loadStock(payload, componentIds.filter((id) => !stock.has(id)), params.req)
  for (const [id, s] of stock) componentStock.set(id, s)

  for (const [productId, s] of stock) {
    if (booked.has(productId)) continue // a sale product, counted above
    let used: number
    if (s.isKit) {
      const free = kitFreeQuantity({
        kitId: productId,
        kit: { quantity: s.quantity, available: s.available },
        composition: s.composition,
        components: componentStock,
        load,
        window,
      })
      used = s.quantity - free
    } else {
      used = peakLoad(load, productId, window)
    }
    if (used > 0) booked.set(productId, used)
  }
  return booked
}

// Products with nothing free over the window — the exclusion list the catalog's
// "Только свободные" filter hands to getProducts() as `id not_in`.
//
// Deliberately derived from the bookings rather than from the products: only a
// product with at least one overlapping active booking can possibly be fully
// booked, and that set is bounded by real bookings in one date window, not by
// catalog size. Filtering this way keeps the filter inside the SQL query, so
// payload.find()'s own totalDocs/totalPages still describe exactly what is on
// screen. The implementation on `2.0` instead hid unavailable cards with
// display:none after render, which left the server-rendered pager and the
// "N позиций" count describing a grid that was no longer there.
export async function getFullyBookedProductIds(payload: Payload, start: Date, end: Date): Promise<number[]> {
  const booked = await getBookedQuantities(payload, { start, end })
  if (booked.size === 0) return []
  const ids = [...booked.keys()]
  const products = await payload.find({
    collection: 'products',
    where: { id: { in: ids } },
    limit: 0,
    depth: 0,
    select: { quantity: true },
  })
  return products.docs.filter((p) => p.quantity - (booked.get(p.id) || 0) <= 0).map((p) => p.id)
}
