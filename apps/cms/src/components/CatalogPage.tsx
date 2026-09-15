import Link from 'next/link'
import type { Category } from '../payload-types'
import CategorySidebar from './CategorySidebar'
import ProductCard from './ProductCard'
import RentalDatePicker from './RentalDatePicker'
import CatalogAvailabilityInit from './CatalogAvailabilityInit'
import { getCategories } from '../lib/data/categories'
import { getCategoryProductCounts, getProducts } from '../lib/data/products'
import { pluralizeRu } from '../lib/dateRange'
import { getSubtreeIds } from '../lib/categoryTree'
import { buildCatalogUrl } from '../lib/catalogQuery'

// Ported from apps/web/src/components/CatalogPage.astro (docs/PLAN-next-
// migration.md Stage 2). Shared by both catalog routes (/catalog,
// /catalog/[slug]), same as the Astro original.
interface Props {
  activeCategory?: Category
  searchQuery?: string
  sort?: string
  kitOnly?: boolean
  page?: number
}

const SORT_PARAM: Record<string, string> = {
  pop: '-lastSyncedAt',
  asc: 'price',
  desc: '-price',
}

// C5 (design_handoff_swiss_bento/08-instruction.md, N7): 24 instead of the
// old unpaginated 100 — divides evenly into both grid breakpoints below
// (2 cols on mobile, 3 from sm up), so a page never ends on a half-empty
// row on either layout.
const PAGE_SIZE = 24

export default async function CatalogPage({ activeCategory, searchQuery, sort = 'pop', kitOnly = false, page = 1 }: Props) {
  // Categories fetched first — a parent category's own product filter needs
  // its resolved subtree (self + every descendant) before the products query
  // can run, so a parent page shows children's products too, not just
  // whatever's tagged directly on the parent itself (rarely anything, given
  // real listings live on the leaf categories).
  const categories = await getCategories()
  const activeCategoryIds = activeCategory ? getSubtreeIds(activeCategory.id, categories) : undefined
  // Defensive re-clamp — callers already run page through
  // lib/catalogQuery.ts's parsePageParam, but this component's own Props are
  // a public surface, not just the two route files that currently call it.
  const currentPage = Number.isInteger(page) && page > 0 ? page : 1

  const [productsResult, directCounts] = await Promise.all([
    getProducts({
      categoryIds: activeCategoryIds,
      search: searchQuery,
      isKit: kitOnly ? true : undefined,
      limit: PAGE_SIZE,
      page: currentPage,
      sort: SORT_PARAM[sort] ?? SORT_PARAM.pop,
    }),
    // C5 (N9): was getProducts({ limit: 500 }) — up to 500 full product
    // documents fetched on every catalog render just to tally them into
    // per-category counts in JS. getCategoryProductCounts does the tally as
    // a COUNT(*) per category in the database instead (see its own comment
    // in lib/data/products.ts for the query-count trade-off).
    getCategoryProductCounts(categories.map((c) => c.id)),
  ])
  const products = productsResult.docs

  // Sidebar count next to a parent category is its whole subtree's count —
  // otherwise every non-leaf category (which real products are essentially
  // never tagged to directly) would show "0" despite genuinely containing
  // products, once children exist under it. Unchanged from before C5: only
  // where directCounts' numbers come from changed (a per-category COUNT(*)
  // now, a JS tally over 500 fetched docs before), not this summation.
  const categoryCounts = new Map<number, number>(
    categories.map((c) => [c.id, getSubtreeIds(c.id, categories).reduce((sum, id) => sum + (directCounts.get(id) ?? 0), 0)]),
  )
  // Every product has a required category (see Products.ts), so the total
  // available count is exactly the sum of every category's direct count —
  // no extra query needed for it.
  const totalCount = [...directCounts.values()].reduce((sum, n) => sum + n, 0)

  const basePath = activeCategory ? `/catalog/${activeCategory.slug}` : '/catalog'
  // C5 (N7): was products.length, which silently printed "100 позиций" once
  // the catalog held more than the old hardcoded limit — a number that was
  // simply wrong past that point, not just misleading. totalDocs is
  // Payload's own count of every matching row across all pages, honest
  // regardless of how many happen to be on this one.
  const resultsWord = pluralizeRu(productsResult.totalDocs, 'позиция', 'позиции', 'позиций')

  return (
    <>
      <section className="container-page pt-3.5">
        <div className="flex flex-wrap items-end justify-between gap-5 rounded-3xl border border-border bg-card p-[26px_28px]" style={{ animation: 'bnIn 560ms var(--ease-expo) both' }}>
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-subtle">
              <Link href="/" className="border-none transition-colors duration-240 ease-expo hover:text-accent">Главная</Link> / {kitOnly ? 'Наборы' : 'Каталог'}
            </div>
            <h1 className="mt-3 text-[clamp(30px,3.8vw,52px)] font-medium leading-none tracking-[-0.045em]">{kitOnly ? 'Наборы' : activeCategory ? activeCategory.name : 'Каталог'}</h1>
            <div className="mt-2.5 text-[13px] text-subtle">{productsResult.totalDocs} {resultsWord}</div>
          </div>
          <div className="flex min-h-12 shrink-0 items-center gap-3.5 whitespace-nowrap rounded-full bg-muted py-0 pl-5 pr-2">
            {/* Finding 2 (2026-09-11 live pass over block B): this used to be
                CatalogDatePickerTrigger, a small client wrapper whose only
                real job was bridging OPEN_DATE_PICKER_EVENT to its own
                RentalDatePicker ref (see that event's own definition in
                stores/dates.ts). That listener moved to Navbar.tsx — the one
                place already mounted on every (frontend) page — so this is
                now just the plain compact-variant trigger it always visually
                was: a Server Component (CatalogPage) rendering a Client
                Component directly needs no wrapper of its own. */}
            <RentalDatePicker variant="compact" />
          </div>
        </div>
      </section>

      <section className="container-page grid-12 items-start pb-20 pt-3.5">
        <CategorySidebar
          categories={categories}
          categoryCounts={categoryCounts}
          totalCount={totalCount}
          activeSlug={activeCategory?.slug}
          searchQuery={searchQuery}
          sort={sort}
          kitOnly={kitOnly}
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
            {/* C6 (design_handoff_swiss_bento/08-instruction.md, N8): the fix
                — this input didn't exist before, so a search submitted from
                within "Наборы" silently dropped back into the general
                catalog (sort survived via the input above it, kit did not).
                No hidden `page` input alongside it: a new search should land
                on page 1, not wherever the visitor was scrolled to under the
                old query — buildCatalogUrl's pager links are the only place
                that ever sets `page` explicitly, for the same reason. */}
            {kitOnly && <input type="hidden" name="type" value="kit" />}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-subtle">
              <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="m21 21-4.3-4.3" />
            </svg>
          </form>

          {productsResult.totalDocs === 0 ? (
            <div className="rounded-3xl border border-border bg-card px-6 py-20 text-center">
              <div className="text-[17px] font-semibold">Ничего не найдено</div>
              <p className="mx-auto mt-2 max-w-[360px] text-[14px] text-subtle">
                Попробуйте изменить запрос или посмотреть весь каталог.
              </p>
              {/* C1 (design_handoff_swiss_bento/08-instruction.md, G2): left as
                  a plain <a>, deliberately not next/link — same reasoning as
                  CategorySidebar's category/sort/reset links (see that
                  file's own comment). This can resolve to the *same* /catalog
                  route the visitor is already on (only the search query
                  differs), which Next treats as a re-render of the current
                  page, not a remount — CatalogAvailabilityInit's effect
                  (`useEffect(() => initCatalogAvailability(), [])`) takes a
                  one-time snapshot of the product-card DOM nodes and would
                  not re-run, silently going stale against the freshly
                  server-rendered grid. A full navigation sidesteps that by
                  construction; fixing the effect to survive a same-route
                  soft navigation is a catalog-refresh change, out of C1's
                  scope (adjacent to C2/C5, not this item). */}
              <a href="/catalog" className="btn-outline mt-4 inline-flex h-10 px-5 text-[11px]">Сбросить фильтры</a>
            </div>
          ) : products.length === 0 ? (
            // C5: totalDocs > 0 but this specific page came back empty — the
            // visitor (or a stale bookmarked/shared link) landed on a page
            // number past the end, most likely because the result set shrank
            // under a filter change since that link was generated. Distinct
            // from the true "nothing matches at all" case above, which is
            // why this isn't folded into the totalDocs === 0 branch.
            <div className="rounded-3xl border border-border bg-card px-6 py-20 text-center">
              <div className="text-[17px] font-semibold">Такой страницы нет</div>
              <p className="mx-auto mt-2 max-w-[360px] text-[14px] text-subtle">
                Показаны не все {productsResult.totalDocs} {resultsWord} — вернитесь к началу списка.
              </p>
              <a href={buildCatalogUrl(basePath, { q: searchQuery, sort, kit: kitOnly })} className="btn-outline mt-4 inline-flex h-10 px-5 text-[11px]">
                На первую страницу
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
              {products.map((p, i) => (
                <ProductCard key={p.id} product={p} delay={i * 45} />
              ))}
            </div>
          )}

          {/* C5 (design_handoff_swiss_bento/08-instruction.md, N7): the honest
              other half of "либо пагинация, либо честный счётчик из totalDocs
              плюс догрузка" — pagination was chosen over load-more. This is a
              plain Server Component with no client state of its own (dates/
              cart are the only client-side pieces on this page), and every
              other catalog filter already works as a GET link/form the same
              way; a load-more button would need its own client fetch (a new
              API route, since the Local API only runs server-side) just to
              append a second page of cards, plus a real answer for how
              CatalogAvailabilityInit's one-time DOM snapshot below picks up
              newly-appended cards without a full remount — the exact problem
              the sidebar's plain <a> links already exist to avoid. A plain
              page link sidesteps both: same GET-navigation shape as every
              other filter here, and a fresh page is always a fresh server
              render, so the snapshot is never stale. */}
          {productsResult.totalPages > 1 && (
            <nav aria-label="Страницы каталога" className="mt-5 flex items-center justify-between gap-3">
              {productsResult.hasPrevPage ? (
                <a
                  href={buildCatalogUrl(basePath, { q: searchQuery, sort, kit: kitOnly, page: currentPage - 1 })}
                  className="btn-outline h-10 px-5 text-[11px]"
                >
                  Назад
                </a>
              ) : (
                <span className="btn-outline h-10 px-5 text-[11px] pointer-events-none opacity-40">Назад</span>
              )}
              <div className="text-[12.5px] text-subtle">
                Страница {currentPage} из {productsResult.totalPages}
              </div>
              {productsResult.hasNextPage ? (
                <a
                  href={buildCatalogUrl(basePath, { q: searchQuery, sort, kit: kitOnly, page: currentPage + 1 })}
                  className="btn-outline h-10 px-5 text-[11px]"
                >
                  Далее
                </a>
              ) : (
                <span className="btn-outline h-10 px-5 text-[11px] pointer-events-none opacity-40">Далее</span>
              )}
            </nav>
          )}
        </div>
      </section>

      <CatalogAvailabilityInit />
    </>
  )
}
