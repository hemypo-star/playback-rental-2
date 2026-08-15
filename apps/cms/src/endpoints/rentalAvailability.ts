import type { Endpoint } from 'payload'
import { getAvailableRentalQuantity, getAvailableSaleQuantity } from '../lib/rental/availability'

const ACTIVE_STATUSES = ['pending', 'confirmed']

// Public, PII-free counterpart to the admin-only `orders`/`orderItems` reads:
// the storefront needs to show "N available" and a booked-dates calendar to
// anonymous visitors, but orders carries customerName/Email/Phone so it can't
// be read directly over REST (see access control on Orders). This computes
// the same numbers the enforcement hook (lib/rental/availability.ts) uses,
// and — for the calendar — returns only start/end/quantity, never the order
// or customer behind a booking.
export const rentalAvailabilityEndpoint: Endpoint = {
  path: '/rental-availability',
  method: 'get',
  handler: async (req) => {
    const url = new URL(req.url || '', 'http://localhost')
    const productId = Number(url.searchParams.get('productId'))
    const startParam = url.searchParams.get('start')
    const endParam = url.searchParams.get('end')

    if (!productId) {
      return Response.json({ error: 'productId is required' }, { status: 400 })
    }

    const product = await req.payload.findByID({ collection: 'products', id: productId, req })
    if (!product) {
      return Response.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.listingType === 'sale') {
      const available = await getAvailableSaleQuantity(req, productId)
      return Response.json({ listingType: 'sale', quantity: product.quantity, available })
    }

    const start = startParam ? new Date(startParam) : undefined
    const end = endParam ? new Date(endParam) : undefined
    const available = await getAvailableRentalQuantity(req, productId, start, end)

    const orders = await req.payload.find({
      collection: 'orders',
      where: { status: { in: ACTIVE_STATUSES } },
      limit: 0,
      depth: 0,
      overrideAccess: true,
    })
    const orderIds = orders.docs.map((o) => o.id as number)

    let bookedRanges: { startDate: string; endDate: string; quantity: number }[] = []
    if (orderIds.length > 0) {
      const items = await req.payload.find({
        collection: 'orderItems',
        where: { and: [{ product: { equals: productId } }, { order: { in: orderIds } }] },
        limit: 0,
        depth: 0,
        req,
      })
      bookedRanges = items.docs.map((item: any) => ({
        startDate: item.startDate,
        endDate: item.endDate,
        quantity: item.quantity,
      }))
    }

    return Response.json({
      listingType: 'rental',
      quantity: product.quantity,
      available,
      bookedRanges,
    })
  },
}
