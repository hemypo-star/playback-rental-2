import Link from 'next/link'
import Image from 'next/image'
import type { Product } from '../payload-types'
import { mediaUrl } from '../lib/mediaUrl'
import { formatCurrency } from '../lib/pricing'

// C4 (design_handoff_swiss_bento/08-instruction.md, G3): real rendered slot,
// measured from this card's own classes (aspect-[4/3] image inside a p-3.5
// card) times the grid it sits in most often — CatalogPage's 3-col grid
// inside the 9/12-column main area (sidebar takes the other 3/12 from
// lg/1024px up), and the same 2-col/3-col grid unsidebarred below lg. Caps
// at the real pixel width the card interior reaches once container-page's
// own 1460px max-width kicks in (~312px at that point, not larger no matter
// how wide the viewport gets). Promotions' linkedProducts grid (grid-cols-2
// sm:grid-cols-3 lg:grid-cols-4) lands within ~1px/0.5vw of this same
// formula despite the different column count, so it reuses this default too
// instead of a third near-duplicate string. The homepage kits grid has no
// sidebar to share width with, so it's genuinely wider — see `sizes` passed
// at that call site.
const DEFAULT_SIZES = '(min-width: 1520px) 312px, (min-width: 1024px) 20vw, (min-width: 640px) 30vw, 45vw'

// Ported from apps/web/src/components/ProductCard.astro (docs/PLAN-next-
// migration.md Stage 2). No 'use client': the card itself has no state of
// its own — the [data-add-to-cart] button is wired up by a single delegated
// listener (scripts/cart-actions.ts, initialized once by
// CartActionsInit.tsx), same pattern as the Astro version's plain <script>
// approach, just triggered from a React client component instead.
//
// C1 (design_handoff_swiss_bento/08-instruction.md, G2): both links below
// are next/link, unlike the [data-add-to-cart] button, which is untouched —
// that selector is what scripts/cart-actions.ts's delegated document-level
// click listener targets, and a next/link `<a>` here never matches it, so
// converting doesn't add a second handler or double-fire anything. Safe to
// click one card->another (e.g. from a related-products grid) without a
// full reload: unlike CategorySidebar's same-route filter links (left as
// plain <a>, see that file), navigating between two /product/[id] pages is
// a real route change either way, so the destination page's own
// ProductPurchasePanel always mounts against fresh props — and that panel's
// availability effect already keys off product.id (not just [] on mount),
// so it re-fetches correctly even on the rarer case where Next reuses the
// component instance instead of remounting it.
interface Props {
  product: Product
  delay?: number
  /** Override when this card renders in a wider (or narrower) grid slot than
   *  the catalog/promotions default above — see DEFAULT_SIZES' own comment. */
  sizes?: string
  /**
   * `template.html`'s home-screen kit tile (S1 point 5, `04-screens.md`) is a
   * genuinely distinct card treatment from the catalog/promotions one this
   * component otherwise renders verbatim (S2): 3/2 media instead of 4/3, a
   * 22px name instead of 17px, a 23px price with a divider + caps unit label
   * above it instead of a plain 20px price row, and — since `subtitle`
   * ("short spec line", per that field's own admin description) and
   * `description` (the full textarea) are two independent fields, not one
   * falling back to the other — both shown, not just whichever is set.
   * Default 'catalog' keeps every existing caller (CatalogPage, promotions
   * linkedProducts) byte-for-byte unchanged; only the homepage kits section
   * passes 'kit'.
   */
  variant?: 'catalog' | 'kit'
}

export default function ProductCard({ product, delay = 0, sizes = DEFAULT_SIZES, variant = 'catalog' }: Props) {
  const isKitCard = variant === 'kit'
  const image = Array.isArray(product.images) ? product.images[0] : undefined
  // Backlog item 9: this slot never needs the original upload. Payload's
  // width-only `card` source preserves aspect ratio, while object-cover below
  // keeps the existing 4:3 / 3:2 visual treatment unchanged.
  const imageUrl = mediaUrl(image, 'card')
  const categoryName = typeof product.category === 'object' ? product.category.name : undefined
  const cardTag = product.tag || categoryName
  const subtitle = product.subtitle || product.description
  const unit = product.listingType === 'rental' ? 'сутки' : 'шт.'
  const inStock = Boolean(product.available) && product.quantity > 0
  const savings = product.isKit && product.oldPrice && product.oldPrice > product.price ? product.oldPrice - product.price : undefined

  return (
    <div
      className="flex flex-col rounded-3xl border border-border bg-card p-3.5 transition-[transform,box-shadow,border-color] duration-[420ms] ease-expo hover:-translate-y-1 hover:border-[rgba(10,10,10,0.15)] hover:shadow-[var(--shadow-medium)]"
      style={{ animation: 'bnIn 560ms var(--ease-expo) both', animationDelay: `${Math.min(delay, 400)}ms` }}
      data-product-card
      data-product-id={product.id}
      data-listing-type={product.listingType}
      data-in-stock={inStock ? 'true' : 'false'}
    >
      <Link href={`/product/${product.id}`} className={`relative block overflow-hidden rounded-2xl bg-[linear-gradient(150deg,#e6e4e0,#ded9d1)] ${isKitCard ? 'aspect-[3/2]' : 'aspect-[4/3]'}`}>
        {imageUrl && <Image src={imageUrl} alt={product.title} fill sizes={sizes} className="object-cover" />}
        {savings ? (
          <span className="pointer-events-none absolute left-2.5 right-2.5 top-2.5 max-w-[62%] truncate rounded-full bg-accent px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white">
            выгода {formatCurrency(savings)}
          </span>
        ) : (
          cardTag && (
            <span className="pointer-events-none absolute left-2.5 right-2.5 top-2.5 max-w-[62%] truncate rounded-full bg-[rgba(10,10,10,0.72)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-[10px]">
              {cardTag}
            </span>
          )
        )}
        <span
          data-avail-badge
          className={`pointer-events-none absolute right-2.5 top-2.5 shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] ${inStock ? 'bg-white/[0.88] text-foreground' : 'bg-accent text-white'}`}
        >
          {inStock ? 'Есть в наличии' : 'Нет в наличии'}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-[16px_6px_6px]">
        <Link
          href={`/product/${product.id}`}
          className={`block border-none font-medium tracking-[-0.025em] ${isKitCard ? 'text-[22px] leading-[1.15]' : 'min-h-[42px] text-[17px] leading-[1.22]'}`}
        >
          {product.title}
        </Link>
        {isKitCard ? (
          <>
            {product.subtitle && <div className="mt-1.5 text-[12.5px] text-subtle">{product.subtitle}</div>}
            {product.description && <p className="mt-3 text-[13.5px] leading-[1.5] text-muted-foreground text-wrap-pretty">{product.description}</p>}
          </>
        ) : (
          subtitle && <div className="mt-1.5 line-clamp-1 text-[12.5px] text-subtle">{subtitle}</div>
        )}
        <div className="min-h-3.5 flex-1"></div>
        <div className={`flex items-baseline justify-between gap-2.5 ${isKitCard ? 'mt-4 border-t border-[rgba(10,10,10,0.09)] pt-3.5' : 'mt-3.5'}`}>
          <span className="flex items-baseline gap-2.5">
            <span className={`font-semibold tracking-[-0.03em] ${isKitCard ? 'text-[23px]' : 'text-[20px]'}`}>{formatCurrency(product.price)}</span>
            {product.isKit && product.oldPrice && product.oldPrice > product.price && (
              <span className={`text-subtle line-through ${isKitCard ? 'text-[13px]' : 'text-[12px]'}`}>{formatCurrency(product.oldPrice)}</span>
            )}
          </span>
          <span className={isKitCard ? 'shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-subtle' : 'shrink-0 text-[11px] text-subtle'}>{unit}</span>
        </div>
        <button
          type="button"
          disabled={!inStock}
          className="mt-3 flex h-11 items-center justify-center gap-2 rounded-full bg-primary text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-foreground transition-[background-color,color] duration-240 ease-expo active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-muted disabled:text-faint"
          data-add-to-cart
          data-product-id={product.id}
          data-title={product.title}
          data-price={product.price}
          data-listing-type={product.listingType}
          data-image={imageUrl ?? ''}
          data-unit={unit}
        >
          {inStock ? 'В корзину' : 'Нет в наличии'}
        </button>
      </div>
    </div>
  )
}
