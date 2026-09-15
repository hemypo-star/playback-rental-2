import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import ProductCard from '../../../../components/ProductCard'
import PromoCarousel from '../../../../components/PromoCarousel'
import { getPromotionBySlug, getActivePromotions } from '../../../../lib/data/promotions'
import { mediaUrl } from '../../../../lib/mediaUrl'
import { buildMetadata } from '../../../../lib/seo'
import type { Product, Category } from '../../../../payload-types'

// Ported from apps/web/src/pages/promotions/[slug].astro (docs/PLAN-next-
// migration.md Stage 2). The Promotions collection, its admin CRUD, and
// this route's content model already existed before this migration (see
// CLAUDE.md's 2026-08-14 dev-log entry, "Страница акции /promotions/:slug")
// — this is purely the storefront route's port to apps/cms, no new
// functionality. Astro.redirect('/404') -> next/navigation's notFound(),
// which renders the nearest not-found boundary directly rather than
// round-tripping through an actual /404 route (apps/web never had one of
// its own either — Astro.redirect('/404') just fell through to Astro's own
// default not-found handling for that path).
export const dynamic = 'force-dynamic'

// C4 (design_handoff_swiss_bento/08-instruction.md, G3): real rendered
// slots. Hero: `grid-cols-1 lg:grid-cols-[1fr_1.2fr]` inside container-page —
// full width below lg/1024px, 1/2.2 of the capped-1400px content from there
// up (~618px cap). Category tiles: identical markup/classes to the
// homepage's own category-tile grid (see page.tsx's CATEGORY_TILE_SIZES),
// so this reuses the same value rather than re-deriving it.
const PROMO_HERO_SIZES = '(min-width: 1520px) 618px, (min-width: 1024px) 41vw, 92vw'
const PROMO_CATEGORY_TILE_SIZES = '(min-width: 1520px) 425px, (min-width: 640px) 28vw, 42vw'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const promo = await getPromotionBySlug(slug)
  if (!promo) return {}
  return buildMetadata({
    title: promo.title,
    description: promo.text ?? undefined,
    path: `/promotions/${slug}`,
    image: mediaUrl(promo.image),
  })
}

export default async function PromotionPage({ params }: Props) {
  const { slug } = await params
  const promo = await getPromotionBySlug(slug)
  if (!promo) notFound()

  const imageUrl = mediaUrl(promo.image)
  const linkedProducts = (promo.linkedProducts ?? []).filter((p): p is Product => typeof p === 'object')
  const linkedCategories = (promo.linkedCategories ?? []).filter((c): c is Category => typeof c === 'object')

  const otherPromotions = (await getActivePromotions())
    .filter((p) => p.id !== promo.id)
    .map((p) => ({
      id: p.id,
      title: p.title,
      kicker: p.kicker || undefined,
      text: p.text || undefined,
      imageUrl: mediaUrl(p.image),
      linkUrl: p.linkUrl || (p.slug ? `/promotions/${p.slug}` : undefined),
    }))

  return (
    <section className="container-page py-16">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div className="relative aspect-[3/4] overflow-hidden rounded-[26px] bg-[linear-gradient(150deg,#e6e4e0,#ded9d1)]">
          {imageUrl && <Image src={imageUrl} alt={promo.title} fill sizes={PROMO_HERO_SIZES} className="object-cover" />}
        </div>
        <div>
          {promo.kicker && <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">{promo.kicker}</div>}
          <h1 className="mt-2.5 text-[clamp(30px,4vw,46px)] font-medium tracking-[-0.04em]">{promo.title}</h1>
          {promo.content && (
            <div className="mt-6 max-w-[560px] whitespace-pre-wrap text-[15px] leading-[1.65] text-muted-foreground">{promo.content}</div>
          )}
          {/* C1 (design_handoff_swiss_bento/08-instruction.md, G2): left as a
              plain <a>, deliberately not next/link — promo.linkUrl is a free-
              text admin field ("Admin-set linkUrl (e.g. an external link)
              wins if present", see the comment building it above); it can
              point anywhere, including off-site, and next/link's own
              prefetch/client-routing only make sense for a known-internal
              destination. */}
          {promo.linkUrl && !promo.linkUrl.startsWith('/promotions/') && (
            <a href={promo.linkUrl} className="btn-primary mt-6 inline-flex">
              Подробнее
            </a>
          )}
        </div>
      </div>

      {linkedProducts.length > 0 && (
        <div className="mt-16">
          <h2 className="text-[clamp(22px,2.6vw,32px)] font-medium tracking-[-0.03em]">Товары по акции</h2>
          <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
            {linkedProducts.map((p, i) => (
              <ProductCard key={p.id} product={p} delay={i * 60} />
            ))}
          </div>
        </div>
      )}

      {linkedCategories.length > 0 && (
        <div className="mt-16">
          <h2 className="text-[clamp(22px,2.6vw,32px)] font-medium tracking-[-0.03em]">Категории по акции</h2>
          <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3">
            {linkedCategories.map((c) => {
              const catImageUrl = mediaUrl(c.image)
              return (
                <Link
                  key={c.id}
                  href={`/catalog/${c.slug}`}
                  className="rounded-[24px] border border-border bg-card p-4 transition-[transform,box-shadow,border-color] duration-[420ms] ease-expo hover:-translate-y-1 hover:border-[rgba(10,10,10,0.15)] hover:shadow-[var(--shadow-medium)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[linear-gradient(150deg,#e6e4e0,#ded9d1)]">
                    {catImageUrl && (
                      <Image src={catImageUrl} alt={c.name} fill sizes={PROMO_CATEGORY_TILE_SIZES} className="object-cover" />
                    )}
                  </div>
                  <div className="mt-4 px-1 pb-1 text-[19px] font-medium leading-[1.2] tracking-[-0.025em]">{c.name}</div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {otherPromotions.length > 0 && (
        <div className="mt-16 border-t border-border pt-2">
          <PromoCarousel promos={otherPromotions} />
        </div>
      )}
    </section>
  )
}
