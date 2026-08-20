import type { Product } from '../payload-types'
import { mediaUrl } from '../lib/mediaUrl'
import { formatCurrency } from '../lib/pricing'

// Ported from apps/web/src/components/ProductCard.astro (docs/PLAN-next-
// migration.md Stage 2). No 'use client': the card itself has no state of
// its own — the [data-add-to-cart] button is wired up by a single delegated
// listener (scripts/cart-actions.ts, initialized once by
// CartActionsInit.tsx), same pattern as the Astro version's plain <script>
// approach, just triggered from a React client component instead.
interface Props {
  product: Product
  delay?: number
}

export default function ProductCard({ product, delay = 0 }: Props) {
  const image = Array.isArray(product.images) ? product.images[0] : undefined
  const imageUrl = mediaUrl(image)
  const categoryName = typeof product.category === 'object' ? product.category.name : undefined
  const cardTag = product.tag || categoryName
  const subtitle = product.subtitle || product.description
  const unit = product.listingType === 'rental' ? 'сутки' : 'шт.'
  const inStock = Boolean(product.available) && product.quantity > 0
  const savings = product.isKit && product.oldPrice && product.oldPrice > product.price ? product.oldPrice - product.price : undefined

  return (
    <div
      className="flex flex-col rounded-3xl border border-border bg-card p-3.5 transition-[transform,box-shadow,border-color] duration-[420ms] hover:-translate-y-1 hover:border-[rgba(10,10,10,0.15)] hover:shadow-[var(--shadow-medium)]"
      style={{ animation: 'bnIn 560ms cubic-bezier(0.16,1,0.3,1) both', animationDelay: `${Math.min(delay, 400)}ms` }}
      data-product-card
      data-product-id={product.id}
      data-listing-type={product.listingType}
      data-in-stock={inStock ? 'true' : 'false'}
    >
      <a href={`/product/${product.id}`} className="relative block aspect-[4/3] overflow-hidden rounded-2xl bg-[linear-gradient(150deg,#e6e4e0,#ded9d1)]">
        {imageUrl && <img src={imageUrl} alt={product.title} loading="lazy" className="h-full w-full object-cover" />}
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
      </a>
      <div className="flex flex-1 flex-col p-[16px_6px_6px]">
        <a href={`/product/${product.id}`} className="block min-h-[42px] border-none text-[17px] font-medium leading-[1.22] tracking-[-0.025em]">
          {product.title}
        </a>
        {subtitle && <div className="mt-1.5 line-clamp-1 text-[12.5px] text-subtle">{subtitle}</div>}
        <div className="min-h-3.5 flex-1"></div>
        <div className="mt-3.5 flex items-baseline justify-between gap-2">
          <span className="flex items-baseline gap-2">
            <span className="text-[20px] font-semibold tracking-[-0.03em]">{formatCurrency(product.price)}</span>
            {product.isKit && product.oldPrice && product.oldPrice > product.price && (
              <span className="text-[12px] text-subtle line-through">{formatCurrency(product.oldPrice)}</span>
            )}
          </span>
          <span className="shrink-0 text-[11px] text-subtle">{unit}</span>
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
