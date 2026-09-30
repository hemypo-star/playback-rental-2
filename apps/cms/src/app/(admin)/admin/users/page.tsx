import type { Metadata } from 'next'
import AdminPageHeader from '../../../../components/admin/AdminPageHeader'
import UsersPanel from '../../../../components/admin/UsersPanel'
import { getAdminUsers } from '../../../../lib/admin/data/users'
import { getAdminUser } from '../../../../lib/admin/auth'

// Ported from apps/web/src/pages/admin/users.astro (docs/PLAN-next-
// migration.md Stage 3.5, page group 6).
export const metadata: Metadata = { title: 'Пользователи' }
export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const [users, self] = await Promise.all([getAdminUsers(), getAdminUser()])

  return (
    <>
      <AdminPageHeader title="Пользователи" subtitle={`${users.length} администраторов`} />
      <UsersPanel users={users} ownId={self!.id} />
    </>
  )
}
