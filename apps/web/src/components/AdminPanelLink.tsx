import { useEffect, useState } from 'react'

// /api is proxied straight through to the CMS by src/middleware.ts — same
// origin as the storefront, so this is just a same-origin session check
// now (cookie already travels naturally, no CORS involved). No admin
// session, no link: this never renders a login prompt of its own, it only
// surfaces the real admin panel once already authenticated.
//
// Points at /admin (the custom admin UI, docs/PLAN-docker-admin.md Step 3+)
// — /cms (Payload's native admin) remains available as a fallback but is no
// longer the primary entry point.
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
      className="flex h-[38px] shrink-0 items-center whitespace-nowrap rounded-full border border-border px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground transition-colors duration-200 hover:bg-primary hover:text-primary-foreground"
    >
      Панель управления
    </a>
  )
}
