import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import type { Category } from '../../payload-types'
import RentalDatePicker from '../../components/RentalDatePicker'
import PromoCarousel from '../../components/PromoCarousel'
import ProductCard from '../../components/ProductCard'
import { getCategories } from '../../lib/data/categories'
import { getCategoryProductStats, getLowestRentalPrice, getProductTotals, getProducts } from '../../lib/data/products'
import { getSiteSettings } from '../../lib/data/siteSettings'
import { getActivePromotions } from '../../lib/data/promotions'
import { mediaUrl } from '../../lib/mediaUrl'
import { formatCurrency } from '../../lib/pricing'
import { pluralizeRu } from '../../lib/dateRange'
import { getSubtreeIds } from '../../lib/categoryTree'
import { buildMetadata } from '../../lib/seo'

// Ported from apps/web/src/pages/index.astro (docs/PLAN-next-migration.md
// Stage 2, page group 3 — the largest template, 297 lines). Structure and
// data logic are verbatim; only the syntax changes (Astro frontmatter ->
// async Server Component, class -> className, inline animation style
// strings -> style objects).
export const metadata: Metadata = buildMetadata({ title: 'Прокат фото- и видеотехники', path: '/' })

// Homepage cache freshness: stock/availability/promotions change from admin
// actions and the МойСклад sync, not from anything Next can see at request
// time — this must re-fetch on every request rather than serve a stale
// build-time snapshot.
export const dynamic = 'force-dynamic'

// C4 (design_handoff_swiss_bento/08-instruction.md, G3): real rendered
// slots, measured from this page's own grid classes (both are `grid-cols-2
// sm:grid-cols-3` inside a plain container-page, no sidebar competing for
// width the way CatalogPage's grid has from lg/1024px up).
// Category tiles: aspect-[4/3] image inside a p-4 card — caps around 425px
// once container-page's 1460px max-width kicks in.
const CATEGORY_TILE_SIZES = '(min-width: 1520px) 425px, (min-width: 640px) 28vw, 42vw'
// Kits grid reuses ProductCard, whose own DEFAULT_SIZES assumes
// CatalogPage's sidebar-narrowed width — this grid is genuinely wider
// (~429px cap vs. ~312px), so it needs its own override.
const KITS_GRID_SIZES = '(min-width: 1520px) 429px, (min-width: 1024px) 28vw, (min-width: 640px) 30vw, 45vw'

export default async function HomePage() {
  // Backlog item 10 (docs/ROADMAP-2.0.md): the five values this page used to
  // derive in JS from one getProducts({ limit: 500, sort: 'price' }) fetch
  // — two headline stats, a "от N ₽" hero line, a name ticker and
  // per-category tile aggregates — are each their own targeted query now
  // (lib/data/products.ts). They were never the "read one cheapest price"
  // case an earlier roadmap pass assumed, which is exactly why a `limit: 1`
  // tweak would have silently broken four of them; each one keeps its own
  // semantics here instead.
  const [categories, featuredResult, totals, fromPrice, marqueeResult, siteSettings, promotions, kitsResult] = await Promise.all([
    getCategories(),
    getProducts({ limit: 8, sort: '-lastSyncedAt' }),
    getProductTotals(),
    getLowestRentalPrice(),
    // Ticker names only — the ten cheapest, same rows .slice(0, 10) took off
    // the price-sorted fetch before. depth: 0 because nothing but `title` is
    // read from these.
    getProducts({ limit: 10, sort: 'price', depth: 0 }),
    getSiteSettings(),
    getActivePromotions(),
    getProducts({ isKit: true, limit: 6 }),
  ])
  const kits = kitsResult.docs

  // Top-level only — a subcategory tile on the homepage would be a strange
  // entry point (design's own 6-tile grid was always meant as a curated top
  // level, not the full depth), children are reachable from the catalog
  // sidebar and from their parent's own catalog page.
  const featuredCategories = categories.filter((c) => c.parent == null).slice(0, 6)
  const products = featuredResult.docs
  const heroImageUrl = mediaUrl(siteSettings.heroBannerImage)
  const heroImageMobileUrl = mediaUrl(siteSettings.heroBannerImageMobile) ?? heroImageUrl

  // Real per-category aggregates (count + cheapest price) for the category
  // tile "meta" line — no invented category taxonomy/tags, just what the
  // catalog actually has.
  // This one query can't join the Promise.all above: which categories to
  // aggregate is only known once `categories` has resolved. It asks about
  // the rendered tiles' own subtrees rather than every category in the tree,
  // since categoryMeta() below never looks up anything else.
  const statCategoryIds = Array.from(new Set(featuredCategories.flatMap((c) => getSubtreeIds(c.id, categories))))
  const categoryStats = await getCategoryProductStats(statCategoryIds)
  function categoryMeta(c: Category): string {
    // Aggregated over the whole subtree, not just this category directly —
    // a top-level tile like "Аренда оборудования" carries essentially no
    // products of its own (real listings sit on its leaf subcategories), so
    // a direct-only count would show empty for exactly the tiles homepage
    // actually links to.
    const subtreeIds = getSubtreeIds(c.id, categories)
    let count = 0
    let minPrice: number | undefined
    for (const id of subtreeIds) {
      const stats = categoryStats.get(id)
      if (!stats) continue
      count += stats.count
      minPrice = minPrice === undefined ? stats.minPrice : Math.min(minPrice, stats.minPrice)
    }
    if (count === 0 || minPrice === undefined) return ''
    const word = pluralizeRu(count, 'позиция', 'позиции', 'позиций')
    return `${count} ${word} · от ${formatCurrency(minPrice)}`
  }

  const promoSlides = promotions.map((p) => ({
    id: p.id,
    title: p.title,
    kicker: p.kicker || undefined,
    text: p.text || undefined,
    imageUrl: mediaUrl(p.image),
    // Admin-set linkUrl (e.g. an external link) wins if present; otherwise
    // fall back to this promotion's own standalone page.
    linkUrl: p.linkUrl || (p.slug ? `/promotions/${p.slug}` : undefined),
  }))

  // Real product names for the ticker — never the design reference's fictional
  // demo camera list.
  const marqueeNames = marqueeResult.docs.map((p) => p.title)

  const popular = products.slice(0, 4)
  const currentMonthLabel = new Date().toLocaleDateString('ru-RU', { month: 'long' }).replace(/^./, (c) => c.toUpperCase())

  const stats = [
    { value: `${totals.total}`, label: 'Позиций в парке' },
    { value: `${totals.inStock}`, label: 'Свободны сегодня' },
    { value: siteSettings.depositLabel || '0 ₽', label: siteSettings.depositCaption || 'Залог' },
    { value: siteSettings.pickupTimeLabel || '10 мин', label: siteSettings.pickupTimeCaption || 'Выдача по паспорту' },
  ]

  const steps = (
    siteSettings.howItWorksSteps?.length
      ? siteSettings.howItWorksSteps
      : [
          { title: 'Выбираете даты', text: 'Каталог сразу показывает, что свободно на выбранные даты.' },
          { title: 'Оставляете заявку', text: 'Имя и телефон — без регистрации. Перезвоним и подтвердим бронь.' },
          { title: 'Забираете технику', text: 'Приезжаете по адресу, получаете оборудование, короткий инструктаж.' },
          { title: 'Возвращаете', text: 'В оговорённый срок, по тому же адресу.' },
        ]
  ).map((s, i) => ({ ...s, n: i + 1 }))

  const contact = {
    phone: siteSettings.contactPhone || '+7 (996) 527-0026',
    telegram: siteSettings.contactTelegram || '@Playbackrental_admin',
    address: siteSettings.contactAddress || 'г. Кемерово, ул. Демьяна Бедного, 6',
    hours: siteSettings.contactHours || '10:00 — 21:00',
  }

  return (
    <>
      <section className="container-page pt-3.5">
        <div className="grid-12">
          <div className="flex flex-col rounded-[26px] border border-border bg-card px-9 pt-[38px] pb-[34px] col-span-6 min-[1021px]:col-span-7" style={{ animation: 'bnIn 560ms var(--ease-expo) both' }}>
            <div className="flex items-center justify-between gap-4 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">
              <span>{siteSettings.heroKicker || 'Прокат съёмочной техники'}</span>
              <span className="rounded-full bg-muted px-[11px] py-1.5">{siteSettings.heroCity || 'Кемерово'}</span>
            </div>
            <h1 className="mt-6 text-[clamp(42px,5.4vw,84px)] font-medium leading-[0.94] tracking-[-0.045em] text-wrap-balance">
              {siteSettings.heroHeadline || 'Техника для съёмки без залога'}
            </h1>
            <div className="mt-6.5 h-px origin-left bg-[rgba(10,10,10,0.12)]" style={{ animation: 'bnRule 900ms var(--ease-expo) 300ms both' }}></div>
            <p className="mt-[22px] max-w-[460px] text-[16px] leading-[1.5] text-muted-foreground text-wrap-pretty">
              {siteSettings.heroSubtext || 'Камеры Sony и Canon, объективы, свет, стедикамы, дроны, звук и аксессуары — весь парк для съёмочной группы любого масштаба, в Кемерове.'}
            </p>
            <div className="min-h-[26px] flex-1"></div>
            <div className="flex flex-wrap gap-2.5">
              <Link href="/catalog" className="btn-primary h-[54px] gap-5 pl-6 pr-3 hover:gap-[30px]">
                <span>Смотреть каталог</span>
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white/15">→</span>
              </Link>
              <Link href="/catalog?type=kit" className="btn-ghost h-[54px] px-6">Готовые наборы</Link>
            </div>
          </div>

          <div className="flex flex-col gap-3.5 col-span-6 min-[1021px]:col-span-5">
            {/* C4 (design_handoff_swiss_bento/08-instruction.md, G3): the
                homepage hero cover — the one slot the instruction singles
                out for `priority`. Both the desktop and mobile variants
                below are always in the DOM (CSS `hidden md:block` /
                `md:hidden` just toggles which one is visible), so both get
                `priority`: whichever one the viewport actually shows is a
                same-page LCP candidate, and eagerly preloading the other
                (invisible) variant too is a deliberate, bounded trade for a
                single hero image, not a general pattern used elsewhere on
                this page. `fill` replaces the old `absolute inset-0 h-full
                w-full` by itself (Next sets that positioning), so those
                classes are dropped from className; the crop/hover-zoom
                classes (object-cover, the hover-zoom transform/duration/
                ease/scale set) are kept verbatim on the same element. */}
            <div className="relative hidden min-h-[390px] flex-1 overflow-hidden rounded-[26px] border border-border bg-[linear-gradient(150deg,#e6e4e0,#ded9d1)] min-[761px]:block" style={{ animation: 'bnClip 900ms var(--ease-expo) 120ms both' }}>
              {heroImageUrl && (
                <Image
                  src={heroImageUrl}
                  alt="Playback Rental"
                  fill
                  priority
                  sizes="(min-width: 1520px) 575px, (min-width: 1024px) 38vw, 92vw"
                  className="object-cover transition-transform duration-[900ms] ease-expo hover:scale-[1.04]"
                />
              )}
              <div className="absolute bottom-3.5 left-3.5 right-3.5 flex items-center justify-between rounded-2xl bg-white/[0.82] px-4 py-3 text-[10.5px] font-semibold uppercase tracking-[0.13em] backdrop-blur-[18px]">
                <span>Sony · Canon · GoPro</span><span className="text-accent">Fig. 01</span>
              </div>
            </div>
            <div className="relative h-[340px] overflow-hidden rounded-[22px] border border-border bg-[linear-gradient(150deg,#e6e4e0,#ded9d1)] min-[761px]:hidden">
              {heroImageMobileUrl && (
                <Image src={heroImageMobileUrl} alt="Playback Rental" fill priority sizes="100vw" className="object-cover" />
              )}
            </div>

            <div className="rounded-[26px] border border-border bg-card p-[22px_24px]" style={{ animation: 'bnIn 560ms var(--ease-expo) 120ms both' }}>
              <RentalDatePicker variant="hero" />
              {fromPrice !== undefined && (
                <div className="mt-2.5 text-[12.5px] text-subtle">{featuredResult.totalDocs}+ позиций от {formatCurrency(fromPrice)} · {categories.length} категорий</div>
              )}
            </div>
          </div>

          {stats.map((s, i) => (
            <div
              key={s.label}
              className="rounded-[22px] border border-border bg-card px-[22px] py-5 transition-[transform,box-shadow] duration-[420ms] ease-expo hover:-translate-y-1 hover:shadow-[var(--shadow-medium)] col-span-3 min-[1021px]:col-span-3"
              style={{ animation: 'bnIn 560ms var(--ease-expo) both', animationDelay: `${Math.min(i * 70, 400)}ms` }}
            >
              <div className="text-[32px] font-medium tracking-[-0.04em]">{s.value}</div>
              <div className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.13em] text-subtle">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {marqueeNames.length > 0 && (
        <section className="container-page pt-3.5">
          <div className="overflow-hidden rounded-[22px] bg-primary text-primary-foreground">
            <div className="flex w-max" style={{ animation: 'bnMark 40s linear infinite' }}>
              {[0, 1].map((rowIdx) => (
                <div key={rowIdx} className="flex h-[50px] items-center gap-11 whitespace-nowrap pr-11 text-[10.5px] font-semibold uppercase tracking-[0.2em]">
                  {marqueeNames.map((name, i) => (
                    <span key={i} className="flex items-center gap-11">
                      <span>{name}</span><span className="text-accent">◆</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {promoSlides.length > 0 && (
        <section className="container-page">
          <PromoCarousel promos={promoSlides} />
        </section>
      )}

      {featuredCategories.length > 0 && (
        <section className="container-page pt-[34px]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Категории</div>
              <h2 className="mt-2.5 text-[clamp(26px,3vw,40px)] font-medium tracking-[-0.04em]">Выберите, чем снимать</h2>
            </div>
            <Link href="/catalog" className="flex h-[42px] items-center gap-3 rounded-full border border-border bg-card px-[18px] text-[11px] font-semibold uppercase tracking-[0.12em] transition-[background-color,color,gap] duration-240 ease-expo hover:gap-5 hover:bg-primary hover:text-primary-foreground">
              <span>Весь каталог</span><span>→</span>
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3.5 min-[761px]:grid-cols-2 min-[1021px]:grid-cols-3">
            {featuredCategories.map((c, i) => {
              const imageUrl = mediaUrl(c.image)
              const meta = categoryMeta(c)
              return (
                <Link
                  key={c.id}
                  href={`/catalog/${c.slug}`}
                  className="group rounded-[24px] border border-border bg-card p-4 transition-[transform,box-shadow,border-color] duration-[420ms] ease-expo hover:-translate-y-1 hover:border-[rgba(10,10,10,0.15)] hover:shadow-[var(--shadow-medium)]"
                  style={{ animation: 'bnIn 560ms var(--ease-expo) both', animationDelay: `${Math.min(i * 60, 400)}ms` }}
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[linear-gradient(150deg,#e6e4e0,#ded9d1)]">
                    {imageUrl && (
                      <Image src={imageUrl} alt={c.name} fill sizes={CATEGORY_TILE_SIZES} className="object-cover transition-transform duration-[900ms] ease-expo group-hover:scale-[1.04]" />
                    )}
                    {c.tag && (
                      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-[rgba(10,10,10,0.72)] px-[11px] py-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-[10px]">
                        {c.tag}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-3 px-1 pb-1">
                    <div>
                      <div className="text-[19px] font-medium leading-[1.2] tracking-[-0.025em]">{c.name}</div>
                      {meta && <div className="mt-1.5 text-[12.5px] text-subtle">{meta}</div>}
                    </div>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[14px] transition-colors duration-240 ease-expo">→</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {kits.length > 0 && (
        <section className="container-page pt-[34px]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Наборы</div>
              <h2 className="mt-2.5 text-[clamp(26px,3vw,40px)] font-medium tracking-[-0.04em]">Собрано под сценарий</h2>
            </div>
            <span className="max-w-[280px] text-right text-[13px] text-subtle">Дешевле, чем брать позиции по отдельности</span>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3.5 min-[761px]:grid-cols-2 min-[1021px]:grid-cols-3">
            {kits.map((k, i) => (
              // C4: no sidebar competes with this grid's width (unlike
              // CatalogPage's), so its real card is wider than ProductCard's
              // own default sizes — see KITS_GRID_SIZES.
              <ProductCard key={k.id} product={k} delay={i * 60} sizes={KITS_GRID_SIZES} variant="kit" />
            ))}
          </div>
        </section>
      )}

      <section className="container-page pt-5">
        <div className="grid-12">
          {popular.length > 0 && (
            <div className="rounded-3xl border border-border bg-card px-6.5 pb-3 pt-6.5 col-span-6 min-[1021px]:col-span-7">
              <div className="flex items-baseline justify-between">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Берут чаще всего</div>
                <span className="text-[11px] text-subtle">{currentMonthLabel}</span>
              </div>
              <div className="mt-2">
                {popular.map((p, i) => {
                  const categoryName = typeof p.category === 'object' ? p.category.name : undefined
                  return (
                    <Link
                      key={p.id}
                      href={`/product/${p.id}`}
                      className="grid grid-cols-[34px_1fr_auto_28px] items-center gap-3.5 rounded-2xl border-none px-2.5 py-[15px] transition-[background-color,padding-left] duration-240 ease-expo hover:bg-muted hover:pl-4.5 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border"
                    >
                      <span className="text-[11px] font-semibold text-subtle">{String(i + 1).padStart(2, '0')}</span>
                      <div>
                        <div className="text-[17px] font-medium tracking-[-0.025em]">{p.title}</div>
                        {categoryName && <div className="mt-0.5 text-[12px] text-subtle">{categoryName}</div>}
                      </div>
                      <span className="text-[16px] font-semibold tracking-[-0.02em]">{formatCurrency(p.price)}</span>
                      <span className="text-right text-[14px] text-accent">→</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-border bg-card p-6.5 col-span-6 min-[1021px]:col-span-5">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Как это работает</div>
            {steps.map((s) => (
              <div key={s.n} className="flex gap-4 rounded-2xl px-2.5 py-4 transition-colors duration-240 ease-expo hover:bg-muted">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">{s.n}</span>
                <div>
                  <div className="text-[16px] font-medium tracking-[-0.02em]">{s.title}</div>
                  <div className="mt-1 text-[13px] leading-[1.45] text-subtle">{s.text}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-[26px] bg-primary p-9 text-primary-foreground col-span-6 min-[1021px]:col-span-12">
            <div className="grid grid-cols-1 gap-9 lg:grid-cols-[1.15fr_1fr]">
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/50">{siteSettings.ctaKicker || 'Нужен совет'}</div>
                <div className="mt-4 text-[clamp(26px,3.2vw,44px)] font-medium leading-[1.02] tracking-[-0.04em]">{siteSettings.ctaHeadline || 'Не знаете, что взять на съёмку?'}</div>
                <p className="mt-4 max-w-[420px] text-[14.5px] leading-[1.55] text-white/62">
                  {siteSettings.ctaSubtext || 'Опишите задачу — соберём комплект под неё и посчитаем стоимость на ваши даты.'}
                </p>
                <Link href="/contact" className="mt-7 inline-flex h-[54px] items-center gap-4.5 rounded-full bg-white pl-6 pr-2.5 text-[11.5px] font-semibold uppercase tracking-[0.13em] text-foreground transition-[gap,background-color] duration-240 ease-expo hover:gap-7 hover:bg-white/90">
                  <span>Написать нам</span>
                  <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[rgba(10,10,10,0.1)]">→</span>
                </Link>
              </div>
              <div className="flex flex-col justify-end gap-2">
                {[
                  ['Телефон', contact.phone],
                  ['Telegram', contact.telegram],
                  ['Адрес', contact.address],
                  ['Часы', contact.hours],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between rounded-2xl bg-white/[0.06] px-4 py-3.5 text-[13.5px] transition-colors duration-240 ease-expo hover:bg-white/[0.13]">
                    <span className="text-white/55">{label}</span><span>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
