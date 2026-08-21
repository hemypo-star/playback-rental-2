import React from 'react'
import type { ServerProps } from 'payload'
import type { OrderItem } from '../../payload-types'

const RUB = (n: number) => Math.round(n).toLocaleString('ru-RU') + ' ₽'

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        padding: 18,
        background: 'var(--theme-elevation-0)',
        border: '1px solid var(--theme-elevation-100)',
        borderRadius: 18,
        minWidth: 190,
        flex: '1 1 190px',
      }}
    >
      <div style={{ fontSize: 12.5, color: 'var(--theme-elevation-500)', fontWeight: 500 }}>{label}</div>
      <div style={{ marginTop: 7, fontSize: 27, fontWeight: 700, letterSpacing: '-0.035em', whiteSpace: 'nowrap' }}>{value}</div>
      {sub && <div style={{ marginTop: 5, fontSize: 12.5, fontWeight: 600, color: 'var(--theme-elevation-500)' }}>{sub}</div>}
    </div>
  )
}

// Real numbers only — computed directly from orders/orderItems/products,
// unlike the design reference's KPI row (which used placeholder figures with
// no backing data model). Rendered above the default collection overview via
// admin.components.beforeDashboard, so the default dashboard still works
// underneath it.
// Only pending/confirmed orders hold a live reservation against stock —
// cancelled/completed orders' line items don't occupy a slot (status lives
// only on Orders, never on orderItems, so this has to be a two-step lookup).
// Same rule CalendarView.tsx uses for the occupancy Gantt.
const ACTIVE_STATUSES = ['pending', 'confirmed']

export const AdminKpiWidget: React.FC<ServerProps> = async ({ payload }) => {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [weeklyOrders, pendingOrders, submittedOrders, rentalProducts, activeOrders] = await Promise.all([
    payload.find({
      collection: 'orders',
      where: { createdAt: { greater_than_equal: weekAgo.toISOString() } },
      limit: 0,
      depth: 0,
    }),
    payload.find({
      collection: 'orders',
      where: { status: { equals: 'pending' } },
      limit: 0,
      depth: 0,
    }),
    payload.find({
      collection: 'orders',
      where: { submittedAt: { exists: true } },
      limit: 0,
      depth: 0,
    }),
    payload.find({
      collection: 'products',
      where: { listingType: { equals: 'rental' } },
      limit: 0,
      depth: 0,
    }),
    payload.find({
      collection: 'orders',
      where: { status: { in: ACTIVE_STATUSES } },
      limit: 0,
      depth: 0,
    }),
  ])

  const activeOrderIds = activeOrders.docs.map((o) => o.id)
  const activeItems =
    activeOrderIds.length === 0
      ? { docs: [] as OrderItem[] }
      : await payload.find({
          collection: 'orderItems',
          where: {
            and: [
              { order: { in: activeOrderIds } },
              { listingType: { equals: 'rental' } },
              { startDate: { less_than_equal: now.toISOString() } },
              { endDate: { greater_than: now.toISOString() } },
            ],
          },
          limit: 0,
          depth: 0,
        })

  const weeklyRevenue = weeklyOrders.docs.reduce((sum, o) => sum + (o.totalPrice || 0), 0)
  const pendingCount = pendingOrders.totalDocs
  const avgOrderValue = submittedOrders.totalDocs
    ? submittedOrders.docs.reduce((sum, o) => sum + (o.totalPrice || 0), 0) / submittedOrders.totalDocs
    : 0

  const totalRentalStock = rentalProducts.docs.reduce((sum, p) => sum + (p.quantity || 0), 0)
  const activeRentalQty = activeItems.docs.reduce((sum, i) => sum + (i.quantity || 0), 0)
  const utilization = totalRentalStock > 0 ? Math.round((activeRentalQty / totalRentalStock) * 100) : 0

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, padding: '0 2.5rem', marginTop: '1.5rem' }}>
      <Card label="Выручка за 7 дней" value={RUB(weeklyRevenue)} sub={`${weeklyOrders.totalDocs} заявок`} />
      <Card label="Заявок в обработке" value={String(pendingCount)} sub={pendingCount > 0 ? 'ждут звонка' : undefined} />
      <Card label="Занятость парка" value={`${utilization}%`} sub={`${activeRentalQty} из ${totalRentalStock} ед.`} />
      <Card label="Средний чек" value={RUB(avgOrderValue)} sub={`${submittedOrders.totalDocs} оформленных`} />
    </div>
  )
}
