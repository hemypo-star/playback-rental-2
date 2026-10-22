import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import AdminLoginForm from '../../../../components/admin/AdminLoginForm'
import { getAdminUser, isAdminInitialized } from '../../../../lib/admin/auth'

// Ported from apps/web/src/pages/admin/login.astro (docs/PLAN-next-
// migration.md Stage 3.5, page group 1). Deliberately under (frontend), not
// (admin): this page keeps the storefront chrome (Navbar/Footer), matching
// the Astro source's own choice to import the site Layout rather than
// AdminLayout — it never passes through (admin)/admin/layout.tsx's guard.
export const metadata: Metadata = { title: 'Вход в админку' }
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ next?: string }>
}

const NEXT_BASE = 'http://same-origin.invalid'

function safeNextPath(next: unknown): string {
  if (typeof next !== 'string' || !next.startsWith('/') || /[\u0000-\u001F\u007F\\]/.test(next)) return '/admin'
  try {
    const url = new URL(next, NEXT_BASE)
    // Dot segments can normalize to a protocol-relative path: /a/../..//evil.example
    if (url.origin !== NEXT_BASE || url.pathname.startsWith('//')) return '/admin'
    return url.pathname + url.search + url.hash
  } catch {
    return '/admin'
  }
}

export default async function AdminLoginPage({ searchParams }: Props) {
  const user = await getAdminUser()
  if (user) redirect('/admin')
  if (!(await isAdminInitialized())) redirect('/admin/first-register')

  const { next } = await searchParams
  // SEC-020: `next` is assigned to window.location.href after login, so an
  // unchecked value allowed `?next=javascript:…` (script in the admin's fresh
  // session) or an open redirect to another site. Resolve it against a dummy
  // origin and keep it only if it stays on that origin; control characters
  // and backslashes are rejected first because URL parsing silently strips
  // tabs/newlines (`/\t/evil.example` would otherwise become `//evil.example`).
  const nextPath = safeNextPath(next)

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-16">
      <div className="card-surface w-full max-w-[380px] p-8">
        <h1 className="text-[22px] font-bold tracking-[-0.03em]">Вход в&nbsp;админку</h1>
        <p className="mt-1.5 text-[13px] text-subtle">Playback Rental</p>
        <AdminLoginForm nextPath={nextPath} />
      </div>
    </div>
  )
}
