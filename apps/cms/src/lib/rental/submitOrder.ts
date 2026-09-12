import type { Payload, PayloadRequest } from 'payload'
import { pushOrderToMoySklad } from '../moysklad/orders'
import { sendOrderNotification } from '../notifications/webhook'
import { calculateRentalDays } from './pricing'
import type { CheckoutErrorCode } from '../checkoutErrors'

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
    // Machine-readable code for lib/checkoutErrors.ts to translate to
    // Russian (A3, design_handoff_swiss_bento/08-instruction.md) — the
    // /:id/submit REST endpoint (collections/Orders.ts) and the admin
    // "submit to МойСклад" action still read `.message` directly for their
    // own (non-customer-facing) error surfaces, so this stays optional
    // rather than forcing every existing catch site to change.
    public code: CheckoutErrorCode = 'UNKNOWN',
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
    throw new SubmitOrderError('Order not found', 404, 'ORDER_NOT_FOUND')
  }
  if (order.submittedAt) {
    throw new SubmitOrderError('Order already submitted', 409, 'ORDER_ALREADY_SUBMITTED')
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
    throw new SubmitOrderError('Order has no items', 400, 'ORDER_HAS_NO_ITEMS')
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

  // Backlog item 5 (docs/ROADMAP-2.0.md, promo codes). frozenUnitPrice()
  // back-derives a per-position price from lineTotal, which OrderItems.ts's
  // beforeValidate hook always stores GROSS (undiscounted) — the discount
  // itself is applied at the order level, by recalcOrderTotal, not per
  // line (see that file's own comment for why). Left alone, МойСклад would
  // therefore record every position at its full, undiscounted price — a
  // higher total than the customer actually pays, a silent divergence in
  // the owner's real inventory/accounting system. Scale every pushed
  // unitPrice by the order's actual discount factor instead, so the sum
  // МойСклад sees matches order.totalPrice (net of the discount), not the
  // gross sum of lineTotal. gross === 0 guard: an order can only reach here
  // with items (checked above), and lineTotal is never negative, so gross
  // is 0 only in the degenerate all-free-lines case — factor stays 1
  // (no scaling) rather than dividing by zero.
  const gross = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const promoDiscount = order.promoDiscount ?? 0
  const discountFactor = gross > 0 ? 1 - promoDiscount / gross : 1

  // МойСклад's own customerorder positions have a per-position `discount`
  // field that would render this far more legibly in their UI (a visible
  // "10% off" line, not just a quietly lower price) — not used here because
  // pushing a new field to a live third-party API can't be verified in this
  // environment under the standing no-live-МойСклад-credentials rule for
  // this task. Scaling unitPrice is the deliberate choice instead: it's
  // exactly how a percentage discount already reached МойСклад before this
  // change (frozenUnitPrice always derived from a post-discount lineTotal
  // when the old, percent-only, per-line design applied it inside
  // beforeValidate), so this preserves existing behavior for percent codes
  // and extends the same mechanism to fixed-amount ones.
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
        unitPrice: frozenUnitPrice(item) * discountFactor,
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
    // Additive — promoCode/promoDiscount are new keys, every existing key
    // is unchanged, so an n8n workflow built against the pre-existing
    // payload shape keeps working untouched. Included so the owner's
    // workflow isn't shown a totalPrice it can't explain (order.totalPrice
    // is already net of the discount; without these two fields there'd be
    // no way to tell "this total is low because of a promo" from "this
    // total is just what these items cost").
    promoCode: order.promoCode || null,
    promoDiscount,
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
