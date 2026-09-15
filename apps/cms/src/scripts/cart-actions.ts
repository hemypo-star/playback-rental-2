// Duplicated from apps/web/src/scripts/cart-actions.ts (docs/PLAN-next-
// migration.md Stage 2) — apps/web keeps its own live copy until Stage 4
// deletes that app entirely; keep both in sync until then.
//
// Delegated click handler for [data-add-to-cart] buttons rendered by static
// Server Components (ProductCard). One listener for the whole page instead of
// hydrating a React island per card — matters once a catalog grid can be
// hundreds of items. The cart store itself doesn't need React; only the live
// badge count (CartBadge.tsx) does. Wired up once from a client component
// (see components/CartActionsInit.tsx) since it needs a real DOM/useEffect,
// unlike an Astro <script> tag.
import { $cart, addToCart, isInCart } from '../stores/cart'
import { $selectedDates, requestDatePickerOpen } from '../stores/dates'

const IN_CART_CLASSES = ['bg-success-bg', 'text-success']
const DEFAULT_CLASSES = ['bg-primary', 'text-primary-foreground']

function syncButton(button: HTMLButtonElement): void {
  const productId = Number(button.dataset.productId)
  const inCart = isInCart(productId)
  button.textContent = inCart ? 'В корзине ✓' : 'В корзину'
  button.classList.remove(...IN_CART_CLASSES, ...DEFAULT_CLASSES)
  button.classList.add(...(inCart ? IN_CART_CLASSES : DEFAULT_CLASSES))
}

function syncAllButtons(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-add-to-cart]').forEach(syncButton)
}

export function initCartActions(): void {
  syncAllButtons()
  $cart.subscribe(() => syncAllButtons())

  document.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement)?.closest<HTMLButtonElement>('[data-add-to-cart]')
    if (!button) return

    // ProductCard sets data-in-stock on its wrapping [data-product-card] —
    // block add-to-cart client-side too instead of only failing at the very
    // end of checkout (the beforeValidate hook is still the real authority;
    // this is just not making the customer fill out the whole form first).
    const card = button.closest<HTMLElement>('[data-product-card]')
    if (card?.dataset.inStock === 'false') return

    const listingType = button.dataset.listingType as 'rental' | 'sale'
    if (listingType === 'rental' && !$selectedDates.get().startDate) {
      // B1 (design_handoff_swiss_bento/08-instruction.md) — no dates picked
      // is the next step, not an input error: open the picker instead of
      // flashing a message and doing nothing (G4's "main drop-off point").
      requestDatePickerOpen()
      return
    }

    addToCart(
      {
        productId: Number(button.dataset.productId),
        title: button.dataset.title || '',
        price: Number(button.dataset.price),
        listingType,
        imageUrl: button.dataset.image || undefined,
        unit: button.dataset.unit || '',
      },
      1,
    )
  })
}
