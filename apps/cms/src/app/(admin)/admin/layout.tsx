import type { Metadata } from 'next'
import type React from 'react'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import '../../../styles/prototype.css'
import { getAdminUser } from '../../../lib/admin/auth'
import { getAdminNavBadges } from '../../../lib/admin/data/navBadges'
import PrototypeAdminSidebar from '../../../prototype/PrototypeAdminSidebar'
import EntryAnimationController from '../../../components/EntryAnimationController'

// Root layout for the guarded admin dashboard (docs/PLAN-next-migration.md
// Stage 3.1/3.2) — ported from apps/web/src/layouts/AdminLayout.astro. A
// separate top-level route group from (frontend), same as (payload):
// admin/login and admin/first-register deliberately live under (frontend)
// instead (they keep the storefront chrome, matching apps/web's current
// behavior — those two Astro pages import the site Layout, not
// AdminLayout), so they never pass through this guard at all.
//
// The real auth check lives here, per the plan: middleware/proxy.ts only
// ever does cheap cookie-presence checks (and doesn't even need one here,
// since unported /admin/* paths still fall through to Astro, which has its
// own guard) — payload.auth() itself requires the Node runtime, which this
// Server Component naturally runs under.
export const metadata: Metadata = {
  title: { template: '%s · Playback Admin', default: 'Playback Admin' },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminUser()
  if (!user) redirect('/admin/login')
  const badges = await getAdminNavBadges()

  return (
    <html lang="ru">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preload" href="/fonts/golos-text-cyrillic.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body className="bg-background text-foreground">
        <main className="pb-admin-shell"><PrototypeAdminSidebar badges={badges} /><section className="pb-admin-content">{children}</section></main>
        {/* C3 (audit G2) — same mechanism/reasoning as the (frontend) root
            layout; the admin dashboard's own order/client/stock rows use
            the same `bnIn` stagger and need the same Back/Forward fix. */}
        <Suspense fallback={null}>
          <EntryAnimationController />
        </Suspense>
      </body>
    </html>
  )
}
