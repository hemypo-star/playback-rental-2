'use client'

// Ported from apps/web/src/components/AdminPanelLink.tsx (docs/PLAN-next-
// migration.md Stage 2) — near-verbatim. /api is native to this app
// ((payload) route group) so this fetch is genuinely same-origin now, same
// as before Stage 1 flipped the proxy direction.
//
// Plain <a>, not next/link: /admin still lives in apps/web and is reached
// through this app's own fallback proxy (src/proxy.ts) until Stage 3 moves
// the custom admin UI into apps/cms/src/app/(admin) — next/link is for
// same-app client-side transitions, which this isn't yet.
import { useEffect, useState } from 'react'

export default function AdminPanelLink() {
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

  if (!authed) return null

  return (
    <a
      href="/admin"
      className="flex h-[38px] shrink-0 items-center whitespace-nowrap rounded-full border border-border px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground transition-colors duration-240 ease-expo hover:bg-primary hover:text-primary-foreground"
    >
      Панель управления
    </a>
  )
}
