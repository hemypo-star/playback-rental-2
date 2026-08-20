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
import { useEffect } from 'react'
import { initCatalogAvailability } from '../scripts/catalog-availability'

export default function CatalogAvailabilityInit() {
  useEffect(() => {
    initCatalogAvailability()
  }, [])
  return null
}
