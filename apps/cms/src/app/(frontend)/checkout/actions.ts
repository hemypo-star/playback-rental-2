'use server'

// Server Action for checkout (docs/PLAN-next-migration.md Stage 2, page
// group 7 — the plan's own "needs the most care" page group, since it's the
// only one with a real mutation). Replaces apps/web/src/lib/payload.ts's
// createOrder()/createOrderItem()/deleteOrderItem()/submitOrder() REST calls
// — a client component calling those made 1+N+1 separate HTTP round trips
// (order, one per cart line, submit) through the mutate()/{ doc, message }
// wrapper; this collapses the whole flow into one server-side call using the
// Local API directly.
//
// No submitToken plumbing here, unlike the old flow: that token exists only
// to authorize the public *HTTP* /:id/submit endpoint (still used by
// apps/web's REST-based checkout, and by anyone calling the API directly) —
// this action calls lib/rental/submitOrder.ts's submitOrder() in-process, on
// the order it just created in this same request, so there's no separate
// HTTP boundary for the token to protect.
import { getPayload } from 'payload'
import { APIError } from 'payload'
import config from '@payload-config'
import { submitOrder, SubmitOrderError } from '../../../lib/rental/submitOrder'

export interface CheckoutItem {
  productId: number
  quantity: number
  startDate?: string
  endDate?: string
}

export interface CheckoutInput {
  customerName: string
  customerEmail: string
  customerPhone: string
  notes?: string
  items: CheckoutItem[]
}

export interface CheckoutResult {
  success: boolean
  error?: string
}

export async function submitCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const payload = await getPayload({ config })

  try {
    // overrideAccess: false (Local API defaults to true, i.e. bypassing
    // access control) — this is a genuinely public, anonymous checkout, so
    // it should be evaluated under the same collection access rules a real
    // anonymous REST caller would hit (orders.create is public; orderItems'
    // canCreateOrderItem allows it as long as the order isn't submitted
    // yet, which a just-created order never is), not silently bypass them.
    const order = await payload.create({
      collection: 'orders',
      data: {
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        // `status` has a schema defaultValue ('pending'), applied at
        // runtime regardless — but Payload's create() Data type still
        // requires it explicitly for any `required: true` field, defaulted
        // or not, so it has to be set here too or TS falls through to a
        // confusing "missing draft property" error trying its other
        // create() overload.
        status: 'pending',
        ...(input.notes ? { notes: input.notes } : {}),
      },
      overrideAccess: false,
    })

    // If a later line item fails (e.g. someone else just took the last unit),
    // don't leave the earlier ones dangling on an order that never gets
    // submitted — clean up the orderItems already created before surfacing
    // the error. The order shell itself is left in place: deleting orders is
    // admin-only by design (collections/Orders.ts), same as the old REST
    // flow, which could never delete it either.
    const createdItemIds: number[] = []
    try {
      for (const item of input.items) {
        const created = await payload.create({
          collection: 'orderItems',
          data: {
            order: order.id,
            product: item.productId,
            quantity: item.quantity,
            startDate: item.startDate,
            endDate: item.endDate,
          },
          overrideAccess: false,
        })
        createdItemIds.push(created.id)
      }
    } catch (itemError) {
      await Promise.all(
        createdItemIds.map((id) => payload.delete({ collection: 'orderItems', id, overrideAccess: false }).catch(() => {})),
      )
      throw itemError
    }

    await submitOrder(payload, order.id)
    return { success: true }
  } catch (error) {
    // Only surface a Payload-originated error's own message (the same
    // validation/availability text the beforeValidate hook throws, e.g.
    // "endDate must be after startDate") — anything else (a network/DB
    // hiccup) gets the generic fallback, same distinction the old REST
    // client's PayloadApiError-only check made.
    const message = error instanceof APIError || error instanceof SubmitOrderError ? error.message : 'Не удалось оформить заказ. Попробуйте ещё раз.'
    return { success: false, error: message }
  }
}
