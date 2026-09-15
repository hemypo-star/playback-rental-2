'use client'

// Ported from apps/web/src/components/Navbar.astro (docs/PLAN-next-migration.md
// Stage 2). Astro.url.pathname (available at render time in a server
// component) has no direct equivalent for a client-rendered active-link
// check in a shared layout — usePathname() is Next's own idiom for this,
// so the whole nav is a client component now rather than the mostly-static
// server render it was in Astro. The markup/behavior is otherwise verbatim.
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import CartBadge from './CartBadge'
import AdminPanelLink, { useAdminAuthed } from './AdminPanelLink'
import RentalDatePicker, { type RentalDatePickerHandle } from './RentalDatePicker'
import { useBusinessHours } from './BusinessHoursContext'
import { formatBusinessHoursRange } from '../lib/dateRange'
import { OPEN_DATE_PICKER_EVENT } from '../stores/dates'

export default function Navbar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // Finding 2 (2026-09-11 live pass over block B, on top of B1/G4): the
  // OPEN_DATE_PICKER_EVENT bridge (scripts/cart-actions.ts, dispatched when a
  // rental add-to-cart is clicked with no dates chosen) used to be answered
  // only by CatalogDatePickerTrigger.tsx, which was rendered only by
  // /catalog — so the identical [data-add-to-cart] button on a ProductCard
  // in the homepage grid or a product page's related-products grid dispatched
  // the event to nobody: click, nothing happens, same drop-off G4 already
  // named. Navbar is the one component every (frontend) page already renders
  // exactly once (it's mounted unconditionally in (frontend)/layout.tsx), and
  // it already renders its own uncontrolled RentalDatePicker instance (the
  // `navbar` variant's header pill) — so making *that* instance answer the
  // event, via a ref, is a single listener that's already present everywhere,
  // not a new component to mount. CatalogDatePickerTrigger's own listener was
  // removed in the same change specifically to keep this to exactly one
  // listener per page: with both still wired up, a click on /catalog would
  // have opened two modals at once (dates.ts's own comment on this event
  // already assumed exactly one listener per page — that was the trap, not a
  // hypothetical). The catalog page's own compact date-picker pill (still
  // rendered directly by CatalogPage.tsx) is unaffected — it opens its own
  // modal instance from its own click, same as before, just no longer also
  // listening for this event.
  const datePickerRef = useRef<RentalDatePickerHandle>(null)
  useEffect(() => {
    function handleOpenRequest() {
      datePickerRef.current?.open('from')
    }
    window.addEventListener(OPEN_DATE_PICKER_EVENT, handleOpenRequest)
    return () => window.removeEventListener(OPEN_DATE_PICKER_EVENT, handleOpenRequest)
  }, [])
  // B4 (design_handoff_swiss_bento/08-instruction.md, audit N5) — this was a
  // third hardcoded "10:00—21:00" (RentalDatePicker's grid and caption were
  // the other two), found while fixing the other two. Same source now.
  const businessHours = useBusinessHours()
  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`)
  // The Astro source checked `currentPath.includes('type=kit')` against
  // Astro.url.pathname — which never contains the query string, so that
  // check was always false and "Наборы" never actually highlighted as
  // active. Fixed here using the real query param instead of porting the
  // dead condition verbatim; flagged in the Stage 2 commit/summary as an
  // observable behavior change, not a silent one.
  const isKitFilter = searchParams.get('type') === 'kit'
  // C1 (design_handoff_swiss_bento/08-instruction.md, G2): the mobile nav
  // links below are now next/link, so clicking one no longer forces a full
  // document reload — which used to be exactly what reset the "peer"
  // checkbox (mobile-menu-toggle) below and closed the dropdown. Navbar
  // itself lives in the shared (frontend)/layout.tsx and is never remounted
  // by a same-app client-side navigation, so without this the checkbox's
  // checked state would survive the navigation and the mobile menu would
  // stay visibly open on the destination page. Uncontrolled on purpose
  // (matches the existing peer-checkbox pattern, no controlled-open state
  // to introduce) — just close it imperatively on click.
  const mobileMenuToggleRef = useRef<HTMLInputElement>(null)
  const closeMobileMenu = () => {
    if (mobileMenuToggleRef.current) mobileMenuToggleRef.current.checked = false
  }
  // E1/E3/E4 drive-by fix (see AdminPanelLink.tsx's own header comment):
  // the header-row pill is now hidden below `md`, so a logged-in admin
  // needs an equivalent entry in the mobile dropdown to keep /admin
  // reachable on a small viewport. A separate hook call (rather than
  // reusing <AdminPanelLink>'s own internal fetch) since this item lives
  // in a different part of the DOM (the dropdown, not the header row) and
  // needs its own auth-gated render.
  const isAdminAuthed = useAdminAuthed()

  return (
    <div className="sticky top-0 z-[60] px-3.5 pt-3 sm:px-[14px]" style={{ background: 'linear-gradient(180deg,rgba(239,238,235,0.96) 60%,rgba(239,238,235,0))' }}>
      <header className="container-page flex h-16 items-center gap-4 rounded-[20px] border border-border bg-white/[0.86] px-4 shadow-[var(--shadow-soft)] backdrop-blur-[20px] backdrop-saturate-[1.6] sm:gap-[30px] sm:px-4">
        <Link href="/" className="flex shrink-0 items-baseline gap-[7px] select-none">
          <span className="text-[15px] font-bold uppercase tracking-[0.02em]">Playback</span>
          <span className="hidden text-[15px] font-normal uppercase tracking-[0.02em] text-subtle sm:inline">Rental</span>
          <span className="text-[10px] text-accent" style={{ transform: 'translateY(-6px)' }}>®</span>
        </Link>

        <nav className="ml-1 hidden min-w-0 items-center gap-1 whitespace-nowrap md:flex">
          <Link href="/catalog" className={`rounded-full px-[13px] py-2 text-[11px] font-semibold uppercase tracking-[0.12em] border-0 transition-colors duration-240 ease-expo hover:bg-primary hover:text-primary-foreground ${isActive('/catalog') && !isKitFilter ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>Каталог</Link>
          <Link href="/catalog?type=kit" className={`rounded-full px-[13px] py-2 text-[11px] font-semibold uppercase tracking-[0.12em] border-0 transition-colors duration-240 ease-expo hover:bg-primary hover:text-primary-foreground ${isKitFilter ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>Наборы</Link>
          <Link href="/how-it-works" className={`rounded-full px-[13px] py-2 text-[11px] font-semibold uppercase tracking-[0.12em] border-0 transition-colors duration-240 ease-expo hover:bg-primary hover:text-primary-foreground ${isActive('/how-it-works') ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>Условия</Link>
          <Link href="/contact" className={`rounded-full px-[13px] py-2 text-[11px] font-semibold uppercase tracking-[0.12em] border-0 transition-colors duration-240 ease-expo hover:bg-primary hover:text-primary-foreground ${isActive('/contact') ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>Контакты</Link>
        </nav>

        <div className="flex-1"></div>

        <div className="hidden shrink-0 items-center gap-2 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle xl:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" style={{ animation: 'bnBlink 2.6s ease-in-out infinite' }}></span>
          <span>{formatBusinessHoursRange(businessHours.open, businessHours.close)}</span>
        </div>

        <RentalDatePicker ref={datePickerRef} variant="navbar" />

        <Link
          href="/checkout"
          className="flex h-[38px] shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full bg-primary py-0 pl-4 pr-1.5 text-primary-foreground transition-[background-color,gap] duration-240 ease-expo hover:bg-primary-hover hover:gap-3.5"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em]">Корзина</span>
          <CartBadge />
        </Link>

        <AdminPanelLink />

        <input ref={mobileMenuToggleRef} type="checkbox" id="mobile-menu-toggle" className="peer hidden" />
        <label htmlFor="mobile-menu-toggle" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full md:hidden" aria-label="Меню">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </label>

        <div className="peer-[:checked]:flex absolute left-0 right-0 top-[68px] hidden flex-col gap-1 rounded-[20px] border border-border bg-card p-3 shadow-[var(--shadow-lifted)] md:hidden">
          <Link href="/catalog" onClick={closeMobileMenu} className="rounded-xl px-3 py-2 text-[14.5px] font-medium hover:bg-muted">Каталог</Link>
          <Link href="/catalog?type=kit" onClick={closeMobileMenu} className="rounded-xl px-3 py-2 text-[14.5px] font-medium hover:bg-muted">Наборы</Link>
          <Link href="/how-it-works" onClick={closeMobileMenu} className="rounded-xl px-3 py-2 text-[14.5px] font-medium hover:bg-muted">Условия</Link>
          <Link href="/contact" onClick={closeMobileMenu} className="rounded-xl px-3 py-2 text-[14.5px] font-medium hover:bg-muted">Контакты</Link>
          {isAdminAuthed && (
            <Link href="/admin" onClick={closeMobileMenu} className="rounded-xl px-3 py-2 text-[14.5px] font-medium hover:bg-muted">Панель управления</Link>
          )}
        </div>
      </header>
    </div>
  )
}
