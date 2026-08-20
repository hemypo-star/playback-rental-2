import type { Metadata } from 'next'
import type React from 'react'
import '../../styles/global.css'

// Port of apps/web/src/layouts/Layout.astro (docs/PLAN-next-migration.md
// Stage 1 — "каркас", the frame only). Deliberately does NOT yet render
// Navbar/Footer: Footer.astro reads SiteSettings, and Navbar.astro's
// CartBadge/AdminPanelLink/RentalDatePicker islands depend on stores and a
// Local API data layer that don't exist in this app until Stage 2 ("Данные"
// and "Острова"). Nothing under (frontend) has a real page yet either — the
// Next middleware fallback-proxies every route to apps/web still, so this
// layout is inert until Stage 2 adds the first page under this group, at
// which point Navbar/Footer arrive together with what they depend on rather
// than as a half-working stand-in now.

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
        <main className="flex-1">{children}</main>
      </body>
    </html>
  )
}
