import type { Endpoint } from 'payload'
import { getBookedQuantities } from '../lib/rental/bookedQuantity'
import { cartLineAvailability, type CartLine } from '../lib/rental/kitStock'
import { loadRentalLoad, loadStock } from '../lib/rental/rentalLoad'

const MAX_CART_LINES = 100

// `items=12:1,5:2` (productId:quantity, in cart order) asks for one cart's
// availability: each line sees what the lines before it take, kits included,
// exactly as checkout will book them (kitStock.ts cartLineAvailability).
function parseCartItems(raw: string | null): CartLine[] | null {
  if (!raw) return null
  const lines: CartLine[] = []
  for (const part of raw.split(',').slice(0, MAX_CART_LINES)) {
    const [id, qty] = part.split(':').map((s) => Number(s.trim()))
    if (Number.isInteger(id) && id > 0 && Number.isInteger(qty) && qty > 0) lines.push({ productId: id, quantity: qty })
  }
  return lines.length > 0 ? lines : null
}

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

    const cart = parseCartItems(url.searchParams.get('items'))
    const start = startParam ? new Date(startParam) : undefined
    const end = endParam ? new Date(endParam) : undefined
    if (cart && start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const window = { start: start.getTime(), end: end.getTime() }
      const lineIds = [...new Set(cart.map((l) => l.productId))]
      const stock = await loadStock(req.payload, lineIds, req)
      const componentIds = [...stock.values()].flatMap((s) => [...s.composition.keys()]).filter((id) => !stock.has(id))
      for (const [id, s] of await loadStock(req.payload, componentIds, req)) stock.set(id, s)
      const load = await loadRentalLoad(req.payload, { window, req })
      const free = cartLineAvailability(cart, stock, load, window)
      const available: Record<number, number> = {}
      cart.forEach((line, i) => {
        available[line.productId] = free[i]
      })
      return Response.json({ available })
    }

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
