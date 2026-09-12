import type { Endpoint } from 'payload'
import { resolveActivePromoCode } from '../lib/promo/promoCodes'
import { checkRateLimit } from '../lib/security/rateLimit'
import { getClientIp } from '../lib/security/clientIp'

// Public — checkout calls this to show "скидка применена" before creating
// the order (the actual discount is re-resolved and applied server-side
// again at submit time, in OrderItems.ts's recalcOrderTotal; this endpoint
// never authorizes a discount on its own). Deliberately returns only
// { valid, discountType, discountValue }, never the promo's own id/
// description/etc., since PromoCodes itself is admin-only-readable
// specifically so the full code list isn't enumerable.
export const promoCodeValidateEndpoint: Endpoint = {
  path: '/promo-codes/validate',
  method: 'get',
  handler: async (req) => {
    // Rate-limited by IP before doing any lookup — this endpoint is a
    // public oracle over a secret code space (see rateLimit.ts's own
    // comment on the 'promo_validate_ip' bucket). getClientIp() returns
    // null (not a fallback 'unknown' bucket) when the IP can't be trusted
    // (TRUST_PROXY_HEADERS off) — same reasoning as every other IP-only
    // dimension in this app: skip the check rather than throttle every
    // visitor through one shared bucket. On rejection, return exactly the
    // same { valid: false } shape a genuinely invalid code gets, so a
    // rate-limited caller can't distinguish "this code doesn't exist" from
    // "you've been throttled" and use that to narrow a search.
    const ip = getClientIp(req.headers)
    if (ip) {
      const allowed = await checkRateLimit(req.payload, 'promo_validate_ip', ip)
      if (!allowed) {
        return Response.json({ valid: false }, { status: 429 })
      }
    }

    const url = new URL(req.url || '', 'http://localhost')
    const code = url.searchParams.get('code')

    const promo = await resolveActivePromoCode(req.payload, code, req)
    if (!promo) {
      return Response.json({ valid: false })
    }
    return Response.json({ valid: true, discountType: promo.discountType, discountValue: promo.discountValue })
  },
}
