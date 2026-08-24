import type { CollectionConfig, PayloadRequest } from 'payload'
import { APIError } from 'payload'
import { calculateLineTotal } from '../lib/rental/pricing'
import { isRentalQuantityAvailable, getAvailableSaleQuantity, lockProductForBooking } from '../lib/rental/availability'

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
async function recalcOrderTotal(req: PayloadRequest, orderRef: unknown): Promise<void> {
  const orderId = toId(orderRef)
  const siblings = await req.payload.find({
    collection: 'orderItems',
    where: { order: { equals: orderId } },
    limit: 0,
    depth: 0,
    req,
  })
  const total = siblings.docs.reduce((sum, item: { lineTotal?: number | null }) => sum + (item.lineTotal || 0), 0)

  await req.payload.update({
    collection: 'orders',
    id: orderId,
    data: { totalPrice: total },
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
            throw new APIError('startDate and endDate are required for rental line items', 400, undefined, true)
          }
          // calculateRentalDays treats a non-positive duration as 0 days,
          // which calculateLineTotal below turns into a silent 0 lineTotal —
          // a free rental — rather than an error. Reject it here instead.
          if (new Date(data.endDate) <= new Date(data.startDate)) {
            throw new APIError('endDate must be after startDate', 400, undefined, true)
          }
          const available = await isRentalQuantityAvailable(
            req,
            product.id,
            quantity,
            new Date(data.startDate),
            new Date(data.endDate),
            excludeId,
          )
          if (!available) {
            throw new APIError(
              `Only a limited quantity of "${product.title}" is available for these dates (requested ${quantity})`,
              400,
              undefined,
              true,
            )
          }
        } else {
          const available = await getAvailableSaleQuantity(req, product.id, excludeId)
          if (available < quantity) {
            throw new APIError(
              `Only ${available} unit(s) of "${product.title}" available for sale (requested ${quantity})`,
              400,
              undefined,
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
