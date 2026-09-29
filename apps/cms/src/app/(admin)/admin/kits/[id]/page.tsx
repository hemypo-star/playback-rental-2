import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import AdminPageHeader from '../../../../../components/admin/AdminPageHeader'
import KitForm from '../KitForm'
import { getKitById, getKitComponentOptions } from '../../../../../lib/admin/data/kits'
import { getAdminCategories } from '../../../../../lib/admin/data/categories'

// Edit an existing kit. /admin/kits/new renders the same form in create
// mode — this route only loads a doc when it's actually a kit (isKit),
// so editing a regular synced product stays on /admin/products/[id].
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

async function loadKit(idParam: string) {
  const id = Number(idParam)
  if (!Number.isFinite(id)) redirect('/admin/kits')
  const kit = await getKitById(id)
  if (!kit) redirect('/admin/kits')
  return kit
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const kit = await loadKit(id)
  return { title: `Набор: ${kit.title}` }
}

export default async function AdminKitEditPage({ params }: Props) {
  const { id } = await params
  const [kit, components, categories] = await Promise.all([loadKit(id), getKitComponentOptions(), getAdminCategories()])

  return (
    <>
      <AdminPageHeader title={kit.title} subtitle="Набор" />
      <Link href="/admin/kits" className="text-[12.5px] font-semibold text-subtle hover:text-foreground">← Все наборы</Link>
      <KitForm kit={kit} components={components} categories={categories} />
    </>
  )
}
