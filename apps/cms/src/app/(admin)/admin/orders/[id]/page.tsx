import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import AdminPageHeader from '../../../../../components/admin/AdminPageHeader'
import OrderDetailForm from '../../../../../components/admin/OrderDetailForm'
import { getAdminOrderDetail } from '../../../../../lib/admin/data/orders'

// Ported from apps/web/src/pages/admin/orders/[id].astro (docs/PLAN-next-
// migration.md Stage 3.5, page group 3).
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

async function loadOrder(idParam: string) {
  const id = Number(idParam)
  if (!Number.isFinite(id)) redirect('/admin/orders')
  const detail = await getAdminOrderDetail(id)
  if (!detail) redirect('/admin/orders')
  return detail
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const { order } = await loadOrder(id)
  return { title: `Заказ #${order.id}` }
}

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params
  const { order, items } = await loadOrder(id)

  return (
    <>
      <AdminPageHeader title={`Заказ #${order.id}`} subtitle={order.customerName} />
      <OrderDetailForm order={order} items={items} />
    </>
  )
}
