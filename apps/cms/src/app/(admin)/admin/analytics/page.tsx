import type { Metadata } from 'next'
import AdminPageHeader from '../../../../components/admin/AdminPageHeader'
import AdminKpiCards from '../../../../components/admin/AdminKpiCards'
import { getAdminKpi } from '../../../../lib/admin/data/kpi'
import { getAdminAnalytics } from '../../../../lib/admin/data/analytics'
import { rub } from '../../../../lib/admin/format'

// Ported from apps/web/src/pages/admin/analytics.astro (docs/PLAN-next-
// migration.md Stage 3.5, page group 4).
export const metadata: Metadata = { title: 'Аналитика' }
export const dynamic = 'force-dynamic'

export default async function AdminAnalyticsPage() {
  const [kpi, rows] = await Promise.all([getAdminKpi(), getAdminAnalytics()])
  const maxRevenue = rows.length ? rows[0].revenue : 1

  return (
    <>
      <AdminPageHeader title="Аналитика" subtitle="Выручка по категориям, кроме отменённых заказов" />
      <AdminKpiCards kpi={kpi} />

      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Выручка по категориям</div>
        <div className="mt-3.5">
          {rows.map((r) => (
            // Track background is the design's literal #F0EFEC, not the
            // --color-muted token (#F4F3F1) — close but a distinct value
            // used only for this bar and the "ok" stock-status badge.
            <div key={r.name} className="grid grid-cols-[200px_1fr_100px] items-center gap-4.5 rounded-2xl px-2.5 py-3 transition-colors duration-240 ease-expo hover:bg-muted">
              <span className="truncate text-[14px]">{r.name}</span>
              <div className="h-3.5 overflow-hidden rounded-full bg-[#F0EFEC]">
                <div
                  className="h-full origin-left rounded-full bg-primary"
                  style={{ width: `${Math.max(4, (r.revenue / maxRevenue) * 100)}%`, animation: 'bnRule 900ms cubic-bezier(0.16,1,0.3,1) both' }}
                />
              </div>
              <span className="text-right text-[14px] font-semibold">{rub(r.revenue)}</span>
            </div>
          ))}
          {rows.length === 0 ? <div className="px-2.5 py-8 text-center text-[13.5px] text-subtle">Пока нет данных</div> : null}
        </div>
      </div>
    </>
  )
}
