import { getPayload } from 'payload'
import type { Where } from 'payload'
import config from '@payload-config'
import type { Category, Product } from '../../payload-types'
import { categoryNameOf } from '../productDisplay'
import { mediaUrl } from '../mediaUrl'
import { foldQuery, expandStems, MIN_QUERY_LENGTH } from '../searchMorphology'

// Server-only global search for the storefront (header dropdown + /search
// page). Deliberately independent of any category context: every query runs
// against the whole catalog. Both surfaces call these functions so ranking
// and morphology can't drift between the live dropdown and the results page.

export interface SearchProductItem {
  id: number
  title: string
  price: number
  listingType: 'rental' | 'sale'
  categoryName?: string
  imageUrl?: string
}

export interface SearchCategoryItem {
  id: number
  name: string
  slug: string
}

export interface SearchResult {
  categories: SearchCategoryItem[]
  products: SearchProductItem[]
  totalProducts: number
}

// Exported so the /search page can run its own full-document find() (cards
// need subtitle/quantity/unit, which the slim projection above drops) with
// byte-identical matching semantics to the dropdown. Returns null for a
// query too short/stopword-only to be searchable — callers treat that as
// "no results", never as "match everything".
export function buildSearchWhere(raw: string): Where | null {
  const stems = foldQuery(raw)
  if (!stems.length || stems.some((s) => s.length < MIN_QUERY_LENGTH)) return null
  const words = expandStems(stems)
  const perWord: Where[] = words.map((word) => ({
    or: [
      { title: { like: word } },
      { subtitle: { like: word } },
      { description: { like: word } },
      { tag: { like: word } },
    ],
  }))
  return { and: [{ available: { equals: true } }, { or: perWord }] }
}

const SEARCH_LIMITS = {
  // Dropdown shows at most 3 categories; the rest are reachable via /search.
  categories: 3,
  // Products scroll inside the dropdown — a generous but bounded cap keeps
  // the response light; overflow is again the /search page's job.
  dropdownProducts: 50,
  // /search page grid paging.
  pageProducts: 24,
} as const

export async function searchCatalog(options: { raw: string; productLimit?: number; page?: number }): Promise<SearchResult> {
  const empty: SearchResult = { categories: [], products: [], totalProducts: 0 }
  const where = buildSearchWhere(options.raw)
  if (!where) return empty

  const payload = await getPayload({ config })
  const limit = options.productLimit ?? SEARCH_LIMITS.dropdownProducts
  const page = options.page && options.page > 0 ? options.page : 1

  const [categoriesResult, productsResult] = await Promise.all([
    payload.find({
      collection: 'categories',
      // Same cross-field logic for categories, minus the product-only fields.
      where: (() => {
        const words = expandStems(foldQuery(options.raw))
        const perWord: Where[] = words.map((word) => ({
          or: [{ name: { like: word } }, { description: { like: word } }],
        }))
        return { or: perWord }
      })(),
      limit: SEARCH_LIMITS.categories,
      sort: 'order',
      depth: 0,
    }),
    payload.find({
      collection: 'products',
      where,
      limit,
      page,
      sort: '-lastSyncedAt',
      depth: 1,
    }),
  ])

  return {
    categories: categoriesResult.docs.map((c: Category) => ({ id: c.id, name: c.name, slug: c.slug })),
    products: productsResult.docs.map((p: Product) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      listingType: p.listingType,
      categoryName: categoryNameOf(p),
      imageUrl: mediaUrl(p.images?.[0], 'card'),
    })),
    totalProducts: productsResult.totalDocs,
  }
}

export const SEARCH_PAGE_SIZE = SEARCH_LIMITS.pageProducts
