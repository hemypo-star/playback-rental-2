import type { Metadata } from 'next'
import Link from 'next/link'
import AdminPageHeader from '../../../../components/admin/AdminPageHeader'
import AdminKpiCards from '../../../../components/admin/AdminKpiCards'
import { getAdminKpi } from '../../../../lib/admin/data/kpi'
import { getAdminOrders } from '../../../../lib/admin/data/orders'
import { rub, formatDate, ORDER_STATUS_TONE } from '../../../../lib/admin/format'

// Ported from apps/web/src/pages/admin/orders.astro (docs/PLAN-next-
// migration.md Stage 3.5, page group 3 — "самая сложная", most complex).
export const metadata: Metadata = { title: 'Очередь заявок' }
export const dynamic = 'force-dynamic'

export default async function AdminOrdersPage() {
  const [kpi, orders] = await Promise.all([getAdminKpi(), getAdminOrders()])

  return (
    <>
      <AdminPageHeader title="Очередь заявок" subtitle={`${orders.length} последних заказов`} />
      <AdminKpiCards kpi={kpi} />

      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="grid grid-cols-[90px_1.6fr_1.4fr_1fr_110px_130px] gap-3.5 px-2.5 pb-3 text-[10px] font-semibold tracking-[0.13em] text-subtle uppercase">
          <span>Номер</span><span>Клиент</span><span>Позиции</span><span>Даты</span><span>Сумма</span><span>Статус</span>
        </div>
        {orders.map((o, i) => {
          const tone = ORDER_STATUS_TONE[o.status]
          const [start, end] = o.dates ? o.dates.split('|') : [null, null]
          return (
            <Link
              key={o.id}
              href={`/admin/orders/${o.id}`}
              className="grid grid-cols-[90px_1.6fr_1.4fr_1fr_110px_130px] items-center gap-3.5 rounded-2xl px-2.5 py-3.5 text-[13.5px] transition-colors duration-240 ease-expo hover:bg-muted"
              style={{ animation: 'bnIn 560ms cubic-bezier(0.16,1,0.3,1) both', animationDelay: `${Math.min(i * 55, 400)}ms` }}
            >
              <span className="font-semibold">#{o.id}</span>
              <span className="truncate">{o.customerName}</span>
              <span className="truncate text-[12.5px] text-subtle">{o.itemsSummary}</span>
              <span className="text-[12.5px] text-subtle">{start && end ? `${formatDate(start)} – ${formatDate(end)}` : '—'}</span>
              <span className="font-semibold">{rub(o.totalPrice)}</span>
              <span
                className="justify-self-start rounded-full px-3 py-1.5 text-[10px] font-semibold tracking-[0.1em] uppercase"
                style={{ background: tone.bg, color: tone.color }}
              >
                {tone.label}
              </span>
            </Link>
          )
        })}
        {orders.length === 0 ? <div className="px-2.5 py-8 text-center text-[13.5px] text-subtle">Заказов пока нет</div> : null}
      </div>
    </>
  )
}
