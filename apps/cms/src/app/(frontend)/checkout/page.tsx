import type { Metadata } from 'next'
import CheckoutPage from '../../../components/CheckoutPage'

// Ported from apps/web/src/pages/checkout.astro (docs/PLAN-next-migration.md
// Stage 2, page group 7 — the last one). The cart itself is entirely
// client-side (localStorage), so this page has no server data fetching of
// its own; force-dynamic isn't needed here the way it was for the other
// data-driven page groups, since there's no request-time server read to
// opt out of caching for.
export const metadata: Metadata = { title: 'Оформление заказа' }

export default function CheckoutRoutePage() {
  return (
    <div className="container-page pb-20 pt-3.5">
      <CheckoutPage />
    </div>
  )
}
