'use client'

// Ported from apps/web/src/components/Navbar.astro (docs/PLAN-next-migration.md
// Stage 2). Astro.url.pathname (available at render time in a server
// component) has no direct equivalent for a client-rendered active-link
// check in a shared layout — usePathname() is Next's own idiom for this,
// so the whole nav is a client component now rather than the mostly-static
// server render it was in Astro. The markup/behavior is otherwise verbatim.
import { usePathname, useSearchParams } from 'next/navigation'
import CartBadge from './CartBadge'
import AdminPanelLink from './AdminPanelLink'
import RentalDatePicker from './RentalDatePicker'

export default function Navbar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`)
  // The Astro source checked `currentPath.includes('type=kit')` against
  // Astro.url.pathname — which never contains the query string, so that
  // check was always false and "Наборы" never actually highlighted as
  // active. Fixed here using the real query param instead of porting the
  // dead condition verbatim; flagged in the Stage 2 commit/summary as an
  // observable behavior change, not a silent one.
  const isKitFilter = searchParams.get('type') === 'kit'

  return (
    <div className="sticky top-0 z-[60] px-3.5 pt-3 sm:px-[14px]" style={{ background: 'linear-gradient(180deg,rgba(239,238,235,0.96) 60%,rgba(239,238,235,0))' }}>
      <header className="container-page flex h-16 items-center gap-4 rounded-[20px] border border-border bg-white/[0.86] px-4 shadow-[var(--shadow-soft)] backdrop-blur-[20px] backdrop-saturate-[1.6] sm:gap-[30px] sm:px-4">
        <a href="/" className="flex shrink-0 items-baseline gap-[7px] select-none">
          <span className="text-[15px] font-bold uppercase tracking-[0.02em]">Playback</span>
          <span className="hidden text-[15px] font-normal uppercase tracking-[0.02em] text-subtle sm:inline">Rental</span>
          <span className="text-[10px] text-accent" style={{ transform: 'translateY(-6px)' }}>®</span>
        </a>

        <nav className="ml-1 hidden min-w-0 items-center gap-1 whitespace-nowrap md:flex">
          <a href="/catalog" className={`rounded-full px-[13px] py-2 text-[11px] font-semibold uppercase tracking-[0.12em] border-0 transition-colors duration-240 ease-expo hover:bg-primary hover:text-primary-foreground ${isActive('/catalog') && !isKitFilter ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>Каталог</a>
          <a href="/catalog?type=kit" className={`rounded-full px-[13px] py-2 text-[11px] font-semibold uppercase tracking-[0.12em] border-0 transition-colors duration-240 ease-expo hover:bg-primary hover:text-primary-foreground ${isKitFilter ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>Наборы</a>
          <a href="/how-it-works" className={`rounded-full px-[13px] py-2 text-[11px] font-semibold uppercase tracking-[0.12em] border-0 transition-colors duration-240 ease-expo hover:bg-primary hover:text-primary-foreground ${isActive('/how-it-works') ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>Условия</a>
          <a href="/contact" className={`rounded-full px-[13px] py-2 text-[11px] font-semibold uppercase tracking-[0.12em] border-0 transition-colors duration-240 ease-expo hover:bg-primary hover:text-primary-foreground ${isActive('/contact') ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>Контакты</a>
        </nav>

        <div className="flex-1"></div>

        <div className="hidden shrink-0 items-center gap-2 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle xl:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" style={{ animation: 'bnBlink 2.6s ease-in-out infinite' }}></span>
          <span>10:00—21:00</span>
        </div>

        <RentalDatePicker variant="navbar" />

        <a
          href="/checkout"
          className="flex h-[38px] shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full bg-primary py-0 pl-4 pr-1.5 text-primary-foreground transition-[background-color,gap] duration-240 ease-expo hover:bg-primary-hover hover:gap-3.5"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em]">Корзина</span>
          <CartBadge />
        </a>

        <AdminPanelLink />

        <input type="checkbox" id="mobile-menu-toggle" className="peer hidden" />
        <label htmlFor="mobile-menu-toggle" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full md:hidden" aria-label="Меню">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </label>

        <div className="peer-[:checked]:flex absolute left-0 right-0 top-[68px] hidden flex-col gap-1 rounded-[20px] border border-border bg-card p-3 shadow-[var(--shadow-lifted)] md:hidden">
          <a href="/catalog" className="rounded-xl px-3 py-2 text-[14.5px] font-medium hover:bg-muted">Каталог</a>
          <a href="/catalog?type=kit" className="rounded-xl px-3 py-2 text-[14.5px] font-medium hover:bg-muted">Наборы</a>
          <a href="/how-it-works" className="rounded-xl px-3 py-2 text-[14.5px] font-medium hover:bg-muted">Условия</a>
          <a href="/contact" className="rounded-xl px-3 py-2 text-[14.5px] font-medium hover:bg-muted">Контакты</a>
        </div>
      </header>
    </div>
  )
}
