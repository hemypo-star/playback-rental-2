import type { Metadata } from 'next'
import Link from 'next/link'
import AdminPageHeader from '../../../../../components/admin/AdminPageHeader'
import KitForm from '../KitForm'
import { getKitComponentOptions } from '../../../../../lib/admin/data/kits'
import { getAdminCategories } from '../../../../../lib/admin/data/categories'

// Create a new kit — same form as /admin/kits/[id] in create mode
// (kit=null). Kits are the only products created by hand; everything
// else on the storefront originates from sync:moysklad.
export const metadata: Metadata = { title: 'Новый набор' }
export const dynamic = 'force-dynamic'

export default async function AdminKitNewPage() {
  const [components, categories] = await Promise.all([getKitComponentOptions(), getAdminCategories()])

  return (
    <>
      <AdminPageHeader title="Новый набор" subtitle="Соберите комплект из синхронизированных товаров" />
      <Link href="/admin/kits" className="text-[12.5px] font-semibold text-subtle hover:text-foreground">← Все наборы</Link>
      <KitForm kit={null} components={components} categories={categories} />
    </>
  )
}
