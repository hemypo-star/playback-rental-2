import { getPayload } from 'payload'
import config from '@payload-config'
import type { Category } from '../../../payload-types'

// Admin-scoped category reads (docs/PLAN-next-migration.md Stage 3.5, page
// group 5) — distinct from lib/data/categories.ts (the storefront's own
// getCategories()/getCategoryBySlug(), depth:1/limit:100, tuned for catalog
// rendering): the admin list/picker needs the full set at depth:0 (matches
// apps/web's cmsFetch('/categories?sort=order&limit=200&depth=0')).
export async function getAdminCategories(): Promise<Category[]> {
  const payload = await getPayload({ config })
  const result = await payload.find({ collection: 'categories', sort: 'order', limit: 200, depth: 0 })
  return result.docs
}

export async function getAdminCategoryById(id: number): Promise<Category | null> {
  const payload = await getPayload({ config })
  return payload.findByID({ collection: 'categories', id, depth: 1, disableErrors: true })
}
