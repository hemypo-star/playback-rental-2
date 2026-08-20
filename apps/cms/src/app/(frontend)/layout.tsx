import type { Metadata } from 'next'
import type React from 'react'
import { Suspense } from 'react'
import '../../styles/global.css'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import CartActionsInit from '../../components/CartActionsInit'

// Port of apps/web/src/layouts/Layout.astro (docs/PLAN-next-migration.md
// Stage 2). Navbar/Footer now render for real — Footer is an async Server
// Component reading SiteSettings via the Local API data layer
// (lib/data/siteSettings.ts); Navbar is 'use client' (needs usePathname()
// for active-link state, which has no server-render equivalent the way
// Astro.url.pathname did) and is wrapped in Suspense because it also uses
// useSearchParams(), which Next requires a Suspense boundary for.

export const metadata: Metadata = {
  title: {
    template: '%s · Playback Rental',
    default: 'Playback Rental',
  },
  description: 'Прокат фото- и видеотехники в Кемерове.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preload" href="/fonts/golos-text-cyrillic.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body className="flex min-h-screen flex-col">
        <Suspense fallback={null}>
          <Navbar />
        </Suspense>
        <main className="flex-1">{children}</main>
        <Footer />
        <CartActionsInit />
      </body>
    </html>
  )
}
