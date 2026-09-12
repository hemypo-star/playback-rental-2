import type { CollectionConfig, PayloadRequest } from 'payload'
import { APIError } from 'payload'
import { differenceInCalendarDays } from 'date-fns'
import { calculateLineTotal } from '../lib/rental/pricing'
import { getAvailableRentalQuantity, getAvailableSaleQuantity, lockProductForBooking } from '../lib/rental/availability'
import { resolveActivePromoCode } from '../lib/promo/promoCodes'

// Hooks receive relationship fields populated to Payload's default depth
// (an object), not a plain id — normalize before using it as a query value
// or an update target, or the DB driver chokes trying to coerce an object.
function toId(value: unknown): number {
  return typeof value === 'object' && value !== null ? ((value as { id: number }).id) : (value as number)
}

// Must pass `req` through on every local-API call made from inside a hook —
// omitting it starts a separate DB connection outside the parent operation's
// transaction, so a just-created/updated sibling row isn't visible yet and
// the update silently computes against stale data (caught in Phase 1 testing:
// totalPrice stayed 0 after creating a line item, even though the item's own
// lineTotal was correct).
// Promo-code discount (backlog item 5, docs/ROADMAP-2.0.md) is applied
// HERE, at the order level — not in OrderItems' beforeValidate hook, where
// commit ffbcf40's percent-only version applied it per line. That worked
// for a percentage by coincidence of the maths (applying X% per line and
// summing equals applying X% to the sum), but the owner's actual
// requirement is percent OR a fixed rouble amount, and a fixed amount does
// not decompose into lines: any pro-rata share computed inside
// beforeValidate would be computed against an incomplete order (line 1
// saves before line 2 exists), so it would be wrong for every multi-line
// order. recalcOrderTotal already owns orders.totalPrice and already loads
// every sibling line, so it's the one place the real gross total exists —
// extending it is not a violation of "pricing math lives in exactly one
// place," it's that same rule pointing at the collection that was already
// the right owner. lineTotal itself stays GROSS (undiscounted) and keeps
// meaning "the real price of this line" — the discount only ever shows up
// in orders.totalPrice/promoDiscount, never in an individual line.
async function recalcOrderTotal(req: PayloadRequest, orderRef: unknown): Promise<void> {
  const orderId = toId(orderRef)
  const [siblings, order] = await Promise.all([
    req.payload.find({
      collection: 'orderItems',
      where: { order: { equals: orderId } },
      limit: 0,
      depth: 0,
      req,
    }),
    // depth: 0 — only need the raw promoCode string, not a populated
    // relationship. disableErrors: an order can theoretically be deleted
    // out from under a still-in-flight sibling-item hook (e.g. an admin
    // deleting the order while its own afterDelete cascade is still
    // running) — treat that as "no order to discount" rather than throwing.
    req.payload.findByID({ collection: 'orders', id: orderId, depth: 0, req, disableErrors: true }),
  ])
  const gross = siblings.docs.reduce((sum, item: { lineTotal?: number | null }) => sum + (item.lineTotal || 0), 0)

  // Re-resolved server-side on every recalc — never trusted from a stored
  // "discount already computed" value — so an order's discount always
  // reflects the promo code's *current* state (still active, not expired)
  // and the order's *current* gross (a later admin edit to quantity/dates
  // reapplies against the new gross, not a stale one).
  const promo = order ? await resolveActivePromoCode(req.payload, order.promoCode, req) : null
  const discount = promo
    ? promo.discountType === 'percent'
      ? Math.round((gross * promo.discountValue) / 100)
      : Math.min(promo.discountValue, gross)
    : 0
  // Math.max(0, ...) is a safety net, not the normal path: a percent
  // discount is validated to 1–100 (PromoCodes.ts) so it can never exceed
  // gross on its own, and a fixed discount is already clamped to gross via
  // Math.min above. Both branches are written so a discount larger than
  // the order zeroes totalPrice rather than going negative — deliberate;
  // no minimum-order threshold exists, and none should be invented here.
  const totalPrice = Math.max(0, gross - discount)

  await req.payload.update({
    collection: 'orders',
    id: orderId,
    data: { totalPrice, promoDiscount: discount },
    req,
  })
}

// Public checkout needs to edit/remove its own draft cart lines (quantity,
// dates) before submitting — but once an order has been submitted, its line
// items are the historical record of what was actually booked/pushed to
// МойСклад/Telegram, so further public edits must be blocked (only admins
// can amend a booking after the fact, via /cms).
async function canModifyOrderItem({ req, id }: { req: PayloadRequest; id?: number | string }): Promise<boolean> {
  if (req.user) return true
  // No id means this is a bulk update/delete (a `where` filter, not a single
  // document) — there's nothing here to check "is this order submitted yet"
  // against, so an anonymous request can't be allowed through.
  if (!id) return false
  const item = await req.payload.findByID({ collection: 'orderItems', id, overrideAccess: true, depth: 0 })
  if (!item) return false
  const orderId = typeof item.order === 'object' ? item.order?.id : item.order
  // An orphaned row (no resolvable order) has nothing to check "is this
  // submitted yet" against — fail closed, not open, or any anonymous request
  // could freely edit/delete it.
  if (!orderId) return false
  const order = await req.payload.findByID({ collection: 'orders', id: orderId, overrideAccess: true, depth: 0 })
  return !order?.submittedAt
}

// Mirrors canModifyOrderItem's "not yet submitted" rule for creates — public
// checkout attaches new draft lines to its own just-created order, but once
// that order has been submitted (pushed to МойСклад, Telegram notified), a
// new anonymous item must not be attachable: nothing would re-push or
// re-notify, so the stored total would silently drift from what was
// actually charged and communicated.
async function canCreateOrderItem({ req, data }: { req: PayloadRequest; data?: Record<string, unknown> }): Promise<boolean> {
  if (req.user) return true
  const orderRef = data?.order
  const orderId = typeof orderRef === 'object' && orderRef !== null ? (orderRef as { id: number }).id : orderRef
  if (!orderId) return false
  const order = await req.payload.findByID({ collection: 'orders', id: orderId as number, overrideAccess: true, depth: 0 })
  return !order?.submittedAt
}

export const OrderItems: CollectionConfig = {
  slug: 'orderItems',
  access: {
    // No PII on this collection (product ref/dates/qty/lineTotal only) — public
    // read is intentional, it's how the storefront shows booked-out dates on
    // a product's availability calendar to any visitor.
    read: () => true,
    create: canCreateOrderItem,
    update: canModifyOrderItem,
    delete: canModifyOrderItem,
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['order', 'product', 'listingType', 'quantity', 'startDate', 'endDate', 'lineTotal'],
  },
  fields: [
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      required: true,
      index: true,
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
    },
    {
      // Snapshotted from product.listingType on create — not user input.
      // Determines whether startDate/endDate are required and how
      // lineTotal is computed (day-rate x days vs flat unit price).
      name: 'listingType',
      type: 'select',
      options: [
        { label: 'Rental', value: 'rental' },
        { label: 'Sale', value: 'sale' },
      ],
      admin: { readOnly: true },
    },
    {
      name: 'quantity',
      type: 'number',
      required: true,
      min: 1,
      defaultValue: 1,
    },
    {
      name: 'startDate',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Required for rental items; unused for sale items.',
      },
    },
    {
      name: 'endDate',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Required for rental items; unused for sale items.',
      },
    },
    {
      // Recomputed on every save by the beforeChange hook below — this is
      // the single place price gets calculated, closing off the exact bug
      // class (recalculation skipped/duplicated across call sites) fixed
      // in the old codebase earlier this session.
      name: 'lineTotal',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, req, originalDoc }) => {
        if (!data?.product) return data

        const product = await req.payload.findByID({
          collection: 'products',
          id: data.product as number,
          req,
        })

        data.listingType = product.listingType
        const quantity = data.quantity ?? 1
        const excludeId = originalDoc?.id as number | undefined

        // Serializes concurrent availability checks for this product within
        // the current transaction — see lockProductForBooking's own comment
        // for why this closes RENTAL-001 (docs/audits/2026-08-24-baseline.md)
        // and why a plain read here isn't safe under concurrent bookings.
        await lockProductForBooking(req, product.id)

        if (product.listingType === 'rental') {
          if (!data.startDate || !data.endDate) {
            // Russian text for this code (and the one below) lives in
            // lib/checkoutErrors.ts, keyed by `data.reason` — see A3
            // (design_handoff_swiss_bento/08-instruction.md) for why the
            // client never reads this English `message` for display.
            throw new APIError(
              'startDate and endDate are required for rental line items',
              400,
              { code: 'RENTAL_DATES_INVALID', reason: 'missing', productTitle: product.title },
              true,
            )
          }
          // calculateRentalDays (lib/rental/pricing.ts) floors at 1 day for
          // *any* range — including a genuinely backwards one, where
          // differenceInCalendarDays would otherwise go negative. Reject a
          // backwards range here instead of letting it silently price as one
          // full day. This compares calendar days, not raw timestamps: an
          // equal-or-same-calendar-day range (e.g. pick up 10:00, return
          // 18:00 the same day) is a legitimate same-day rental under the
          // A1 convention — one full day at full rate, not an error — so it
          // must fall through to calculateLineTotal below, not be rejected
          // here the way it used to be.
          if (differenceInCalendarDays(new Date(data.endDate), new Date(data.startDate)) < 0) {
            // Message text updated post-A1: A1 narrowed this guard from
            // `endDate <= startDate` to `< 0`, so a same-calendar-day
            // rental is now valid — what's actually rejected here is a
            // return date *earlier* than the pickup date, not merely "not
            // after" it. The old "must be after" wording stopped being
            // accurate the moment A1 landed; corrected here rather than
            // carried forward into the new code's English log text too.
            throw new APIError(
              'endDate is earlier than startDate',
              400,
              { code: 'RENTAL_DATES_INVALID', reason: 'backwards', productTitle: product.title },
              true,
            )
          }
          // Read the number, not a boolean, so the error below can tell the
          // customer *how many* are actually free. This used to call an
          // isRentalQuantityAvailable() wrapper that did nothing but call
          // this same function and compare — so this costs no extra DB round
          // trip, and that wrapper, left with no callers, was removed.
          const available = await getAvailableRentalQuantity(
            req,
            product.id,
            new Date(data.startDate),
            new Date(data.endDate),
            excludeId,
          )
          if (available < quantity) {
            throw new APIError(
              `Only a limited quantity of "${product.title}" is available for these dates (requested ${quantity})`,
              400,
              { code: 'RENTAL_QUANTITY_UNAVAILABLE', productTitle: product.title, requested: quantity, available },
              true,
            )
          }
        } else {
          const available = await getAvailableSaleQuantity(req, product.id, excludeId)
          if (available < quantity) {
            throw new APIError(
              `Only ${available} unit(s) of "${product.title}" available for sale (requested ${quantity})`,
              400,
              { code: 'SALE_QUANTITY_UNAVAILABLE', productTitle: product.title, requested: quantity, available },
              true,
            )
          }
        }

        data.lineTotal = calculateLineTotal({
          listingType: product.listingType,
          unitPrice: product.price,
          quantity,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
        })

        return data
      },
    ],
    afterChange: [
      async ({ doc, req }) => {
        await recalcOrderTotal(req, doc.order)
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        await recalcOrderTotal(req, doc.order)
      },
    ],
  },
}
