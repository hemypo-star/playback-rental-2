'use client'

// Next equivalent of the inline <script> in apps/web/src/layouts/Layout.astro
// that called initCartActions() on every page load (docs/PLAN-next-migration.md
// Stage 2's "<script> в .astro → useEffect в клиентском компоненте" mapping).
// Renders nothing — just wires up the delegated [data-add-to-cart] click
// handler once per page.
import { useEffect } from 'react'
import { initCartActions } from '../scripts/cart-actions'

export default function CartActionsInit() {
  useEffect(() => {
    initCartActions()
  }, [])
  return null
}
