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
      // Every availability check (lib/rental/availability.ts's
      // activeOrderIds()) filters on this to find active orders — confirmed
      // absent, flagged as PERF-004 in docs/audits/2026-08-24-baseline.md.
      index: true,
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
      // Set once at checkout (order creation), never changed afterward —
      // orders are admin-only to update, so a public client has no way to
      // attach a code after the fact anyway. The discount itself is applied
      // at the order level by OrderItems.ts's recalcOrderTotal, not per
      // line (see that file's own comment for why a fixed-amount discount
      // can't be prorated per line) — this is just the record of which
      // code (if any) this order used. readOnly, not just documented as
      // such: changing it here wouldn't retroactively recompute
      // totalPrice/promoDiscount anyway (that only happens when an
      // orderItem is created/updated/deleted), so editing it in place
      // would be misleading rather than harmless.
      name: 'promoCode',
      type: 'text',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Промокод, применённый при оформлении (если был).',
      },
    },
    {
      // Review finding A (fix round on claude/promo-codes): a SNAPSHOT of
      // the promo's terms at the moment this order was created, not a live
      // pointer back to the promoCodes table. Written once, alongside
      // promoCode, by the checkout Server Action — from the exact same
      // server-resolved promo object that produced promoCode, so there is
      // no second lookup to disagree with the first. recalcOrderTotal
      // (OrderItems.ts) reads ONLY these two snapshot fields — never
      // resolveActivePromoCode() — specifically so that deactivating,
      // deleting, or editing a promo code afterward cannot retroactively
      // reprice an order that already used it. A code's current state
      // governs new orders only.
      name: 'promoDiscountType',
      type: 'select',
      options: [
        { label: 'Процент', value: 'percent' },
        { label: 'Фиксированная сумма (₽)', value: 'fixed' },
      ],
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Тип скидки на момент оформления заказа (снимок, не меняется при редактировании промокода).',
      },
    },
    {
      // The promo's discountValue at the moment of checkout — again a
      // snapshot, not re-read from promoCodes. Paired with
      // promoDiscountType above; recalcOrderTotal applies the same
      // percent/fixed math OrderItems.ts always did, just against these
      // frozen terms instead of a live lookup.
      name: 'promoDiscountValue',
      type: 'number',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Значение скидки на момент оформления заказа (снимок, не меняется при редактировании промокода).',
      },
    },
    {
      // Backlog item 5 follow-up (docs/ROADMAP-2.0.md, minimum order
      // threshold). A SNAPSHOT, same reasoning and same review finding A as
      // promoDiscountType/promoDiscountValue above: written once at
      // checkout from the same server-resolved promo object, never
      // re-read from promoCodes. recalcOrderTotal (OrderItems.ts) reads
      // only this column — never PromoCodes.minOrderAmount directly — so
      // an operator raising or lowering a code's threshold afterward
      // cannot retroactively change whether an already-placed order
      // qualifies for its discount.
      name: 'promoMinOrderAmount',
      type: 'number',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description:
          'Минимальная сумма заказа для скидки на момент оформления (снимок). Пусто или 0 — без ограничения.',
      },
    },
    {
      // Roubles actually deducted from the gross line-item total —
      // recomputed by recalcOrderTotal every time a sibling orderItem
      // changes, never set directly. Kept alongside promoCode so the admin
      // order view can show "скидка N ₽" without re-resolving the promo
      // code and re-deriving the math themselves.
      name: 'promoDiscount',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Скидка, фактически применённая к заказу (₽) — считается автоматически.',
      },
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
