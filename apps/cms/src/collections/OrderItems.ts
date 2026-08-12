import type { CollectionConfig, PayloadRequest } from 'payload'
import { APIError } from 'payload'
import { calculateLineTotal } from '../lib/rental/pricing'
import { isRentalQuantityAvailable, getAvailableSaleQuantity } from '../lib/rental/availability'

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
  const total = siblings.docs.reduce((sum, item: any) => sum + (item.lineTotal || 0), 0)

  await req.payload.update({
    collection: 'orders',
    id: orderId,
    data: { totalPrice: total },
    req,
  })
}

export const OrderItems: CollectionConfig = {
  slug: 'orderItems',
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

        if (product.listingType === 'rental') {
          if (!data.startDate || !data.endDate) {
            throw new APIError('startDate and endDate are required for rental line items', 400, undefined, true)
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
