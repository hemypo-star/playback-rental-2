import type { Payload, PayloadRequest } from 'payload'
import type { PromoCode } from '../../payload-types'

// Ported from commit ffbcf40's lib/promo/promoCodes.ts, unchanged in shape
// (only the caller's use of the result changed — see OrderItems.ts's
// recalcOrderTotal). Shared between the public validate endpoint
// (checkout's "Применить" button) and recalcOrderTotal (the actual discount
// application) — a code must resolve identically in both places, or the
// storefront could show "скидка применена" for a code the order-total hook
// then silently ignores (or vice versa).
export async function resolveActivePromoCode(
  payload: Payload,
  code: string | null | undefined,
  req?: PayloadRequest,
): Promise<PromoCode | null> {
  const normalized = code?.trim().toUpperCase()
  if (!normalized) return null

  const result = await payload.find({
    collection: 'promoCodes',
    where: { code: { equals: normalized } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const promo = result.docs[0]
  if (!promo || !promo.active) return null
  if (promo.validUntil && new Date(promo.validUntil).getTime() < Date.now()) return null
  return promo
}
