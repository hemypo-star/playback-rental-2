import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import AdminRegisterForm from '../../../../components/admin/AdminRegisterForm'
import { getAdminUser, isAdminInitialized } from '../../../../lib/admin/auth'

// Ported from apps/web/src/pages/admin/first-register.astro (docs/PLAN-
// next-migration.md Stage 3.5, page group 1). Under (frontend), same
// reasoning as admin/login/page.tsx — keeps the storefront chrome.
export const metadata: Metadata = { title: 'Создать администратора' }
export const dynamic = 'force-dynamic'

export default async function AdminFirstRegisterPage() {
  const user = await getAdminUser()
  if (user) redirect('/admin')
  if (await isAdminInitialized()) redirect('/admin/login')

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-16">
      <div className="card-surface w-full max-w-[380px] p-8">
        <h1 className="text-[22px] font-bold tracking-[-0.03em]">Создать администратора</h1>
        <p className="mt-1.5 text-[13px] text-subtle">Первый запуск — учётных записей ещё нет.</p>
        <AdminRegisterForm />
      </div>
    </div>
  )
}
