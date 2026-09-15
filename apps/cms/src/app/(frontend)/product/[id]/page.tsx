import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import ProductPurchasePanel from '../../../../components/ProductPurchasePanel'
import { getProductById, getProducts } from '../../../../lib/data/products'
import { mediaUrl } from '../../../../lib/mediaUrl'
import { formatCurrency } from '../../../../lib/pricing'
import { buildMetadata, siteOrigin } from '../../../../lib/seo'

// Ported from apps/web/src/pages/product/[id].astro (docs/PLAN-next-
// migration.md Stage 2). Astro.redirect() -> next/navigation's redirect();
// the REST client's PayloadApiError/404 instanceof check becomes
// getProductById()'s disableErrors:true → null (see lib/data/products.ts).
export const dynamic = 'force-dynamic'

// C4 (design_handoff_swiss_bento/08-instruction.md, G3): real rendered
// slots, measured from this page's own grid-12 column spans
// (`sm:col-span-6 lg:col-span-7` for the gallery column — full width below
// lg/1024px, 7/12 of container-page's capped-1460px width from there up).
// Not `priority` per the instruction ("приоритет только у обложки героя") —
// the homepage hero cover is the one image that gets it; this page's own
// main photo, real as its LCP candidacy is, stays lazy like every other
// non-hero slot.
const GALLERY_MAIN_SIZES = '(min-width: 1520px) 811px, (min-width: 1024px) 54vw, 92vw'
// 4-col thumbnail strip nested inside the same gallery column, gap-2.5.
const GALLERY_THUMB_SIZES = '(min-width: 1520px) 195px, (min-width: 1024px) 13vw, 23vw'
// Related-products grid (grid-cols-1 sm:grid-cols-3) nested in the same
// column — 1 col (near-full width) below sm, 3 cols from sm up.
const RELATED_SIZES = '(min-width: 1520px) 237px, (min-width: 1024px) 15vw, (min-width: 640px) 28vw, 85vw'

interface Props {
  params: Promise<{ id: string }>
}

async function loadProduct(idParam: string) {
  const id = Number(idParam)
  if (!id || Number.isNaN(id)) redirect('/catalog')
  const product = await getProductById(id)
  if (!product) redirect('/catalog')
  return product
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const product = await loadProduct(id)
  const mainImage = mediaUrl((product.images ?? [])[0])
  return buildMetadata({
    title: product.title,
    description: product.description ?? undefined,
    path: `/product/${product.id}`,
    image: mainImage,
  })
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params
  const product = await loadProduct(id)

  const images = (product.images ?? []).map((img) => mediaUrl(img)).filter((url): url is string => Boolean(url))
  const mainImage = images[0]
  const categoryId = typeof product.category === 'object' ? product.category.id : product.category
  const categoryName = typeof product.category === 'object' ? product.category.name : undefined
  const categorySlug = typeof product.category === 'object' ? product.category.slug : undefined
  const inStock = Boolean(product.available) && product.quantity > 0

  const [relatedResult, cheapResult] = await Promise.all([
    getProducts({ categoryId, limit: 4 }),
    getProducts({ limit: 500, sort: 'price' }),
  ])
  const related = relatedResult.docs.filter((p) => p.id !== product.id).slice(0, 3)
  const accessories = cheapResult.docs
    .filter((p) => p.id !== product.id && p.price > 0 && p.price <= Math.max(1200, product.price * 0.4))
    .slice(0, 3)

  const kitContents = product.isKit ? (product.kitItems ?? []) : []

  // Product/Offer structured data — makes the page eligible for a price/
  // availability rich snippet in search. businessFunction: LeaseOut is
  // schema.org's own vocabulary for "this offer is a rental, not a sale" —
  // there's no separate rental-specific Product type to reach for instead.
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description ?? product.subtitle ?? undefined,
    image: images.length ? images : undefined,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'RUB',
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: new URL(`/product/${product.id}`, siteOrigin()).toString(),
      businessFunction: product.listingType === 'rental' ? 'https://schema.org/LeaseOut' : 'https://schema.org/Sell',
    },
  }
  // Embedded as raw <script> text via dangerouslySetInnerHTML (not parsed as
  // HTML), so the one real risk is a `</script>` substring in admin-authored
  // title/description breaking out of the tag early — neutralized the
  // standard way, by escaping `<` so the sequence can never form.
  const productJsonLdSafe = JSON.stringify(productJsonLd).replace(/</g, '\\u003c')

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productJsonLdSafe }} />
      <div className="container-page grid-12 pt-3.5 pb-20">
        <div className="flex flex-col gap-3.5 sm:col-span-6 lg:col-span-7">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[26px] border border-border bg-[linear-gradient(150deg,#e6e4e0,#ded9d1)]" style={{ animation: 'bnClip 900ms var(--ease-expo) both' }}>
            {mainImage && (
              <Image
                src={mainImage}
                alt={product.title}
                fill
                sizes={GALLERY_MAIN_SIZES}
                className="object-cover transition-transform duration-[900ms] ease-expo hover:scale-[1.04]"
              />
            )}
            <div className="pointer-events-none absolute left-3.5 top-3.5 flex gap-2">
              {categoryName && (
                <span className="rounded-full bg-[rgba(10,10,10,0.72)] px-3.5 py-[7px] text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-[10px]">{categoryName}</span>
              )}
              <span className={`rounded-full px-3.5 py-[7px] text-[10px] font-semibold uppercase tracking-[0.1em] backdrop-blur-[10px] ${inStock ? 'bg-white/[0.86] text-foreground' : 'bg-white/[0.86] text-accent'}`}>
                {inStock ? 'В наличии' : 'Нет в наличии'}
              </span>
            </div>
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-2.5">
              {images.slice(1, 5).map((url) => (
                <div key={url} className="relative aspect-square overflow-hidden rounded-2xl border border-border transition-transform duration-300 ease-expo hover:scale-[1.04]">
                  <Image src={url} alt={product.title} fill sizes={GALLERY_THUMB_SIZES} className="object-cover" />
                </div>
              ))}
            </div>
          )}

          <div className="rounded-3xl border border-border bg-card p-[30px_30px_26px]">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-subtle">
              <Link href="/" className="border-none transition-colors duration-240 ease-expo hover:text-accent">Главная</Link> /{' '}
              <Link href="/catalog" className="border-none transition-colors duration-240 ease-expo hover:text-accent">Каталог</Link>
              {categoryName && categorySlug && (
                <>
                  {' '}/ <Link href={`/catalog/${categorySlug}`} className="border-none transition-colors duration-240 ease-expo hover:text-accent">{categoryName}</Link>
                </>
              )}
            </div>
            <h1 className="mt-3.5 text-[clamp(28px,3.6vw,50px)] font-medium leading-none tracking-[-0.045em]">{product.title}</h1>
            {product.subtitle && <div className="mt-2.5 text-[14px] text-subtle">{product.subtitle}</div>}
            {product.description && <p className="mt-5 max-w-[560px] text-[16.5px] leading-[1.5] text-[#2A2925]">{product.description}</p>}
          </div>

          {kitContents.length > 0 && (
            <div className="rounded-3xl border border-border bg-card p-6.5">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Что в комплекте</div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {kitContents.map((item, i) => (
                  <div key={item.id ?? i} className="flex items-center gap-3 rounded-2xl bg-muted p-[12px_14px] transition-[background-color,transform] duration-240 ease-expo hover:translate-x-[3px] hover:bg-[#EAE8E4]">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[10.5px] font-bold text-accent">{i + 1}</span>
                    <span className="text-[14px]">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {accessories.length > 0 && (
            <div className="rounded-3xl border border-border bg-card p-6.5">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Совместимые аксессуары</div>
              <div className="mt-2.5">
                {accessories.map((a) => (
                  <div key={a.id} className="mx-[-14px] flex items-center justify-between gap-4 rounded-2xl px-3.5 py-3.5 transition-colors duration-240 ease-expo hover:bg-muted">
                    <div>
                      <div className="text-[15.5px] font-medium tracking-[-0.02em]">{a.title}</div>
                      <div className="mt-1 text-[12.5px] text-subtle">{formatCurrency(a.price)}{a.listingType === 'rental' ? ' / сутки' : ''}</div>
                    </div>
                    <button
                      type="button"
                      className="h-9 shrink-0 whitespace-nowrap rounded-full bg-muted px-4 text-[10.5px] font-semibold uppercase tracking-[0.12em] transition-colors duration-240 ease-expo hover:bg-primary hover:text-primary-foreground"
                      data-add-to-cart
                      data-product-id={a.id}
                      data-title={a.title}
                      data-price={a.price}
                      data-listing-type={a.listingType}
                      data-image={mediaUrl(Array.isArray(a.images) ? a.images[0] : undefined) ?? ''}
                      data-unit={a.listingType === 'rental' ? 'сутки' : 'шт.'}
                    >
                      Добавить
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {related.length > 0 && (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              {related.map((p, i) => {
                const relImg = mediaUrl(Array.isArray(p.images) ? p.images[0] : undefined)
                return (
                  <Link
                    key={p.id}
                    href={`/product/${p.id}`}
                    className="rounded-[22px] border border-border bg-card p-3 transition-[transform,box-shadow] duration-[420ms] ease-expo hover:-translate-y-1 hover:shadow-[var(--shadow-medium)]"
                    style={{ animation: 'bnIn 560ms var(--ease-expo) both', animationDelay: `${Math.min(i * 60, 400)}ms` }}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[linear-gradient(150deg,#e6e4e0,#ded9d1)]">
                      {relImg && <Image src={relImg} alt={p.title} fill sizes={RELATED_SIZES} className="object-cover" />}
                    </div>
                    <div className="p-[14px_4px_4px]">
                      <div className="text-[14.5px] font-medium leading-[1.25] tracking-[-0.02em]">{p.title}</div>
                      <div className="mt-1 text-[12px] text-subtle">{formatCurrency(p.price)}{p.listingType === 'rental' ? ' / сутки' : ''}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        <div className="sm:col-span-6 lg:col-span-5">
          <div className="sticky top-[96px]">
            <ProductPurchasePanel product={product} imageUrl={mainImage} />
          </div>
        </div>
      </div>
    </>
  )
}
