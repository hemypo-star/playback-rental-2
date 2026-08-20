import { getPayload } from 'payload'
import config from '@payload-config'
import type { Category } from '../../payload-types'

// Server-only data layer (docs/PLAN-next-migration.md Stage 2 "Данные"),
// same pattern as lib/data/siteSettings.ts — Local API instead of
// apps/web/src/lib/payload.ts's REST client.
export async function getCategories(): Promise<Category[]> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'categories',
    sort: 'order',
    limit: 100,
    depth: 1,
  })
  return result.docs
}
