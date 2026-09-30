import { getPayload } from 'payload'
import config from '@payload-config'
import type { Promotion } from '../../../payload-types'

// Admin-scoped promotion reads (docs/PLAN-next-migration.md Stage 3.5, page
// group 5) — distinct from lib/data/promotions.ts (the storefront's own
// getActivePromotions()/getPromotionBySlug(), active-only): the admin list
// needs both active and hidden promotions (matches apps/web's
// cmsFetch('/promotions?sort=order&limit=100&depth=0')).
export async function getAdminPromotions(): Promise<Promotion[]> {
  const payload = await getPayload({ config })
  const result = await payload.find({ collection: 'promotions', sort: 'order', limit: 100, depth: 0 })
  return result.docs
}

export async function getAdminPromotionById(id: number): Promise<Promotion | null> {
  const payload = await getPayload({ config })
  return payload.findByID({ collection: 'promotions', id, depth: 0, disableErrors: true })
}
