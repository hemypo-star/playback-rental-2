'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useStore } from '@nanostores/react'
import { $selectedDates } from '../stores/dates'

// The catalog sidebar's "Только свободные" switch.
//
// A client component only because the filter it drives is date-aware and the
// dates live in sessionStorage (stores/dates.ts), which the server cannot
// read. Everything the filter actually does happens server-side: the visitor's
// window travels in the URL as ?from=/?to=, PrototypeCatalog resolves it into
// an exclusion list (lib/rental/bookedQuantity.ts) and hands that to the
// product query, so pagination and the "N позиций" count stay exact. The
// implementation on `2.0` instead hid booked-out cards client-side with
// display:none, which left both of those describing a grid that was no longer
// on screen.
//
// Two jobs, which is why it is one component rather than a link plus a
// separate syncing island: it bakes the current dates into its own href so
// switching the filter on lands on the filtered page directly, and it repairs
// the URL when the two drift apart — the visitor changes dates (or clears
// them) while the filter is already on, or opens a link someone shared with a
// stale window in it.
function isoDay(d: Date | null): string | undefined {
  return d ? d.toISOString() : undefined
}

export default function PrototypeFreeToggle({ href, active, from, to }: { href: string; active: boolean; from?: string; to?: string }) {
  const dates = useStore($selectedDates)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const nextFrom = isoDay(dates.startDate)
  const nextTo = isoDay(dates.endDate)
  // The hint describes what the *server* actually filtered by, not what the
  // store holds: those differ for one render after the dates change, and the
  // store is empty on the server, so reading it here would render the hint
  // into every free-filtered page's HTML and then blink it away on hydration.
  const filteredWithoutDates = active && !(from && to)
  // The href below differs between the server (which has no sessionStorage to
  // read the dates from) and the client, so it can only change after the first
  // render — the same hydration constraint every date-derived bit of UI in
  // this app is under (see stores/dates.ts's own header comment).
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!active) return
    // Already in step, including the "no dates, no params" case.
    if ((from ?? undefined) === nextFrom && (to ?? undefined) === nextTo) return
    const params = new URLSearchParams(searchParams.toString())
    if (nextFrom && nextTo) {
      params.set('from', nextFrom)
      params.set('to', nextTo)
    } else {
      params.delete('from')
      params.delete('to')
    }
    // A different window is a different result set, so page 2 of the old one
    // is meaningless — same reasoning as every filter link in catalogQuery.ts.
    params.delete('page')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }, [active, from, to, nextFrom, nextTo, pathname, searchParams, router])

  // Turning the filter ON carries the dates straight through, so the first
  // render after the click is already the filtered one. Turning it OFF uses
  // the server-built href as is — buildCatalogUrl only emits from/to
  // alongside free=1, so they drop out with it.
  const target = mounted && !active && nextFrom && nextTo ? `${href}${href.includes('?') ? '&' : '?'}from=${encodeURIComponent(nextFrom)}&to=${encodeURIComponent(nextTo)}` : href

  return (
    <>
      <Link href={target} className="pb-free-toggle" data-active={active}>
        <span>Только свободные</span>
        <span className="pb-switch" data-active={active}>
          <span />
        </span>
      </Link>
      {filteredWithoutDates && (
        <p className="pb-free-hint">Даты не выбраны — показываем всё, что есть в наличии.</p>
      )}
    </>
  )
}
