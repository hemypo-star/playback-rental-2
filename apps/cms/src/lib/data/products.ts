import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import type { Where } from 'payload'
import config from '@payload-config'
import type { Product } from '../../payload-types'
import { STOREFRONT_CACHE_REVALIDATE_SECONDS, STOREFRONT_CACHE_TAGS } from './cacheTags'

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
  inStockOnly?: boolean
  limit?: number
  page?: number
  sort?: string
  // Relation-population depth, passed straight through to payload.find().
  // Defaults to 1 (category + images populated) because every card-rendering
  // caller needs those; a caller that only reads scalar columns off the
  // result passes 0 rather than paying for the joins.
  depth?: number
  // Product ids to leave out of the result. The catalog's "Только свободные"
  // filter passes the products that are fully booked over the visitor's
  // selected dates (lib/rental/bookedQuantity.ts) — an exclusion the database
  // can apply, so totalDocs/totalPages keep describing exactly what the page
  // renders. Ignored when empty.
  excludeIds?: number[]
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
  if (params.inStockOnly) extra.push({ quantity: { greater_than: 0 } })
  if (params.excludeIds?.length) extra.push({ id: { not_in: params.excludeIds } })

  return payload.find({
    collection: 'products',
    where: buildProductWhere(extra),
    limit: params.limit ?? 100,
    page: params.page ?? 1,
    sort: params.sort ?? '-lastSyncedAt',
    depth: params.depth ?? 1,
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
// Backlog item 13: cache only these aggregate entries, not getProducts()
// itself. Product cards and availability stay request-fresh; category facet
// counts are safe to reuse briefly and are invalidated immediately after
// custom-admin writes. The 60s TTL also bounds staleness for standalone
// MoySklad sync/reconcile writes that happen outside the Next process.
const getCategoryProductCountEntriesCached = unstable_cache(
  async (categoryIds: number[]): Promise<Array<[number, number]>> => {
    const payload = await getPayload({ config })
    return Promise.all(
      categoryIds.map(async (id): Promise<[number, number]> => {
        const { totalDocs } = await payload.count({
          collection: 'products',
          where: buildProductWhere([{ category: { equals: id } }]),
        })
        return [id, totalDocs]
      }),
    )
  },
  ['catalog-category-product-counts-v1'],
  {
    revalidate: STOREFRONT_CACHE_REVALIDATE_SECONDS,
    tags: [STOREFRONT_CACHE_TAGS.catalogFacets],
  },
)

export async function getCategoryProductCounts(categoryIds: number[]): Promise<Map<number, number>> {
  return new Map(await getCategoryProductCountEntriesCached(categoryIds))
}

export interface CategoryProductStats {
  count: number
  minPrice: number
}

// Backlog item 10 (docs/ROADMAP-2.0.md), the homepage half: (frontend)/
// page.tsx used to fetch getProducts({ limit: 500 }) and tally per-category
// count + cheapest price from those documents in JS — the same waste C5
// removed from the catalog sidebar, one page over.
//
// Same treatment as C5, one difference: the sidebar renders a count and
// nothing else, so getCategoryProductCounts above stays a plain COUNT(*);
// the homepage tile renders "N позиций · от X ₽", a count *and* a price. A
// find() with limit: 1 sorted by price returns both in a single round trip
// (totalDocs is the count, docs[0] is the cheapest row), so this is a
// sibling of that function rather than a replacement for it — it buys the
// price at the cost of an ORDER BY ... LIMIT 1 the sidebar has no use for.
// `select` keeps the returned row to the one column actually read.
//
// A category with no available products is left out of the Map entirely,
// preserving the distinction the old JS tally had for free (a category
// nothing landed in was simply never added) and which categoryMeta() still
// relies on to render an empty meta line instead of "0 позиций · от 0 ₽".
const getCategoryProductStatEntriesCached = unstable_cache(
  async (categoryIds: number[]): Promise<Array<[number, CategoryProductStats]>> => {
    const payload = await getPayload({ config })
    const entries = await Promise.all(
      categoryIds.map(async (id): Promise<[number, CategoryProductStats] | null> => {
        const { docs, totalDocs } = await payload.find({
          collection: 'products',
          where: buildProductWhere([{ category: { equals: id } }]),
          sort: 'price',
          limit: 1,
          depth: 0,
          select: { price: true },
        })
        const cheapest = docs[0]
        if (!cheapest) return null
        return [id, { count: totalDocs, minPrice: cheapest.price }]
      }),
    )
    return entries.filter((entry): entry is [number, CategoryProductStats] => entry !== null)
  },
  ['catalog-category-product-stats-v1'],
  {
    revalidate: STOREFRONT_CACHE_REVALIDATE_SECONDS,
    tags: [STOREFRONT_CACHE_TAGS.catalogFacets],
  },
)

export async function getCategoryProductStats(categoryIds: number[]): Promise<Map<number, CategoryProductStats>> {
  return new Map(await getCategoryProductStatEntriesCached(categoryIds))
}

// Backlog item 10: the homepage's two headline stats, previously derived by
// fetching 500 documents and calling .length on two filtered copies of
// them. `total` is every available product ("Позиций в парке"), `inStock`
// those that also have stock on hand ("Свободны сегодня").
export interface ProductTotals {
  total: number
  inStock: number
}

const getProductTotalsCached = unstable_cache(
  async (): Promise<ProductTotals> => {
    const payload = await getPayload({ config })
    const [all, inStock] = await Promise.all([
      payload.count({ collection: 'products', where: buildProductWhere() }),
      payload.count({ collection: 'products', where: buildProductWhere([{ quantity: { greater_than: 0 } }]) }),
    ])
    return { total: all.totalDocs, inStock: inStock.totalDocs }
  },
  ['catalog-product-totals-v1'],
  {
    revalidate: STOREFRONT_CACHE_REVALIDATE_SECONDS,
    tags: [STOREFRONT_CACHE_TAGS.catalogFacets],
  },
)

export async function getProductTotals(): Promise<ProductTotals> {
  return getProductTotalsCached()
}

// Backlog item 10: the homepage hero's "от N ₽". Undefined only when the
// catalog holds no available rental listing at all, which is what hides the
// hero line. pagination:false skips the count query Payload would otherwise
// run alongside this, since nothing here reads totalDocs.
const getLowestRentalPriceCached = unstable_cache(
  async (): Promise<number | undefined> => {
    const payload = await getPayload({ config })
    const { docs } = await payload.find({
      collection: 'products',
      where: buildProductWhere([{ listingType: { equals: 'rental' } }]),
      sort: 'price',
      limit: 1,
      depth: 0,
      pagination: false,
      select: { price: true },
    })
    return docs[0]?.price
  },
  ['catalog-lowest-rental-price-v1'],
  {
    revalidate: STOREFRONT_CACHE_REVALIDATE_SECONDS,
    tags: [STOREFRONT_CACHE_TAGS.catalogFacets],
  },
)

export async function getLowestRentalPrice(): Promise<number | undefined> {
  return getLowestRentalPriceCached()
}

// Backlog item 10, the self-contained half: product/[id]/page.tsx's "Совместимые
// аксессуары" strip, which used to fetch 500 price-sorted documents and keep
// the first three that cleared a price ceiling. The ceiling is a plain range
// query, so the database can do the whole thing — the rows this returns are
// byte-for-byte the ones that JS filter kept, since both read the same
// price-ascending order.
// depth stays 1 (unlike the aggregate helpers above): the strip renders each
// accessory's first image through mediaUrl(), which needs the upload relation
// populated. Three documents, not five hundred.
export interface GetAccessoryProductsParams {
  // The product being viewed, which must not recommend itself.
  excludeId: number
  // Inclusive ceiling — an accessory has to be meaningfully cheaper than the
  // thing it accessorises for the strip to make sense.
  maxPrice: number
  limit?: number
}

export async function getAccessoryProducts({ excludeId, maxPrice, limit = 3 }: GetAccessoryProductsParams): Promise<Product[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'products',
    where: buildProductWhere([
      { id: { not_equals: excludeId } },
      // price > 0 excludes listings with no price set — a free line in the
      // accessories strip reads as a bug, not an offer.
      { price: { greater_than: 0 } },
      { price: { less_than_equal: maxPrice } },
    ]),
    sort: 'price',
    limit,
    depth: 1,
    pagination: false,
  })
  return docs
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
