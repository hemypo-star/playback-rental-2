import { getPayload } from 'payload'
import type { Where } from 'payload'
import config from '@payload-config'
import type { Product } from '../../payload-types'

// Server-only data layer (docs/PLAN-next-migration.md Stage 2 "Данные"),
// same pattern as lib/data/siteSettings.ts. Local API `where` takes a
// nested object instead of REST's `where[field][operator]=value` query
// string — same filters apps/web/src/lib/payload.ts's getProducts() built,
// translated to that shape. `categorySlug` from the REST version's params
// was dead code there (declared, never read) — not carried over here.
export interface GetProductsParams {
  categoryId?: number
  // A parent category's page shows its own products plus every descendant
  // category's — pass the whole resolved subtree (see lib/categoryTree.ts's
  // getSubtreeIds) here instead of categoryId to get that. Wins over
  // categoryId if both are somehow passed.
  categoryIds?: number[]
  search?: string
  isKit?: boolean
  limit?: number
  page?: number
  sort?: string
}

export async function getProducts(params: GetProductsParams = {}) {
  const payload = await getPayload({ config })

  const and: Where[] = [{ available: { equals: true } }]
  if (params.categoryIds) and.push({ category: { in: params.categoryIds } })
  else if (params.categoryId) and.push({ category: { equals: params.categoryId } })
  if (params.search) and.push({ title: { like: params.search } })
  if (params.isKit !== undefined) and.push({ isKit: { equals: params.isKit } })

  return payload.find({
    collection: 'products',
    where: { and },
    limit: params.limit ?? 100,
    page: params.page ?? 1,
    sort: params.sort ?? '-lastSyncedAt',
    depth: 1,
  })
}

// disableErrors: true returns null for a missing/invalid id instead of
// throwing Payload's NotFound — simpler for the product page's redirect-on-
// missing-product logic than importing and instanceof-checking that error
// class, which the old REST client's PayloadApiError-based equivalent had
// to do (a REST 404 has no other way to signal "not found" to the caller).
export async function getProductById(id: number): Promise<Product | null> {
  const payload = await getPayload({ config })
  return payload.findByID({ collection: 'products', id, depth: 1, disableErrors: true })
}
