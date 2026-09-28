import type { Metadata } from 'next'
import Link from 'next/link'
import PrototypeProductCard from '../../../prototype/PrototypeProductCard'
import { buildMetadata } from '../../../lib/seo'
import { getProducts } from '../../../lib/data/products'
import { getCategories } from '../../../lib/data/categories'
import { categoryNameOf } from '../../../lib/productDisplay'
import { mediaUrl } from '../../../lib/mediaUrl'
import { parsePageParam } from '../../../lib/catalogQuery'
import { buildSearchWhere, SEARCH_PAGE_SIZE } from '../../../lib/data/search'

export const metadata: Metadata = buildMetadata({ title: 'Поиск по каталогу', path: '/search' })
export const dynamic = 'force-dynamic'

// The full results page behind the header search (Enter / «Показать все
// результаты»). Runs the exact same buildSearchWhere() predicate as the
// dropdown's /api/search endpoint — see lib/data/search.ts — so what a
// visitor previews is what lands here, only paged into the shared product-
// card grid instead of the compact scrolling list. Deliberately category-
// independent: always the whole catalog.
const SORT_PARAM: Record<string, string> = { pop: '-lastSyncedAt', asc: 'price', desc: '-price' }

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string; page?: string }> }) {
  const { q, sort, page } = await searchParams
  const raw = (q ?? '').trim()
  const currentPage = parsePageParam(page)
  const where = buildSearchWhere(raw)

  // An unsearchable query (empty/one letter/stopwords only) renders the
  // prompt state rather than running a find() with an impossible predicate.
  const productsResult = where ? await getProducts({ search: raw, limit: SEARCH_PAGE_SIZE, page: currentPage, sort: SORT_PARAM[sort ?? 'pop'] ?? SORT_PARAM.pop }) : null
  const categories = productsResult ? await getCategories() : []
  // Same per-category unit labels the catalog grid uses (PrototypeCatalog's
  // unitOf); duplicated here because it closes over that component's local
  // scope — divergence would mislabel cards between the two grids.
  const unitOf = (p: NonNullable<typeof productsResult>['docs'][number]) => {
    const categoryId = typeof p.category === 'object' && p.category ? p.category.id : p.category
    const slug = typeof p.category === 'object' && p.category ? p.category.slug : categories.find((c) => c.id === categoryId)?.slug
    if (p.isKit) return 'набор / сутки'
    if (slug === 'film') return 'за плёнку'
    if (slug === 'glasses') return 'сутки'
    return p.listingType === 'rental' ? 'смена / 24 часа' : 'шт.'
  }
  const totalDocs = productsResult?.totalDocs ?? 0
  const pageCount = Math.max(1, Math.ceil(totalDocs / SEARCH_PAGE_SIZE))
  const pageHref = (target: number) => {
    const params = new URLSearchParams()
    if (raw) params.set('q', raw)
    if (sort && sort !== 'pop') params.set('sort', sort)
    if (target > 1) params.set('page', String(target))
    const qs = params.toString()
    return qs ? `/search?${qs}` : '/search'
  }

  return (
    <div className="pb-page">
      <section className="pb-container pb-grid" style={{ paddingTop: 14 }}>
        <div className="pb-card pb-page-head">
          <div>
            <div className="pb-kicker"><Link href="/" className="pb-link-hover">Главная</Link> / Поиск</div>
            <h1 className="pb-h1" style={{ marginTop: 12 }}>{raw ? `Результаты поиска: «${raw}»` : 'Поиск'}</h1>
            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--pb-sub)' }}>{where ? `${totalDocs} товаров` : 'Введите запрос в строке поиска в шапке.'}</div>
          </div>
        </div>
      </section>
      <section className="pb-container pb-grid" style={{ paddingTop: 14, paddingBottom: 80 }}>
        <div className="pb-catalog-main" style={{ gridColumn: '1 / -1' }}>
          {where && productsResult && productsResult.docs.length === 0 ? (
            <div className="pb-card" style={{ padding: '70px 24px', textAlign: 'center' }}>
              <strong style={{ fontSize: 17 }}>Ничего не найдено</strong>
              <p style={{ color: 'var(--pb-sub)' }}>Измените запрос — поиск идёт по всему каталогу: названиям, подзаголовкам и описаниям.</p>
              <Link href="/catalog" className="pb-pill pb-btn pb-btn-light" style={{ height: 42 }}>Открыть каталог</Link>
            </div>
          ) : productsResult && productsResult.docs.length > 0 ? (
            <div className="pb-products">{productsResult.docs.map((p, i) => (
              <PrototypeProductCard key={p.id} delay={i * 45} product={{ id: p.id, title: p.title, subtitle: p.subtitle, price: p.price, listingType: p.listingType, quantity: p.quantity, available: p.available, tag: p.tag, categoryName: categoryNameOf(p), imageUrl: mediaUrl(p.images?.[0]), unit: unitOf(p) }} />
            ))}</div>
          ) : null}
          {pageCount > 1 && (
            <nav style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }} aria-label="Страницы поиска">
              {currentPage > 1 ? <Link className="pb-pill pb-btn pb-btn-light" style={{ height: 40 }} href={pageHref(currentPage - 1)}>Назад</Link> : <span />}
              <span style={{ fontSize: 12.5, color: 'var(--pb-sub)' }}>Страница {currentPage} из {pageCount}</span>
              {currentPage < pageCount ? <Link className="pb-pill pb-btn pb-btn-light" style={{ height: 40 }} href={pageHref(currentPage + 1)}>Далее</Link> : <span />}
            </nav>
          )}
        </div>
      </section>
    </div>
  )
}
