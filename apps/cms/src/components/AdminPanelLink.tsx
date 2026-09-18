'use client'

// Ported from apps/web/src/components/AdminPanelLink.tsx (docs/PLAN-next-
// migration.md Stage 2) — near-verbatim. /api is native to this app
// ((payload) route group) so this fetch is genuinely same-origin now, same
// as before Stage 1 flipped the proxy direction.
//
// C1 (design_handoff_swiss_bento/08-instruction.md, G2): /admin is now a
// genuine same-app route ((admin) route group, since Stage 3/4), so this is
// next/link like the rest of the storefront — the old "plain <a>, /admin
// still lives in apps/web behind the fallback proxy" rationale no longer
// applies, both apps/web and proxy.ts are gone (Stage 4).
//
// E1/E3/E4 (design_handoff_swiss_bento/08-instruction.md) each separately
// flagged the same real bug, left unfixed as out of their own screen's
// scope: this pill has real text content ("Панель управления") and no
// mobile treatment, so for a logged-in admin it was one more `shrink-0`
// element contributing to Navbar's page-level horizontal overflow at
// 360-390px alongside the date-picker chip (see RentalDatePicker's navbar
// variant). Fixed the same way as every other Navbar item below md: hidden
// here (`hidden ... md:flex`) with an equivalent entry in Navbar's own
// mobile dropdown menu instead, so the admin panel stays reachable on
// mobile, just not as a fixed-width pill in the header row. `useAdminAuthed`
// is split out so Navbar's mobile-menu item can gate on the same auth check
// without this component and the mobile item needing to coordinate state.
import { useEffect, useState } from 'react'
import Link from 'next/link'

export function useAdminAuthed(): boolean {
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/users/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.user) setAuthed(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return authed
}

export default function AdminPanelLink() {
  const authed = useAdminAuthed()

  if (!authed) return null

  return (
    <Link
      href="/admin"
      className="hidden h-[38px] shrink-0 items-center whitespace-nowrap rounded-full border border-border px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground transition-colors duration-240 ease-expo hover:bg-primary hover:text-primary-foreground min-[1021px]:flex"
    >
      Панель управления
    </Link>
  )
}
