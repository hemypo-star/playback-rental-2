'use client'

// Next equivalent of the inline <script> at the bottom of apps/web/src/
// components/CatalogPage.astro (docs/PLAN-next-migration.md Stage 2's
// "<script> в .astro → useEffect в клиентском компоненте" mapping), same
// pattern as CartActionsInit.tsx. Renders nothing — just wires up the
// "only free" toggle + live per-card availability once per page. Safe to
// re-run fresh on every catalog page load: category/sort/search links here
// are plain <a href>, not next/link, so a filter change is a full
// navigation (matching the Astro original, which never used client-side
// routing either), not a soft navigation this effect would need to survive.
//
// C5 (design_handoff_swiss_bento/08-instruction.md, N7/N9) revisited this,
// as C1's own comment on CategorySidebar.tsx said it would, and left it
// exactly as it was — including the new pager C5 added, which is also a
// plain <a>, not next/link, for the same reason. Making this effect survive
// a same-route soft navigation would mean: re-running it on a dependency
// that actually changes with the rendered product list (e.g. the ids on the
// page), not just on mount; unsubscribing the previous initCatalogAvailability()
// call's `$selectedDates.subscribe(refresh)` before re-subscribing, since
// nanostores doesn't do that automatically and a leaked subscription would
// mean stale closures over the old DOM snapshot keep firing alongside the
// new one; and auditing whether next/link's client-side reconciliation
// reuses or replaces the "only free" toggle button's own DOM node across a
// filter change, since a reused node plus a naive re-`addEventListener`
// would double the click handler. None of that is unrunnable in principle —
// but this migration's standing rule is to verify a change like this against
// a real browser (CLAUDE.md calls stale catalog stock out by name as a known
// bug class here), and the verification available for this pass is
// deliberately non-live (no Postgres, no browser — see this PR's own
// description). Shipping an unverified rewrite of exactly the code that
// exists to keep displayed stock honest would be the "convert and hope"
// C5's own instructions warn against, so this stays a full navigation until
// someone can verify the resilient version live.
import { useEffect } from 'react'
import { initCatalogAvailability } from '../scripts/catalog-availability'

export default function CatalogAvailabilityInit() {
  useEffect(() => {
    initCatalogAvailability()
  }, [])
  return null
}
