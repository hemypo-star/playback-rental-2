import { useEffect, useState } from 'react'
import { useStore } from '@nanostores/react'
import { $cartCount } from '../stores/cart'

export default function CartBadge() {
  const storeCount = useStore($cartCount)
  // $cart is localStorage-backed (persistentJSON), so like $selectedDates it
  // can legitimately differ between the server render and the client's
  // first (hydration) render — gate on mounted, same pattern as
  // RentalDatePicker/ProductPurchasePanel/CheckoutPage.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const count = mounted ? storeCount : 0
  if (count <= 0) return null
  return (
    <span className="flex h-[26px] min-w-[26px] items-center justify-center rounded-full bg-white/[0.16] px-2 text-xs font-bold" style={{ animation: 'bnPop 380ms cubic-bezier(0.16,1,0.3,1) both' }}>
      {count}
    </span>
  )
}
