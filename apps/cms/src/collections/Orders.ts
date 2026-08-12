import type { CollectionConfig } from 'payload'
import { pushOrderToMoySklad } from '../lib/moysklad/orders'
import { sendOrderNotification } from '../lib/telegram/notify'

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'customerName',
    defaultColumns: ['customerName', 'status', 'totalPrice', 'createdAt'],
  },
  fields: [
    {
      name: 'customerName',
      type: 'text',
      required: true,
    },
    {
      name: 'customerEmail',
      type: 'email',
      required: true,
    },
    {
      name: 'customerPhone',
      type: 'text',
      required: true,
    },
    {
      // Single source of truth for status — line items (orderItems) don't
      // carry their own status. The old app had per-line-item status that
      // could drift out of sync across an order's rows, needing a dedicated
      // repair utility (analyzeAndFixOrderStatuses); putting status only
      // here removes that failure mode structurally.
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Completed', value: 'completed' },
      ],
    },
    {
      name: 'totalPrice',
      type: 'number',
      defaultValue: 0,
      admin: {
        readOnly: true,
        description: 'Sum of this order\'s line items\' lineTotal — kept in sync by an orderItems hook, never set directly.',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
    },
    {
      // Shows this order's line items inline on its edit page — the
      // "grouped order" view the old app needed a bespoke
      // GroupedBookingRow/BookingDetailsTable component tree for. Editing
      // an item's dates/quantity here goes through the same beforeValidate
      // hook as the API (price recalculation, availability check), so the
      // admin UI can't drift from what the storefront enforces.
      name: 'items',
      type: 'join',
      collection: 'orderItems',
      on: 'order',
      defaultColumns: ['product', 'listingType', 'quantity', 'startDate', 'endDate', 'lineTotal'],
    },
    // Outbound sync bookkeeping (Phase 1, task 7): set once this order has
    // been pushed to МойСклад as a corresponding customerorder document,
    // via the /submit endpoint below.
    {
      name: 'moySkladOrderId',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'submittedAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Set once /submit has run (pushed to МойСклад + notified) — a checkout only submits once.',
      },
    },
  ],
  endpoints: [
    {
      // Deliberately a separate, explicit action rather than an afterChange
      // hook on order creation — orders are created empty and their line
      // items (orderItems) get added afterward by the storefront checkout
      // flow, so "order created" fires before there's anything to push or
      // notify about. Mirrors the old app's Checkout.tsx, which also only
      // sent its notification once all bookings for the cart existed.
      path: '/:id/submit',
      method: 'post',
      handler: async (req) => {
        const orderId = Number(req.routeParams?.id)

        const order = await req.payload.findByID({ collection: 'orders', id: orderId, req })
        if (!order) {
          return Response.json({ error: 'Order not found' }, { status: 404 })
        }
        if (order.submittedAt) {
          return Response.json({ error: 'Order already submitted' }, { status: 409 })
        }

        const itemsResult = await req.payload.find({
          collection: 'orderItems',
          where: { order: { equals: orderId } },
          limit: 0,
          depth: 1,
          req,
        })
        if (itemsResult.docs.length === 0) {
          return Response.json({ error: 'Order has no items' }, { status: 400 })
        }

        const items = itemsResult.docs as any[]

        let moySkladOrderId: string | null = null
        let moySkladError: string | null = null
        try {
          const pushed = await pushOrderToMoySklad({
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            customerPhone: order.customerPhone,
            notes: order.notes || undefined,
            items: items.map((item) => ({
              moySkladId: item.product.moySkladId,
              listingType: item.listingType,
              quantity: item.quantity,
              unitPrice: item.product.price,
            })),
          })
          moySkladOrderId = pushed.id
        } catch (error) {
          // Don't let a МойСклад outage block checkout — log and continue;
          // moySkladOrderId stays null so this is visible/reconcilable later.
          moySkladError = error instanceof Error ? error.message : 'Unknown error'
          req.payload.logger.error({ err: error, orderId }, 'Failed to push order to МойСклад')
        }

        const notification = await sendOrderNotification({
          orderId,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone,
          totalPrice: order.totalPrice,
          items: items.map((item) => ({
            title: item.product.title,
            quantity: item.quantity,
            listingType: item.listingType,
            startDate: item.startDate,
            endDate: item.endDate,
            lineTotal: item.lineTotal,
          })),
        })

        await req.payload.update({
          collection: 'orders',
          id: orderId,
          data: {
            moySkladOrderId: moySkladOrderId ?? undefined,
            submittedAt: new Date().toISOString(),
          },
          req,
        })

        return Response.json({
          success: true,
          moySkladOrderId,
          moySkladError,
          notificationSent: notification.success,
        })
      },
    },
  ],
}
