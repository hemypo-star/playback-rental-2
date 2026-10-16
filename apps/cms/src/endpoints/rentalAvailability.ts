import type { Endpoint } from 'payload'
import { getAvailableRentalQuantity, getAvailableSaleQuantity } from '../lib/rental/availability'
import { kitComposition, kitSaturatedRanges, saturatedRanges, type Range } from '../lib/rental/kitStock'
import { loadRentalLoad, loadStock } from '../lib/rental/rentalLoad'

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

    // The calendar greys out any day a returned range touches, so return only
    // the stretches with no unit left — kit bookings counted against their
    // components (kitStock.ts). Returning every booking, as before, blocked a
    // day for a 3-unit product the moment one unit was booked.
    const load = await loadRentalLoad(req.payload, { req })
    let ranges: Range[]
    if (product.isKit) {
      const composition = kitComposition(product.kitItems)
      const components = await loadStock(req.payload, [...composition.keys()], req)
      ranges = kitSaturatedRanges({
        kitId: product.id,
        kit: { quantity: product.quantity, available: Boolean(product.available) },
        composition,
        components,
        load,
      })
    } else {
      ranges = saturatedRanges(load, product.id, product.available ? product.quantity : 0, 1)
    }
    const now = Date.now()
    const horizon = now + 400 * 24 * 60 * 60 * 1000
    const bookedRanges = ranges.map((r) => ({
      startDate: new Date(Number.isFinite(r.start) ? r.start : now).toISOString(),
      endDate: new Date(Number.isFinite(r.end) ? r.end : horizon).toISOString(),
      quantity: product.quantity,
    }))

    return Response.json({
      listingType: 'rental',
      quantity: product.quantity,
      available,
      bookedRanges,
    })
  },
}
