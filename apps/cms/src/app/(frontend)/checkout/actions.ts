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
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { submitOrder } from '../../../lib/rental/submitOrder'
import { checkoutErrorInfoFromUnknown, type CheckoutErrorCode, type CheckoutErrorData } from '../../../lib/checkoutErrors'
import { checkRateLimits, type RateLimitCheck } from '../../../lib/security/rateLimit'
import { getClientIp } from '../../../lib/security/clientIp'
import { normalizePhoneForRateLimit } from '../../../lib/text/phone'

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
  // Machine-readable code + structured data, not a message string — A3
  // (design_handoff_swiss_bento/08-instruction.md, audit G5) moved Russian
  // translation to the client (lib/checkoutErrors.ts) so the same code can
  // drive both the error text and whether to offer a "изменить даты"
  // action; the English APIError/SubmitOrderError `.message` this used to
  // forward stays server-side, in the logs, and is never sent to the client.
  errorCode?: CheckoutErrorCode
  errorData?: CheckoutErrorData
  // E2 (design_handoff_swiss_bento/08-instruction.md, S4): the success
  // state is a card with the order number and dates, not a bare toast — the
  // client needs a real order id to show, not just a boolean.
  orderId?: number
}

export async function submitCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const payload = await getPayload({ config })

  try {
    // A2 (design_handoff_swiss_bento/08-instruction.md, audit G1) — rate
    // limit by IP and, separately, by phone, before creating anything. Both
    // dimensions are checked when both are available, because either alone
    // is easy to evade: an attacker varies IP trivially, a real household
    // legitimately shares one IP; phone doesn't rotate as easily but isn't
    // verified either, so it can't be the only gate.
    //
    // getClientIp() returns null rather than a fallback 'unknown' string
    // when the IP truly can't be trusted (TRUST_PROXY_HEADERS off — see
    // clientIp.ts, and this repo's own compose.yaml, which puts nothing in
    // front of `cms`). In that state the IP check is skipped entirely
    // rather than run against a single shared bucket: the phone dimension
    // is still per-customer and survives on its own, so checkout stays
    // meaningfully protected instead of one abuser exhausting a site-wide
    // budget that blocks every real customer behind it.
    //
    // A single checkRateLimits() call, not two separate checkRateLimit()
    // calls under Promise.all — review fix: two independent checks each
    // record their own hit the moment THEY pass, so a checkout rejected on
    // (say) phone alone would still have already spent a slot of the IP
    // bucket for an attempt that never went anywhere. checkRateLimits
    // checks every listed bucket first and only records a hit in any of
    // them once every one of them is confirmed under its limit — see its
    // own comment in rateLimit.ts for the full reasoning, including why
    // this call site (right before creating anything) is where recording
    // belongs.
    const ip = getClientIp(await headers())
    const phoneKey = normalizePhoneForRateLimit(input.customerPhone)
    const rateLimitChecks: RateLimitCheck[] = [{ bucket: 'checkout_phone', key: phoneKey }]
    if (ip) rateLimitChecks.push({ bucket: 'checkout_ip', key: ip })
    const allowed = await checkRateLimits(payload, rateLimitChecks)
    if (!allowed) {
      return { success: false, errorCode: 'RATE_LIMITED' }
    }

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
    return { success: true, orderId: order.id }
  } catch (error) {
    // checkoutErrorInfoFromUnknown only recognizes a Payload-originated
    // error's own {code, data} (the same validation/availability rejection
    // the beforeValidate hook or submitOrder() throws) — anything else (a
    // network/DB hiccup) falls back to 'UNKNOWN', same distinction the old
    // REST client's PayloadApiError-only check made, just against a code
    // now instead of a raw (English) message.
    const { code, data } = checkoutErrorInfoFromUnknown(error)
    // Log anything we could not classify. A recognized code is a normal
    // rejection the customer can act on (dates, availability, rate limit)
    // and is not worth a log line; UNKNOWN means something failed that this
    // flow did not anticipate — a DB or infrastructure fault — and the
    // customer only ever sees the generic Russian fallback, so without this
    // the server has no record that checkout broke at all. English stays
    // here on purpose: A3's split is Russian to the customer, English in
    // the log.
    if (code === 'UNKNOWN') {
      payload.logger.error({ err: error }, 'submitCheckout failed with an unclassified error')
    }
    return { success: false, errorCode: code, errorData: data }
  }
}
