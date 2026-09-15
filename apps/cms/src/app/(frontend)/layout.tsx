import type { Metadata } from 'next'
import type React from 'react'
import { Suspense } from 'react'
import '../../styles/global.css'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import CartActionsInit from '../../components/CartActionsInit'
import EntryAnimationController from '../../components/EntryAnimationController'
import { BusinessHoursProvider } from '../../components/BusinessHoursContext'
import { getSiteSettings } from '../../lib/data/siteSettings'
import { DEFAULT_BUSINESS_HOURS } from '../../lib/dateRange'
import { SITE_NAME, siteOrigin } from '../../lib/seo'

// Port of apps/web/src/layouts/Layout.astro (docs/PLAN-next-migration.md
// Stage 2). Navbar/Footer now render for real — Footer is an async Server
// Component reading SiteSettings via the Local API data layer
// (lib/data/siteSettings.ts); Navbar is 'use client' (needs usePathname()
// for active-link state, which has no server-render equivalent the way
// Astro.url.pathname did) and is wrapped in Suspense because it also uses
// useSearchParams(), which Next requires a Suspense boundary for.

// metadataBase lets every page's lib/seo.ts-built `alternates.canonical`/
// `openGraph.url`/image URLs resolve correctly instead of Next silently
// falling back to a localhost default (and warning about it) — those are
// already built as absolute URLs via siteOrigin(), so this is a safety net
// for any metadata that doesn't go through buildMetadata(), not the only
// thing making canonical URLs correct.
export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: {
    template: `%s · ${SITE_NAME}`,
    default: SITE_NAME,
  },
  description: 'Прокат фото- и видеотехники в Кемерове.',
  openGraph: {
    siteName: SITE_NAME,
    type: 'website',
    locale: 'ru_RU',
  },
  twitter: { card: 'summary' },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // B4 (design_handoff_swiss_bento/08-instruction.md, audit N5) — the one
  // Local API read that feeds business hours to every RentalDatePicker
  // instance and to Navbar's own "HH:MM—HH:MM" label, via
  // BusinessHoursContext (see that file for why Context and not a prop from
  // each of the 5 render sites). `?? DEFAULT_BUSINESS_HOURS.*` only matters
  // for a genuinely empty field (the schema's own `defaultValue` covers
  // every real database, including one this migration has just run against)
  // — not a silent 9/10 disagreement risk like the old hardcoded constant.
  const siteSettings = await getSiteSettings()
  const businessHours = {
    open: siteSettings.businessHoursOpen ?? DEFAULT_BUSINESS_HOURS.open,
    close: siteSettings.businessHoursClose ?? DEFAULT_BUSINESS_HOURS.close,
  }

  return (
    <html lang="ru">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preload" href="/fonts/golos-text-cyrillic.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body className="flex min-h-screen flex-col">
        <BusinessHoursProvider value={businessHours}>
          <Suspense fallback={null}>
            <Navbar />
          </Suspense>
          <main className="flex-1" style={{ animation: 'bnFade 380ms ease both' }}>{children}</main>
          <Footer />
          <CartActionsInit />
          {/* C3 (audit G2) — see that component's own header comment for
              the mechanism (popstate → data-nav-back → styles/global.css).
              Needs useSearchParams(), hence the Suspense boundary, same
              requirement Navbar above already has. */}
          <Suspense fallback={null}>
            <EntryAnimationController />
          </Suspense>
        </BusinessHoursProvider>
      </body>
    </html>
  )
}
