import type { Endpoint } from 'payload'

const ACTIVE_STATUSES = ['pending', 'confirmed']

// Bulk counterpart to rentalAvailability.ts's single-product endpoint — the
// catalog's "Только свободные" toggle needs per-card live availability for a
// whole page of products at once; doing that via N calls to the single
// endpoint would be an N+1 request storm, so this computes all of them from
// two queries (active orders, then their items across the requested products)
// instead of one query per product.
export const rentalAvailabilityBulkEndpoint: Endpoint = {
  path: '/rental-availability-bulk',
  method: 'get',
  handler: async (req) => {
    const url = new URL(req.url || '', 'http://localhost')
    const idsParam = url.searchParams.get('productIds')
    const startParam = url.searchParams.get('start')
    const endParam = url.searchParams.get('end')

    const productIds = (idsParam || '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n) && n > 0)

    if (productIds.length === 0) {
      return Response.json({ error: 'productIds is required' }, { status: 400 })
    }

    const products = await req.payload.find({
      collection: 'products',
      where: { id: { in: productIds } },
      limit: 0,
      depth: 0,
      req,
    })

    const orders = await req.payload.find({
      collection: 'orders',
      where: { status: { in: ACTIVE_STATUSES } },
      limit: 0,
      depth: 0,
      overrideAccess: true,
    })
    const orderIds = orders.docs.map((o) => o.id as number)

    const start = startParam ? new Date(startParam) : undefined
    const end = endParam ? new Date(endParam) : undefined

    // Matches getAvailableRentalQuantity (the single-product authority, lib/
    // rental/availability.ts): with no date range there's nothing to check
    // overlap against, so availability is just raw stock — not stock minus
    // every booking ever made regardless of when it falls.
    const bookedByProduct = new Map<number, number>()
    if (orderIds.length > 0 && start && end) {
      const where: any = {
        and: [
          { product: { in: productIds } },
          { order: { in: orderIds } },
          // Sale items never have startDate/endDate set (unused for sale,
          // per OrderItems.ts) — scope the date-overlap filter to rental
          // items only, or a null date fails the comparison and silently
          // drops sale items out of the booked-quantity count.
          {
            or: [
              { listingType: { equals: 'sale' } },
              {
                and: [
                  { startDate: { less_than: end.toISOString() } },
                  { endDate: { greater_than: start.toISOString() } },
                ],
              },
            ],
          },
        ],
      }

      const items = await req.payload.find({
        collection: 'orderItems',
        where,
        limit: 0,
        depth: 0,
        req,
      })
      for (const item of items.docs as any[]) {
        const productId = typeof item.product === 'object' ? item.product.id : item.product
        bookedByProduct.set(productId, (bookedByProduct.get(productId) || 0) + (item.quantity || 0))
      }
    }

    const result: Record<number, number> = {}
    for (const product of products.docs as any[]) {
      if (!product.available) {
        result[product.id] = 0
        continue
      }
      const booked = bookedByProduct.get(product.id) || 0
      result[product.id] = Math.max(0, product.quantity - booked)
    }

    return Response.json({ available: result })
  },
}
