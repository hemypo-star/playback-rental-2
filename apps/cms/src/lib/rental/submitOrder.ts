import type { Payload, PayloadRequest } from 'payload'
import { pushOrderToMoySklad } from '../moysklad/orders'
import { sendOrderNotification } from '../notifications/webhook'
import { calculateRentalDays } from './pricing'

// Extracted from the /:id/submit endpoint's handler (collections/Orders.ts)
// so the new checkout Server Action (docs/PLAN-next-migration.md Stage 2,
// page group 7) can call the exact same МойСклад-push + notification logic
// directly via the Local API, instead of duplicating it or looping back
// through an HTTP call to its own endpoint. The endpoint itself is now a
// thin wrapper around this — still needed as-is for apps/web's REST-based
// checkout until Stage 4 deletes that app.

// The rate actually frozen into this line's lineTotal at booking time — not
// the product's current live price, which may have changed (a МойСклад sync,
// an admin edit) between when the customer was quoted and when this order is
// submitted. orderItems doesn't store its own unitPrice, only the computed
// total, so back-derive it the same way it was computed.
function frozenUnitPrice(item: { listingType: string; quantity: number; lineTotal: number; startDate?: string; endDate?: string }): number {
  if (item.quantity <= 0) return 0
  if (item.listingType === 'sale') return item.lineTotal / item.quantity
  const days = item.startDate && item.endDate ? calculateRentalDays(new Date(item.startDate), new Date(item.endDate)) : 0
  if (days <= 0) return 0
  return item.lineTotal / (item.quantity * days)
}

export class SubmitOrderError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'SubmitOrderError'
  }
}

export interface SubmitOrderResult {
  success: true
  moySkladOrderId: string | null
  moySkladError: string | null
  notificationSent: boolean
}

// `req` is optional and only ever passed by the /:id/submit endpoint, to
// stay inside that request's own DB connection/transaction (see
// OrderItems.ts's recalcOrderTotal comment on why that matters) — the
// checkout Server Action has no such request context of its own to share,
// same as its separate order/orderItems creates before this call.
export async function submitOrder(payload: Payload, orderId: number, req?: PayloadRequest): Promise<SubmitOrderResult> {
  const order = await payload.findByID({ collection: 'orders', id: orderId, req, overrideAccess: true })
  if (!order) {
    throw new SubmitOrderError('Order not found', 404)
  }
  if (order.submittedAt) {
    throw new SubmitOrderError('Order already submitted', 409)
  }

  const itemsResult = await payload.find({
    collection: 'orderItems',
    where: { order: { equals: orderId } },
    limit: 0,
    depth: 1,
    req,
    overrideAccess: true,
  })
  if (itemsResult.docs.length === 0) {
    throw new SubmitOrderError('Order has no items', 400)
  }

  // depth: 1 above populates the `product` relationship into an object;
  // itemsResult.docs is typed generically since payload-types.ts is
  // generated (gitignored), not checked in — this shape is only what the
  // pushes below actually read from each line.
  const items = itemsResult.docs as unknown as Array<{
    product: { moySkladId: string; title: string }
    listingType: 'rental' | 'sale'
    quantity: number
    lineTotal: number
    startDate?: string
    endDate?: string
  }>

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
        unitPrice: frozenUnitPrice(item),
        startDate: item.startDate,
        endDate: item.endDate,
      })),
    })
    moySkladOrderId = pushed.id
  } catch (error) {
    // Don't let a МойСклад outage block checkout — log and continue;
    // moySkladOrderId stays null so this is visible/reconcilable later.
    moySkladError = error instanceof Error ? error.message : 'Unknown error'
    payload.logger.error({ err: error, orderId }, 'Failed to push order to МойСклад')
  }

  const notification = await sendOrderNotification({
    orderId,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    totalPrice: order.totalPrice ?? 0,
    items: items.map((item) => ({
      title: item.product.title,
      quantity: item.quantity,
      listingType: item.listingType,
      startDate: item.startDate,
      endDate: item.endDate,
      lineTotal: item.lineTotal,
    })),
  })

  await payload.update({
    collection: 'orders',
    id: orderId,
    data: {
      moySkladOrderId: moySkladOrderId ?? undefined,
      submittedAt: new Date().toISOString(),
    },
    req,
  })

  return {
    success: true,
    moySkladOrderId,
    moySkladError,
    notificationSent: notification.success,
  }
}
