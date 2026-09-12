import { getPayload } from 'payload'
import config from '@payload-config'
import type { PromoCode } from '../../../payload-types'

// Admin-scoped promo-code reads (backlog item 5, docs/ROADMAP-2.0.md) —
// PromoCodes.ts itself is admin-only-readable (a code is shared out of
// band, not a discoverable list), so this is the only reader anywhere in
// the app; the storefront never lists codes, only validates one specific
// one (endpoints/promoCodeValidate.ts). Newest first — an operator managing
// codes cares most about ones they just created.
export async function getAdminPromoCodes(): Promise<PromoCode[]> {
  const payload = await getPayload({ config })
  const result = await payload.find({ collection: 'promoCodes', sort: '-createdAt', limit: 200, depth: 0 })
  return result.docs
}
