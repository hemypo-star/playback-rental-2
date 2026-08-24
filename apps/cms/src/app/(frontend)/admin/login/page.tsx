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

export default async function AdminLoginPage({ searchParams }: Props) {
  const user = await getAdminUser()
  if (user) redirect('/admin')
  if (!(await isAdminInitialized())) redirect('/admin/first-register')

  const { next } = await searchParams
  const nextPath = next || '/admin'

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-16">
      <div className="card-surface w-full max-w-[380px] p-8">
        <h1 className="text-[22px] font-bold tracking-[-0.03em]">Вход в админку</h1>
        <p className="mt-1.5 text-[13px] text-subtle">Playback Rental</p>
        <AdminLoginForm nextPath={nextPath} />
      </div>
    </div>
  )
}
