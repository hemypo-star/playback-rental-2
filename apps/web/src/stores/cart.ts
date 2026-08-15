import { persistentJSON } from '@nanostores/persistent'
import { computed } from 'nanostores'
import type { ListingType } from '@playback-rental/shared-types'
import { calculateRentalPrice } from '../lib/pricing'
import { $selectedDates } from './dates'

// Rental dates live only on $selectedDates (one shared date range for the
// whole cart, matching the design's single "Даты и время" box on the
// cart screen) — a cart line never carries its own dates.
export interface CartItem {
  productId: number
  title: string
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
      items.map((i) => (i.productId === item.productId ? { ...i, quantity: i.quantity + quantity } : i)),
    )
  } else {
    $cart.set([...items, { ...item, quantity }])
  }
}

export function setItemQuantity(productId: number, quantity: number): void {
  if (quantity <= 0) {
    removeFromCart(productId)
    return
  }
  $cart.set($cart.get().map((i) => (i.productId === productId ? { ...i, quantity } : i)))
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

export function getLineTotal(item: CartItem): number {
  return lineTotal(item, $selectedDates.get())
}
