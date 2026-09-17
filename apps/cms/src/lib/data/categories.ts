import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Category } from '../../payload-types'
import { STOREFRONT_CACHE_REVALIDATE_SECONDS, STOREFRONT_CACHE_TAGS } from './cacheTags'

// Server-only data layer (docs/PLAN-next-migration.md Stage 2 "Данные"),
// same pattern as lib/data/siteSettings.ts — Local API instead of
// apps/web/src/lib/payload.ts's REST client.
//
// C5 (design_handoff_swiss_bento/08-instruction.md, N7/N9 sibling gap):
// was `limit: 100` — the same silent-truncation pattern already fixed for
// getProducts() in lib/data/products.ts, left behind here. The catalog
// sidebar (CatalogPage.tsx) builds its whole tree and its per-category
// counts from whatever this returns, so a truncated list didn't just hide
// categories past the 100th — every count summed from getSubtreeIds() over
// that same truncated list went quietly wrong too, with nothing on screen
// hinting a category was missing (categories have no "N of M" total the
// way the product grid's `totalDocs` does). `limit: 0` is Payload's Local
// API for "no cap, fetch everything" (confirmed in this version's own
// source during C5 — see sitemap.ts's own use of the same value on
// getProducts() for the same reasoning) — the right tool here, unlike
// count()'s own `limit`, which doesn't share that meaning. Fetching every
// row unbounded is deliberately the simple answer, not a paginated one: a
// rental shop's real category tree — hierarchical, hand-curated, meant to
// fit in a sidebar a customer actually reads — realistically never
// approaches even the old 100, let alone needs its own paging UI.
const getCategoriesCached = unstable_cache(
  async (): Promise<Category[]> => {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'categories',
      sort: 'order',
      limit: 0,
      depth: 1,
    })
    return result.docs
  },
  ['storefront-categories-v1'],
  {
    revalidate: STOREFRONT_CACHE_REVALIDATE_SECONDS,
    tags: [STOREFRONT_CACHE_TAGS.categories],
  },
)

export async function getCategories(): Promise<Category[]> {
  return getCategoriesCached()
}

const getCategoryBySlugCached = unstable_cache(
  async (slug: string): Promise<Category | undefined> => {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'categories',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 1,
    })
    return result.docs[0]
  },
  ['storefront-category-by-slug-v1'],
  {
    revalidate: STOREFRONT_CACHE_REVALIDATE_SECONDS,
    tags: [STOREFRONT_CACHE_TAGS.categories],
  },
)

// React cache keeps the generateMetadata()/page pair deduped within one
// render; unstable_cache underneath extends that reuse across requests.
export const getCategoryBySlug = cache(getCategoryBySlugCached)
