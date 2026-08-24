import type { Metadata } from 'next'
import CheckoutPage from '../../../components/CheckoutPage'
import { buildMetadata } from '../../../lib/seo'

// Ported from apps/web/src/pages/checkout.astro (docs/PLAN-next-migration.md
// Stage 2, page group 7 — the last one). The cart itself is entirely
// client-side (localStorage), so this page has no server data fetching of
// its own.
//
// force-dynamic: this page itself doesn't need it, but the shared
// (frontend)/layout.tsx's Footer does a real getSiteSettings() DB read on
// every render, which a genuine `next build`'s static-generation pass
// executes for real — and fails outright in Docker, where the build stage
// deliberately has no live DATABASE_URI (see apps/cms/Dockerfile). Every
// other static page under (frontend) needs the same marker for the same
// reason; SiteSettings is also mutable at runtime (an admin can edit
// contact info anytime), so this isn't purely a build workaround — a
// statically-cached Footer would go stale after any such edit anyway.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = buildMetadata({ title: 'Оформление заказа', path: '/checkout' })

export default function CheckoutRoutePage() {
  return (
    <div className="container-page pb-20 pt-3.5">
      <CheckoutPage />
    </div>
  )
}
