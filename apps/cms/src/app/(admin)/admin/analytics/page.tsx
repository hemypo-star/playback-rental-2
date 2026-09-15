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
            // Mobile (≤1020, S7's general no-horizontal-scroll rule): the
            // template's fixed 200px/100px side columns don't fit a phone
            // width, so this stacks name above bar+sum instead of the
            // desktop 3-column grid — `lg:contents` unwraps the flex row
            // wrapper below back into that grid's three items.
            <div key={r.name} className="flex flex-col gap-1.5 rounded-2xl px-2.5 py-3 transition-colors duration-240 ease-expo hover:bg-muted lg:grid lg:grid-cols-[200px_1fr_100px] lg:items-center lg:gap-4.5">
              <span className="truncate text-[14px]">{r.name}</span>
              <div className="flex items-center gap-3 lg:contents">
                <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-[#F0EFEC]">
                  <div
                    className="h-full origin-left rounded-full bg-primary"
                    style={{ width: `${Math.max(4, (r.revenue / maxRevenue) * 100)}%`, animation: 'bnRule 900ms var(--ease-expo) both' }}
                  />
                </div>
                <span className="text-right text-[14px] font-semibold">{rub(r.revenue)}</span>
              </div>
            </div>
          ))}
          {rows.length === 0 ? <div className="px-2.5 py-8 text-center text-[13.5px] text-subtle">Пока нет данных</div> : null}
        </div>
      </div>
    </>
  )
}
