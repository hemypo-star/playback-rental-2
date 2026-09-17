import type { Metadata } from 'next'
import Link from 'next/link'
import AdminPageHeader from '../../../../components/admin/AdminPageHeader'
import AdminKpiCards from '../../../../components/admin/AdminKpiCards'
import { normalizeAnalyticsDateRange } from '../../../../lib/admin/analyticsDateRange'
import { getAdminKpi } from '../../../../lib/admin/data/kpi'
import { getAdminAnalytics } from '../../../../lib/admin/data/analytics'
import { rub } from '../../../../lib/admin/format'

// Ported from apps/web/src/pages/admin/analytics.astro (docs/PLAN-next-
// migration.md Stage 3.5, page group 4).
export const metadata: Metadata = { title: 'Аналитика' }
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ from?: string; to?: string }>
}

function displayDate(value: string): string {
  const [year, month, day] = value.split('-')
  return `${day}.${month}.${year}`
}

export default async function AdminAnalyticsPage({ searchParams }: Props) {
  const { from: rawFrom, to: rawTo } = await searchParams
  const range = normalizeAnalyticsDateRange(rawFrom, rawTo)
  const hasRange = Boolean(range.from || range.to)

  // Item 14 scopes the date filter to the revenue-by-category report. KPI
  // cards intentionally remain the same all-time operational KPIs they are
  // on the other admin screens; the form says this explicitly so a filtered
  // chart cannot be mistaken for changing the KPI definitions too.
  const [kpi, rows] = await Promise.all([getAdminKpi(), getAdminAnalytics(range)])
  const maxRevenue = rows.length ? rows[0].revenue : 1
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0)

  const periodLabel = range.from && range.to
    ? `${displayDate(range.from)} — ${displayDate(range.to)}`
    : range.from
      ? `с ${displayDate(range.from)}`
      : range.to
        ? `по ${displayDate(range.to)}`
        : 'за всё время'

  return (
    <>
      <AdminPageHeader title="Аналитика" subtitle="Выручка по категориям, кроме отменённых заказов" />
      <AdminKpiCards kpi={kpi} />

      <form method="GET" className="flex flex-wrap items-end gap-3 rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="analytics-from" className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">
            С даты
          </label>
          <input
            id="analytics-from"
            type="date"
            name="from"
            defaultValue={range.from ?? ''}
            className="h-11 rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="analytics-to" className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">
            По дату
          </label>
          <input
            id="analytics-to"
            type="date"
            name="to"
            defaultValue={range.to ?? ''}
            className="h-11 rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground"
          />
        </div>
        <button type="submit" className="btn-primary h-11">
          Применить
        </button>
        {hasRange ? (
          <Link href="/admin/analytics" className="btn-ghost inline-flex h-11 items-center px-5">
            Сбросить
          </Link>
        ) : null}
        <div className="min-w-[240px] flex-1 text-[11.5px] leading-[1.45] text-subtle">
          Период считается по дате оформления заказа, время Кемерово. KPI выше остаются общими за всё время.
        </div>
      </form>

      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Выручка по категориям</div>
          <div className="text-[12px] text-subtle">
            {periodLabel} · <span className="font-semibold text-foreground">{rub(totalRevenue)}</span>
          </div>
        </div>
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
          {rows.length === 0 ? (
            <div className="px-2.5 py-8 text-center text-[13.5px] text-subtle">
              {hasRange ? 'За выбранный период данных нет' : 'Пока нет данных'}
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}
