// Duplicated from apps/web/src/stores/cart.ts (docs/PLAN-next-migration.md
// Stage 2) — apps/web keeps its own live copy until Stage 4 deletes that app
// entirely; keep both in sync until then. `ListingType` is a local literal
// here instead of `@playback-rental/shared-types`'s copy — that package is an
// apps/web-only concern going forward; new Next code takes its types from
// the generated `payload-types.ts` or, for a plain literal like this, just
// states it directly.
import { persistentJSON } from '@nanostores/persistent'
import { computed } from 'nanostores'
import { calculateRentalPrice } from '../lib/pricing'
import { $selectedDates } from './dates'

export type ListingType = 'rental' | 'sale'

// Absolute sanity cap on cart line quantity. Client-side store has no knowledge
// of stock (CartItem carries no quantity-available field) — real stock validation
// happens on the product page (max={available}), checkout availability check, and
// authoritatively in the OrderItems beforeValidate hook. This cap only stops
// runaway/absurd values.
export const MAX_CART_ITEM_QUANTITY = 99

// Rental dates live only on $selectedDates (one shared date range for the
// whole cart, matching the design's single "Даты и время" box on the
// cart screen) — a cart line never carries its own dates.
export interface CartItem {
  productId: number
  title: string
  subtitle?: string
  price: number
  imageUrl?: string
  listingType: ListingType
  unit: string
  quantity: number
}

export const $cart = persistentJSON<CartItem[]>('pb:cart', [])

export function addToCart(item: Omit<CartItem, 'quantity'>, quantity = 1): void {
  const items = $cart.get()
  const existing = items.find((i) => i.productId === item.productId)
  if (existing) {
    $cart.set(
      items.map((i) => (i.productId === item.productId ? { ...i, quantity: Math.min(i.quantity + quantity, MAX_CART_ITEM_QUANTITY) } : i)),
    )
  } else {
    $cart.set([...items, { ...item, quantity: Math.min(quantity, MAX_CART_ITEM_QUANTITY) }])
  }
}

export function setItemQuantity(productId: number, quantity: number): void {
  if (quantity <= 0) {
    removeFromCart(productId)
    return
  }
  const clamped = Math.min(quantity, MAX_CART_ITEM_QUANTITY)
  $cart.set($cart.get().map((i) => (i.productId === productId ? { ...i, quantity: clamped } : i)))
}

export function removeFromCart(productId: number): void {
  $cart.set($cart.get().filter((i) => i.productId !== productId))
}

export function clearCart(): void {
  $cart.set([])
}

export function isInCart(productId: number): boolean {
  return $cart.get().some((i) => i.productId === productId)
}

export const $cartCount = computed($cart, (items) => items.reduce((sum, i) => sum + i.quantity, 0))

function lineTotal(item: CartItem, dates: { startDate: Date | null; endDate: Date | null }): number {
  if (item.listingType === 'sale') return item.price * item.quantity
  return calculateRentalPrice(item.price, dates.startDate ?? undefined, dates.endDate ?? undefined) * item.quantity
}

export const $cartTotal = computed([$cart, $selectedDates], (items, dates) =>
  Math.round(items.reduce((sum, item) => sum + lineTotal(item, dates), 0)),
)
