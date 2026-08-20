import type { AdminKpi } from '../../lib/admin/data/kpi'

// Ported from apps/web/src/components/admin/KpiCards.astro (docs/PLAN-
// next-migration.md Stage 3.5, page group 3). Shown on the Orders and
// Analytics tabs only, matching the design's
// `showKpi: adminTab === 'orders' || adminTab === 'analytics'`.
const rub = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} ₽`

export default function AdminKpiCards({ kpi }: { kpi: AdminKpi }) {
  const cards = [
    { label: 'Выручка за 7 дней', value: rub(kpi.weeklyRevenue), note: `${kpi.weeklyOrdersCount} заявок`, accent: false },
    {
      label: 'Заявок в обработке',
      value: String(kpi.pendingCount),
      note: kpi.pendingCount > 0 ? 'ждут звонка' : undefined,
      accent: kpi.pendingCount > 0,
    },
    { label: 'Занятость парка', value: `${kpi.utilization}%`, note: `${kpi.activeRentalQty} из ${kpi.totalRentalStock} ед.`, accent: false },
    { label: 'Средний чек', value: rub(kpi.avgOrderValue), note: `${kpi.submittedCount} оформленных`, accent: false },
  ]

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c, i) => (
        <div
          key={c.label}
          className="rounded-[22px] border border-border bg-card p-5.5 transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_26px_48px_-32px_rgba(10,10,10,0.42)]"
          style={{ animation: 'bnIn 560ms cubic-bezier(0.16,1,0.3,1) both', animationDelay: `${Math.min(i * 70, 400)}ms` }}
        >
          <div className="text-[10.5px] font-semibold tracking-[0.13em] text-subtle uppercase">{c.label}</div>
          <div className="mt-2.5 text-[29px] font-medium tracking-[-0.035em]">{c.value}</div>
          {c.note ? <div className={`mt-1 text-[12px] ${c.accent ? 'text-accent' : 'text-subtle'}`}>{c.note}</div> : null}
        </div>
      ))}
    </div>
  )
}
