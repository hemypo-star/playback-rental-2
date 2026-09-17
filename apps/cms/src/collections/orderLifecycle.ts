import type { CollectionConfig } from 'payload'
import { Orders } from './Orders'
import { OrderItems } from './OrderItems'

function relationshipId(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'number' ? id : null
  }
  return null
}

/**
 * Orders are commercial/audit records: once created they are never hard-deleted
 * through Payload access. Operators cancel them instead. Local API callers that
 * deliberately use overrideAccess still retain an escape hatch for migrations/
 * maintenance, but neither /cms nor ordinary authenticated REST can delete one.
 */
export const OrdersWithLifecyclePolicy: CollectionConfig = {
  ...Orders,
  access: {
    ...Orders.access,
    delete: () => false,
  },
}

/**
 * Apply the last-item rule at collection-hook level, not only in the custom
 * /admin Server Action. That keeps /admin, /cms and any future authenticated
 * OrderItems mutation consistent: deleting the final line cancels the order;
 * the order record itself remains intact.
 *
 * OrderItems' original afterDelete hook runs first and recalculates totalPrice/
 * promoDiscount. This second hook owns only the lifecycle transition.
 */
export const OrderItemsWithLifecyclePolicy: CollectionConfig = {
  ...OrderItems,
  hooks: {
    ...OrderItems.hooks,
    afterDelete: [
      ...(OrderItems.hooks?.afterDelete || []),
      async ({ doc, req }) => {
        const orderId = relationshipId(doc.order)
        if (!orderId) return

        const remaining = await req.payload.find({
          collection: 'orderItems',
          where: { order: { equals: orderId } },
          limit: 1,
          depth: 0,
          req,
          overrideAccess: true,
        })
        if (remaining.totalDocs > 0) return

        const order = await req.payload.findByID({
          collection: 'orders',
          id: orderId,
          depth: 0,
          req,
          overrideAccess: true,
          disableErrors: true,
        })
        if (!order || order.status === 'cancelled') return

        await req.payload.update({
          collection: 'orders',
          id: orderId,
          data: {
            status: 'cancelled',
            totalPrice: 0,
            promoDiscount: 0,
          },
          req,
          overrideAccess: true,
        })
      },
    ],
  },
}
