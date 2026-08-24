import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Promotion } from '../../payload-types'

// Server-only data layer (docs/PLAN-next-migration.md Stage 2 "Данные"),
// same pattern as lib/data/siteSettings.ts.
export async function getActivePromotions(): Promise<Promotion[]> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'promotions',
    where: { active: { equals: true } },
    sort: 'order',
    limit: 20,
    depth: 1,
  })
  return result.docs
}

// cache(): promotions/[slug]/page.tsx calls this from both generateMetadata()
// and the page component itself — same reasoning as getCategoryBySlug() in
// lib/data/categories.ts.
export const getPromotionBySlug = cache(async (slug: string): Promise<Promotion | undefined> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'promotions',
    where: { and: [{ slug: { equals: slug } }, { active: { equals: true } }] },
    limit: 1,
    depth: 2,
  })
  return result.docs[0]
})
