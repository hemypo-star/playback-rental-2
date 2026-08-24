import { cache } from 'react'
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

// cache(): catalog/[slug]/page.tsx calls this from both generateMetadata()
// and the page component itself — React's per-request cache dedupes that
// to one Local API query instead of two, the way Next's own fetch()
// already dedupes automatically (Local API calls aren't fetch(), so this
// doesn't come for free).
export const getCategoryBySlug = cache(async (slug: string): Promise<Category | undefined> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'categories',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
  })
  return result.docs[0]
})
