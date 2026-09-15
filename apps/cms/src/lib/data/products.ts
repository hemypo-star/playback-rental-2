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

// Every product query on the storefront is scoped to available:true —
// factored out so getProducts (find) and getCategoryProductCounts (count,
// added for C5/N9 below) build the exact same base filter from one place
// instead of two copies that could quietly drift apart.
function buildProductWhere(extra: Where[] = []): Where {
  return { and: [{ available: { equals: true } }, ...extra] }
}

export async function getProducts(params: GetProductsParams = {}) {
  const payload = await getPayload({ config })

  const extra: Where[] = []
  if (params.categoryIds) extra.push({ category: { in: params.categoryIds } })
  else if (params.categoryId) extra.push({ category: { equals: params.categoryId } })
  // Search matches any of title, description, or tag. `like` splits the query
  // on spaces and ANDs a match per word (right for multi-word title search) —
  // but that ANDing happens *within* one field, so a multi-word query still
  // has to land entirely inside a single field to match: "Sony камера" won't
  // find a product with "Sony" in the title and "камера" only in the
  // description. Deliberate — it's still a strict superset of the old
  // title-only behavior, and matching per-word across fields would mean
  // splitting the query in app code and building an and-of-ors instead.
  if (params.search) extra.push({ or: [{ title: { like: params.search } }, { description: { like: params.search } }, { tag: { like: params.search } }] })
  if (params.isKit !== undefined) extra.push({ isKit: { equals: params.isKit } })

  return payload.find({
    collection: 'products',
    where: buildProductWhere(extra),
    limit: params.limit ?? 100,
    page: params.page ?? 1,
    sort: params.sort ?? '-lastSyncedAt',
    depth: 1,
  })
}

// C5 (design_handoff_swiss_bento/08-instruction.md, N9): the catalog sidebar
// used to get its per-category counts by calling getProducts({ limit: 500 })
// — up to 500 full product documents (every field, category+media relations
// populated at depth:1) fetched on every single catalog render, purely to
// tally how many landed in each category in JS afterward. payload.count()
// does that tally in the database instead: a plain COUNT(*)...WHERE per
// category, no document body and no relation population at all. This is
// N separate queries (one per category) rather than N9's one big fetch —
// each one is a trivial indexed count, not a document read, which is the
// actual instruction ("агрегирующий запрос... а не выборка документов").
// getSubtreeIds (lib/categoryTree.ts) still does the "a parent's count
// includes its descendants" summation in JS from these direct per-category
// counts, exactly as it always has — only where the raw numbers come from
// changed, not how they're combined.
//
// Scale note, left here rather than acted on (flagged during the live pass
// that fixed getCategories()'s own `limit: 100` in the sibling
// lib/data/categories.ts, not restructured as part of it): this is one
// round trip per category, in parallel, on every catalog render — fine at
// a local Postgres and the realistic category counts this shop actually
// has, but linear in category count with no cap. If that count ever grows
// into the hundreds, this is the function to revisit (a single grouped
// aggregate query, most likely), not getCategories() itself.
export async function getCategoryProductCounts(categoryIds: number[]): Promise<Map<number, number>> {
  const payload = await getPayload({ config })
  const entries = await Promise.all(
    categoryIds.map(async (id): Promise<[number, number]> => {
      const { totalDocs } = await payload.count({
        collection: 'products',
        where: buildProductWhere([{ category: { equals: id } }]),
      })
      return [id, totalDocs]
    }),
  )
  return new Map(entries)
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
