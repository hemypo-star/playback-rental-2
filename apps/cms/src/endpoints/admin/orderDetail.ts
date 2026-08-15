import type { Endpoint } from 'payload'

// Single-order detail for the /admin/orders/[id] edit page (Step 5, order
// operations) — the list endpoint (orders.ts) only carries a items summary
// string, this carries full line items (with product title/id) for
// per-item quantity/date editing. Actual mutations (status/notes/items)
// happen via Payload's own REST endpoints directly from the browser
// (PATCH /api/orders/:id, PATCH/DELETE /api/orderItems/:id) — same-origin
// browser fetches carry the session cookie natively, so they don't need the
// Authorization: JWT workaround SSR reads require. This endpoint is
// read-only.
export const adminOrderDetailEndpoint: Endpoint = {
  path: '/admin/orders/:id',
  method: 'get',
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orderId = Number(req.routeParams?.id)
    if (!Number.isFinite(orderId)) {
      return Response.json({ error: 'Invalid order id' }, { status: 400 })
    }

    const order = await req.payload.findByID({ collection: 'orders', id: orderId, depth: 0, req })
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 })
    }

    const items = await req.payload.find({
      collection: 'orderItems',
      where: { order: { equals: orderId } },
      sort: 'id',
      limit: 0,
      depth: 1,
      req,
    })

    return Response.json({
      order,
      items: items.docs.map((item: any) => ({
        id: item.id,
        product: { id: item.product?.id, title: item.product?.title },
        listingType: item.listingType,
        quantity: item.quantity,
        startDate: item.startDate,
        endDate: item.endDate,
        lineTotal: item.lineTotal,
      })),
    })
  },
}
