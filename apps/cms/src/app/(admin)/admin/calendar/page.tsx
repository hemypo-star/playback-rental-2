import type { Metadata } from 'next'
import AdminPageHeader from '../../../../components/admin/AdminPageHeader'
import { getAdminCalendar } from '../../../../lib/admin/data/calendar'
import { ORDER_STATUS_TONE, type OrderStatus } from '../../../../lib/admin/format'

// Ported from apps/web/src/pages/admin/calendar.astro (docs/PLAN-next-
// migration.md Stage 3.5, page group 4).
export const metadata: Metadata = { title: 'Календарь аренд' }
export const dynamic = 'force-dynamic'

function startOfDay(iso: string): number {
  const d = new Date(iso)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// Bars only render for confirmed/pending order statuses — those are the
// only two an item can have (see lib/admin/data/calendar.ts, which only
// ever queries ACTIVE_STATUSES = ['pending', 'confirmed']).
const LEGEND: { status: OrderStatus; label: string }[] = [
  { status: 'confirmed', label: 'Аренда' },
  { status: 'pending', label: 'Бронь' },
]

export default async function AdminCalendarPage() {
  const { days, products } = await getAdminCalendar()
  const dayCount = days.length
  const today = startOfDay(days[0])
  const rangeEndExclusive = startOfDay(days[dayCount - 1]) + 86400000
  const dayMs = 86400000

  return (
    <>
      <AdminPageHeader title="Календарь аренд" subtitle="Занятость парка на две недели вперёд" />

      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-wrap gap-4.5 text-[10.5px] font-semibold tracking-[0.1em] text-subtle uppercase">
          {LEGEND.map((l) => (
            <span key={l.status} className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded"
                style={{ background: ORDER_STATUS_TONE[l.status].bg, border: `1px solid ${ORDER_STATUS_TONE[l.status].color}` }}
              />
              {l.label}
            </span>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto">
          <div style={{ minWidth: '900px' }}>
            <div className="grid gap-3.5" style={{ gridTemplateColumns: '210px 1fr' }}>
              <div />
              <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${dayCount}, 1fr)` }}>
                {days.map((d) => (
                  <div key={d} className="text-center text-[10px] font-medium text-subtle">
                    {new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                  </div>
                ))}
              </div>
            </div>

            {products.map((p) => (
              <div
                key={p.id}
                className="grid items-center gap-3.5 rounded-2xl px-0 py-3 transition-colors duration-240 ease-expo hover:bg-muted"
                style={{ gridTemplateColumns: '210px 1fr' }}
              >
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium tracking-[-0.02em]">{p.title}</div>
                </div>
                <div className="relative" style={{ height: '28px' }}>
                  {p.items.map((item) => {
                    const itemStart = startOfDay(item.startDate)
                    const itemEnd = startOfDay(item.endDate)
                    const clippedStart = Math.max(itemStart, today)
                    const clippedEnd = Math.min(itemEnd, rangeEndExclusive - dayMs)
                    const startOffset = Math.round((clippedStart - today) / dayMs)
                    const span = Math.max(1, Math.round((clippedEnd - clippedStart) / dayMs) + 1)
                    const tone = item.orderStatus ? ORDER_STATUS_TONE[item.orderStatus] : { bg: '#F0F0F3', color: '#6E6E73', label: '—' }
                    return (
                      <div
                        key={item.id}
                        title={`${item.quantity} шт. — заказ #${item.orderId} · ${tone.label}`}
                        className="absolute top-0 flex h-[28px] items-center overflow-hidden rounded-lg px-2 text-[12px] font-semibold whitespace-nowrap transition-transform duration-[320ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-y-[1.16]"
                        style={{
                          left: `${(startOffset / dayCount) * 100}%`,
                          width: `${(span / dayCount) * 100}%`,
                          background: tone.bg,
                          color: tone.color,
                        }}
                      >
                        ×{item.quantity}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            {products.length === 0 ? <div className="px-2.5 py-8 text-center text-[13.5px] text-subtle">Нет товаров в аренде</div> : null}
          </div>
        </div>
      </div>
    </>
  )
}
