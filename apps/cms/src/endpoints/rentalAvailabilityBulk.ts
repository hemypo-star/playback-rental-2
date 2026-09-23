import type { Endpoint } from 'payload'
import { getBookedQuantities } from '../lib/rental/bookedQuantity'

// Bulk counterpart to rentalAvailability.ts's single-product endpoint — the
// catalog's per-card availability badges need live availability for a whole
// page of products at once; doing that via N calls to the single endpoint
// would be an N+1 request storm, so this computes all of them from the same
// two queries (active orders, then their items across the requested products)
// instead of one query per product.
//
// The booked-quantity half of that now lives in lib/rental/bookedQuantity.ts,
// shared with the catalog's server-side "Только свободные" filter — see that
// file for why the two must not have separate copies of the predicate.
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

    const bookedByProduct = await getBookedQuantities(req.payload, {
      productIds,
      start: startParam ? new Date(startParam) : undefined,
      end: endParam ? new Date(endParam) : undefined,
      req,
    })

    const result: Record<number, number> = {}
    for (const product of products.docs) {
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
