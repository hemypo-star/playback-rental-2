'use client'

// Ported from apps/web/src/layouts/AdminLayout.astro's <aside> (docs/PLAN-
// next-migration.md Stage 3.2). 'use client': needs usePathname() for the
// active-tab highlight (no server-render equivalent the way Astro's
// explicit activeTab prop was) and the logout button's fetch handler, same
// reasoning as Navbar.tsx's port in Stage 2. Uses next/link so admin nav is
// a real client-side transition — no full reload per tab, the whole point
// of Stage 3 per the plan.
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { AdminNavBadges } from '../../lib/admin/data/navBadges'

interface NavItem {
  id: string
  label: string
  href: string
  badge?: keyof AdminNavBadges
}

// Категории/Акции aren't in the delivered mockup (it never designed a
// catalog-editing screen at all — see docs/PLAN-docker-admin.md Step 6) but
// need somewhere to live; grouped next to Склад as the other catalog-data
// tabs, styled identically to the designed items rather than bolted on
// visually differently. Only the three items the mockup itself badged
// (Заказы/Склад/Клиенты) get one here — see navBadges.ts for what each
// number means.
const NAV: NavItem[] = [
  { id: 'orders', label: 'Заказы', href: '/admin/orders', badge: 'orders' },
  { id: 'calendar', label: 'Календарь', href: '/admin/calendar' },
  { id: 'stock', label: 'Склад', href: '/admin/stock', badge: 'stock' },
  { id: 'categories', label: 'Категории', href: '/admin/categories' },
  { id: 'promotions', label: 'Акции', href: '/admin/promotions' },
  { id: 'clients', label: 'Клиенты', href: '/admin/clients', badge: 'clients' },
  { id: 'analytics', label: 'Аналитика', href: '/admin/analytics' },
  { id: 'media', label: 'Медиатека', href: '/admin/media' },
  { id: 'users', label: 'Пользователи', href: '/admin/users' },
  { id: 'settings', label: 'Настройки', href: '/admin/settings' },
]

export default function AdminSidebar({ userEmail, badges }: { userEmail: string; badges: AdminNavBadges }) {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  const handleLogout = async () => {
    // /api/users/logout is a plain POST that returns an expired Set-Cookie —
    // a form-POST to it would navigate the whole page to that raw JSON
    // response, so this fetches it instead and navigates to login itself
    // once the cookie is actually cleared.
    await fetch('/api/users/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  return (
    <>
      {/* Desktop: the designed 246px sticky sidebar (S7). Hidden ≤1020 —
          the `lg` breakpoint (1024px) is the sitewide stand-in already used
          for the design's own 1020px cutoff (see e.g. CategorySidebar.tsx). */}
      <aside className="sticky top-3.5 hidden h-fit flex-col gap-6 rounded-3xl bg-[#0A0A0A] p-4 py-5.5 text-white lg:flex">
        <div className="flex items-baseline gap-[7px] px-2">
          <span className="text-[13px] font-bold tracking-[0.04em] uppercase">Playback</span>
          <span className="text-[13px] font-normal tracking-[0.04em] text-white/50 uppercase">Admin</span>
        </div>

        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const count = item.badge ? badges[item.badge] : undefined
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center justify-between rounded-[13px] px-3.5 py-3 text-[11.5px] font-semibold tracking-[0.1em] uppercase transition-colors duration-240 ease-expo ${
                  isActive(item.href) ? 'bg-white text-foreground' : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {count ? <span className="text-[11px] opacity-60">{count}</span> : null}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-0.5">
          <Link
            href="/"
            className="rounded-[13px] bg-white/[0.07] px-3.5 py-3 text-[11px] font-semibold tracking-[0.1em] text-white/60 uppercase transition-colors duration-240 ease-expo hover:bg-white/[0.16] hover:text-white"
          >
            ← На сайт
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-[13px] px-3.5 py-3 text-left text-[11px] font-semibold tracking-[0.1em] text-white/40 uppercase transition-colors duration-240 ease-expo hover:bg-white/10 hover:text-white/80"
          >
            Выйти · {userEmail}
          </button>
        </div>
      </aside>

      {/* Mobile ≤1020 (S7's own rule): sidebar becomes a horizontal
          scroll tab bar, 44px item height — a brand/logout row on top so
          neither is lost, the scrollable nav strip below it. */}
      <div className="rounded-3xl bg-[#0A0A0A] text-white lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 pt-3.5">
          <div className="flex items-baseline gap-[7px]">
            <span className="text-[13px] font-bold tracking-[0.04em] uppercase">Playback</span>
            <span className="text-[13px] font-normal tracking-[0.04em] text-white/50 uppercase">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[10.5px] font-semibold tracking-[0.1em] text-white/60 uppercase transition-colors duration-240 ease-expo hover:text-white">
              На сайт
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="text-[10.5px] font-semibold tracking-[0.1em] text-white/40 uppercase transition-colors duration-240 ease-expo hover:text-white/80"
            >
              Выйти
            </button>
          </div>
        </div>
        <nav className="flex gap-0.5 overflow-x-auto px-2.5 py-2.5" style={{ WebkitOverflowScrolling: 'touch' }}>
          {NAV.map((item) => {
            const count = item.badge ? badges[item.badge] : undefined
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[13px] px-3.5 text-[11.5px] font-semibold tracking-[0.1em] uppercase transition-colors duration-240 ease-expo ${
                  isActive(item.href) ? 'bg-white text-foreground' : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {count ? <span className="text-[11px] opacity-60">{count}</span> : null}
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}
