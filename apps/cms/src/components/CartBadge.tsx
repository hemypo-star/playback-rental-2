'use client'

// Ported from apps/web/src/components/CartBadge.tsx (docs/PLAN-next-
// migration.md Stage 2) — near-verbatim, React 19 on both sides; the Astro
// `client:load` directive is just this file's `'use client'` now.
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
  // This is the deliberate post-mount hydration-mismatch guard CLAUDE.md
  // calls out project-wide (don't remove it) — the new stricter
  // react-hooks/set-state-in-effect rule flags the pattern generically, but
  // there's no external-system subscription to rewrite this into: the point
  // is precisely "trigger one extra render once mounted, client-only."
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])
  const count = mounted ? storeCount : 0
  if (count <= 0) return null
  return (
    <span className="flex h-[26px] min-w-[26px] items-center justify-center rounded-full bg-white/[0.16] px-2 text-xs font-bold" style={{ animation: 'bnPop 380ms var(--ease-expo) both' }}>
      {count}
    </span>
  )
}
