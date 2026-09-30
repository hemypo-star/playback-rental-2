import type { MetadataRoute } from 'next'
import { getCategories } from '../lib/data/categories'
import { getProducts } from '../lib/data/products'
import { getActivePromotions } from '../lib/data/promotions'
import { siteOrigin } from '../lib/seo'

// Ported from apps/web/src/pages/sitemap.xml.ts (pre-Next.js-migration
// `im9cfz` branch) to Next's native MetadataRoute.Sitemap convention.
//
// force-dynamic: a real DB read (categories/products/promotions), same
// reasoning as every other data-driven route in this app — a genuine
// `next build`'s static-generation pass would execute it against the build
// stage's placeholder DATABASE_URI otherwise (see apps/cms/Dockerfile).
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin()
  const [categories, productsResult, promotions] = await Promise.all([
    getCategories(),
    // limit: 0 — Payload's Local API treats 0 as "no cap", same as its REST
    // find (see lib/data/products.ts) — a sitemap that silently stops
    // listing products past some default cap is exactly the kind of bug
    // to avoid here.
    getProducts({ limit: 0 }),
    getActivePromotions(),
  ])

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${origin}/`, changeFrequency: 'daily', priority: 1.0 },
    { url: `${origin}/catalog`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${origin}/how-it-works`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${origin}/contact`, changeFrequency: 'monthly', priority: 0.4 },
  ]

  return [
    ...staticUrls,
    ...categories.map(
      (c): MetadataRoute.Sitemap[number] => ({
        url: `${origin}/catalog/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: 'daily',
        priority: 0.7,
      }),
    ),
    ...productsResult.docs.map(
      (p): MetadataRoute.Sitemap[number] => ({
        url: `${origin}/product/${p.id}`,
        lastModified: p.updatedAt,
        changeFrequency: 'daily',
        priority: 0.8,
      }),
    ),
    ...promotions
      .filter((p) => p.slug)
      .map(
        (p): MetadataRoute.Sitemap[number] => ({
          url: `${origin}/promotions/${p.slug}`,
          lastModified: p.updatedAt,
          changeFrequency: 'weekly',
          priority: 0.5,
        }),
      ),
  ]
}
