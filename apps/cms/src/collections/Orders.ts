import { randomBytes } from 'crypto'
import type { CollectionConfig } from 'payload'
import { submitOrder, SubmitOrderError } from '../lib/rental/submitOrder'
import { secretsMatch } from '../lib/security/timingSafe'

export const Orders: CollectionConfig = {
  slug: 'orders',
  access: {
    // Public checkout creates its own order shell (then attaches orderItems
    // to it) — but reading/updating/deleting orders is admin-only, since
    // customerName/Email/Phone live here. Without this, any visitor could
    // list every customer's contact details over the public REST API.
    // The /:id/submit endpoint below still works for anonymous checkout —
    // custom endpoints aren't gated by collection access — but requires the
    // caller to present this order's submitToken (see below), so it can't be
    // force-submitted by a third party guessing/enumerating sequential ids.
    create: () => true,
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
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
      admin: {
        components: {
          Cell: '/src/components/admin/OrderStatusCell#OrderStatusCell',
        },
      },
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
      admin: {
        defaultColumns: ['product', 'listingType', 'quantity', 'startDate', 'endDate', 'lineTotal'],
      },
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
    {
      // Generated on create (see hooks below), returned to the anonymous
      // client as part of the create response, and required by /:id/submit.
      // Without this, order ids being small sequential integers would let
      // anyone force-submit (МойСклад push + Telegram notify) any order —
      // including ones still being built by their actual customer — just by
      // guessing/enumerating ids.
      name: 'submitToken',
      type: 'text',
      admin: { hidden: true },
    },
  ],
  hooks: {
    beforeChange: [
      ({ operation, data }) => {
        if (operation === 'create') data.submitToken = randomBytes(24).toString('hex')
        return data
      },
    ],
  },
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

        // The submitToken check is specific to this HTTP boundary (stops a
        // third party from force-submitting an order by guessing/enumerating
        // sequential ids) — it's not part of submitOrder()'s own business
        // logic, so it stays here rather than moving into the shared
        // function the checkout Server Action also calls (that action only
        // ever submits the order it just created in the same request, with
        // no separate HTTP boundary to protect).
        if (!req.user) {
          const order = await req.payload.findByID({ collection: 'orders', id: orderId, req, overrideAccess: true })
          if (!order) {
            return Response.json({ error: 'Order not found' }, { status: 404 })
          }
          const body = await req.json?.().catch(() => null)
          const providedToken = body?.submitToken
          if (!secretsMatch(providedToken, order.submitToken || '')) {
            return Response.json({ error: 'Invalid or missing submitToken' }, { status: 403 })
          }
        }

        try {
          const result = await submitOrder(req.payload, orderId, req)
          return Response.json(result)
        } catch (error) {
          if (error instanceof SubmitOrderError) {
            return Response.json({ error: error.message }, { status: error.status })
          }
          throw error
        }
      },
    },
  ],
}
