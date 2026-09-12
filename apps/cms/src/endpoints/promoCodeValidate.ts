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
    // visitor through one shared bucket, but note this bucket has no
    // second dimension the way checkout/contact do (no phone/email to fall
    // back to) — so in a deployment without trusted proxy headers, "skip
    // when IP unknown" means this endpoint is not throttled at all, not
    // "throttled on a different key".
    //
    // On rejection this returns 429, not the same { valid: false } shape a
    // genuinely invalid code gets — trivially distinguishable by status
    // code, and deliberately so: 429 is the correct HTTP semantics and lets
    // a legitimate client back off instead of silently retrying into a
    // black hole. This isn't a meaningful leak either way — at 30/hour per
    // IP (RATE_LIMIT_PROMO_VALIDATE_IP_MAX), enumerating the code space is
    // impractical regardless of whether 429 is distinguishable from a plain
    // miss, and an attacker being throttled is already directly observable
    // by counting their own requests, not something a shared response
    // shape could hide.
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
