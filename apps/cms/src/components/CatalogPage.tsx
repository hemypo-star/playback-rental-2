import type { Category } from '../payload-types'
import CategorySidebar from './CategorySidebar'
import ProductCard from './ProductCard'
import RentalDatePicker from './RentalDatePicker'
import CatalogAvailabilityInit from './CatalogAvailabilityInit'
import { getCategories } from '../lib/data/categories'
import { getProducts } from '../lib/data/products'
import { pluralizeRu } from '../lib/dateRange'
import { getSubtreeIds } from '../lib/categoryTree'

// Ported from apps/web/src/components/CatalogPage.astro (docs/PLAN-next-
// migration.md Stage 2). Shared by both catalog routes (/catalog,
// /catalog/[slug]), same as the Astro original.
interface Props {
  activeCategory?: Category
  searchQuery?: string
  sort?: string
  kitOnly?: boolean
}

const SORT_PARAM: Record<string, string> = {
  pop: '-lastSyncedAt',
  asc: 'price',
  desc: '-price',
}

export default async function CatalogPage({ activeCategory, searchQuery, sort = 'pop', kitOnly = false }: Props) {
  // Categories fetched first — a parent category's own product filter needs
  // its resolved subtree (self + every descendant) before the products query
  // can run, so a parent page shows children's products too, not just
  // whatever's tagged directly on the parent itself (rarely anything, given
  // real listings live on the leaf categories).
  const categories = await getCategories()
  const activeCategoryIds = activeCategory ? getSubtreeIds(activeCategory.id, categories) : undefined

  const [productsResult, allForCounts] = await Promise.all([
    getProducts({
      categoryIds: activeCategoryIds,
      search: searchQuery,
      isKit: kitOnly ? true : undefined,
      limit: 100,
      sort: SORT_PARAM[sort] ?? SORT_PARAM.pop,
    }),
    getProducts({ limit: 500 }),
  ])
  const products = productsResult.docs

  const directCounts = new Map<number, number>()
  for (const p of allForCounts.docs) {
    const catId = typeof p.category === 'object' ? p.category.id : p.category
    directCounts.set(catId, (directCounts.get(catId) ?? 0) + 1)
  }
  // Sidebar count next to a parent category is its whole subtree's count —
  // otherwise every non-leaf category (which real products are essentially
  // never tagged to directly) would show "0" despite genuinely containing
  // products, once children exist under it.
  const categoryCounts = new Map<number, number>(
    categories.map((c) => [c.id, getSubtreeIds(c.id, categories).reduce((sum, id) => sum + (directCounts.get(id) ?? 0), 0)]),
  )

  const basePath = activeCategory ? `/catalog/${activeCategory.slug}` : '/catalog'
  const resultsWord = pluralizeRu(products.length, 'позиция', 'позиции', 'позиций')

  return (
    <>
      <section className="container-page pt-3.5">
        <div className="flex flex-wrap items-end justify-between gap-5 rounded-3xl border border-border bg-card p-[26px_28px]" style={{ animation: 'bnIn 560ms cubic-bezier(0.16,1,0.3,1) both' }}>
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-subtle">
              <a href="/" className="border-none transition-colors duration-240 ease-expo hover:text-accent">Главная</a> / {kitOnly ? 'Наборы' : 'Каталог'}
            </div>
            <h1 className="mt-3 text-[clamp(30px,3.8vw,52px)] font-medium leading-none tracking-[-0.045em]">{kitOnly ? 'Наборы' : activeCategory ? activeCategory.name : 'Каталог'}</h1>
            <div className="mt-2.5 text-[13px] text-subtle">{products.length} {resultsWord}</div>
          </div>
          <div className="flex min-h-12 shrink-0 items-center gap-3.5 whitespace-nowrap rounded-full bg-muted py-0 pl-5 pr-2">
            <RentalDatePicker variant="compact" />
          </div>
        </div>
      </section>

      <section className="container-page grid-12 items-start pb-20 pt-3.5">
        <CategorySidebar
          categories={categories}
          categoryCounts={categoryCounts}
          totalCount={allForCounts.totalDocs}
          activeSlug={activeCategory?.slug}
          searchQuery={searchQuery}
          sort={sort}
        />

        <div className="col-span-full min-w-0 lg:col-span-9">
          <form method="get" action={basePath} className="relative mb-3.5">
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Поиск оборудования..."
              className="h-12 w-full rounded-2xl border border-border bg-card pl-11 pr-4 text-[14.5px] font-medium placeholder:font-normal placeholder:text-subtle"
            />
            <input type="hidden" name="sort" value={sort} />
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-subtle">
              <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="m21 21-4.3-4.3" />
            </svg>
          </form>

          {products.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card px-6 py-20 text-center">
              <div className="text-[17px] font-semibold">Ничего не найдено</div>
              <p className="mx-auto mt-2 max-w-[360px] text-[14px] text-subtle">
                Попробуйте изменить запрос или посмотреть весь каталог.
              </p>
              <a href="/catalog" className="btn-outline mt-4 inline-flex h-10 px-5 text-[11px]">Сбросить фильтры</a>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
              {products.map((p, i) => (
                <ProductCard key={p.id} product={p} delay={i * 45} />
              ))}
            </div>
          )}
        </div>
      </section>

      <CatalogAvailabilityInit />
    </>
  )
}
