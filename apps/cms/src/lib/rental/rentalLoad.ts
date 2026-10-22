import type { Payload, PayloadRequest, Where } from 'payload'
import { expandKitBookings, kitComposition, type Booking, type KitComposition, type Range } from './kitStock'

// DB side of kitStock.ts: loads active rental bookings (kit bookings expanded
// onto their components) and product stock. Shared by the booking write path
// (availability.ts), the catalog badges/filter (bookedQuantity.ts) and the
// product calendar (endpoints/rentalAvailability.ts) so all three agree.

export const ACTIVE_ORDER_STATUSES = ['pending', 'confirmed']

export async function activeOrderIds(payload: Payload, req?: PayloadRequest): Promise<number[]> {
  const orders = await payload.find({
    collection: 'orders',
    where: { status: { in: ACTIVE_ORDER_STATUSES } },
    limit: 0,
    depth: 0,
    overrideAccess: true,
    ...(req ? { req } : {}),
  })
  return orders.docs.map((o) => o.id as number)
}

export interface RentalLoadParams {
  /** Only bookings overlapping this window. Without it: every booking not yet returned. */
  window?: Range
  /** Ignore this order item (re-checking an existing booking's own edit). */
  excludeOrderItemId?: number
  /** Passed through so a caller inside a transaction sees its own writes. */
  req?: PayloadRequest
}

export async function loadRentalLoad(payload: Payload, params: RentalLoadParams = {}): Promise<Booking[]> {
  const orderIds = await activeOrderIds(payload, params.req)
  if (orderIds.length === 0) return []

  const and: Where[] = [{ order: { in: orderIds } }, { listingType: { equals: 'rental' } }]
  if (params.window) {
    and.push({ startDate: { less_than: new Date(params.window.end).toISOString() } })
    and.push({ endDate: { greater_than: new Date(params.window.start).toISOString() } })
  } else {
    and.push({ endDate: { greater_than: new Date().toISOString() } })
  }
  if (params.excludeOrderItemId) and.push({ id: { not_equals: params.excludeOrderItemId } })

  const items = await payload.find({
    collection: 'orderItems',
    where: { and },
    limit: 0,
    depth: 0,
    overrideAccess: true,
    ...(params.req ? { req: params.req } : {}),
  })

  const bookings: Booking[] = []
  for (const item of items.docs) {
    if (!item.startDate || !item.endDate) continue
    bookings.push({
      productId: typeof item.product === 'object' ? item.product.id : item.product,
      quantity: Math.max(0, item.quantity || 0),
      start: new Date(item.startDate).getTime(),
      end: new Date(item.endDate).getTime(),
    })
  }
  if (bookings.length === 0) return bookings

  const kits = await loadKitCompositions(payload, [...new Set(bookings.map((b) => b.productId))], params.req)
  return expandKitBookings(bookings, kits)
}

export interface ProductStock {
  quantity: number
  available: boolean
  isKit: boolean
  composition: KitComposition
}

/** Stock, availability flag and (for kits) composition of the given products. */
export async function loadStock(payload: Payload, ids: number[], req?: PayloadRequest): Promise<Map<number, ProductStock>> {
  const stock = new Map<number, ProductStock>()
  if (ids.length === 0) return stock
  const products = await payload.find({
    collection: 'products',
    where: { id: { in: ids } },
    limit: 0,
    depth: 0,
    overrideAccess: true,
    select: { quantity: true, available: true, isKit: true, kitItems: true },
    ...(req ? { req } : {}),
  })
  for (const p of products.docs) {
    stock.set(p.id, {
      quantity: p.quantity ?? 0,
      available: Boolean(p.available),
      isKit: Boolean(p.isKit),
      composition: p.isKit ? kitComposition(p.kitItems) : new Map(),
    })
  }
  return stock
}

async function loadKitCompositions(payload: Payload, ids: number[], req?: PayloadRequest): Promise<Map<number, KitComposition>> {
  const kits = new Map<number, KitComposition>()
  for (const [id, s] of await loadStock(payload, ids, req)) {
    if (s.isKit) kits.set(id, s.composition)
  }
  return kits
}

/** Every kit product (few of them), for finding kits that contain a component. */
export async function loadAllKitIds(payload: Payload, req?: PayloadRequest): Promise<number[]> {
  const kits = await payload.find({
    collection: 'products',
    where: { isKit: { equals: true } },
    limit: 0,
    depth: 0,
    overrideAccess: true,
    select: {},
    ...(req ? { req } : {}),
  })
  return kits.docs.map((k) => k.id)
}
