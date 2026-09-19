import type { Metadata } from 'next'
import { Fragment } from 'react'
import Link from 'next/link'
import AdminPageHeader from '../../../../components/admin/AdminPageHeader'
import AdminKpiCards from '../../../../components/admin/AdminKpiCards'
import AdminMobileCard from '../../../../components/admin/AdminMobileCard'
import { getAdminKpi } from '../../../../lib/admin/data/kpi'
import { getAdminOrders } from '../../../../lib/admin/data/orders'
import { rub, formatDate, ORDER_STATUS_TONE, type OrderStatus } from '../../../../lib/admin/format'
import { pluralizeRu } from '../../../../lib/dateRange'

// Ported from apps/web/src/pages/admin/orders.astro (docs/PLAN-next-
// migration.md Stage 3.5, page group 3 — "самая сложная", most complex).
// D5 (search/filters) added the GET form below — a plain form + searchParams
// round trip, matching CatalogPage.tsx's own search-form pattern, not a
// client island: the page is already force-dynamic, so there's no benefit
// to debounced/client-side filtering for an internal admin list.
export const metadata: Metadata = { title: 'Очередь заявок' }
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>
}

function isOrderStatus(value: string): value is OrderStatus {
  return value in ORDER_STATUS_TONE
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { status: statusParam, q: qParam, page: pageParam } = await searchParams
  const status = statusParam && isOrderStatus(statusParam) ? statusParam : undefined
  const q = qParam?.trim() || undefined
  const page = Math.max(1, Number(pageParam) || 1)
  const hasFilters = Boolean(status || q)

  const [kpi, result] = await Promise.all([getAdminKpi(), getAdminOrders({ status, q, page })])

  // Build pagination href, preserving active filters
  const buildPageHref = (pageNum: number) => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (q) params.set('q', q)
    params.set('page', pageNum.toString())
    return `/admin/orders?${params.toString()}`
  }

  return (
    <>
      <AdminPageHeader
        title="Очередь заявок"
        // totalDocs, not docs.length: with paging the latter is just this
        // page's row count, so page 2 of 3 would claim "50 заказов" as if
        // that were the whole result. pluralizeRu because 1/2/5 take three
        // different forms — the same helper the catalog and homepage use.
        subtitle={`${result.totalDocs} ${pluralizeRu(result.totalDocs, 'заказ', 'заказа', 'заказов')}${hasFilters ? ' по фильтру' : ''}`}
        actionLabel="Новый заказ"
        actionHref="/admin/orders/new"
      />
      <AdminKpiCards kpi={kpi} />

      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="hidden grid-cols-[90px_1.6fr_1.4fr_1fr_110px_130px] gap-3.5 px-2.5 pb-3 text-[10px] font-semibold tracking-[0.13em] text-subtle uppercase lg:grid">
          <span>Номер</span><span>Клиент</span><span>Позиции</span><span>Даты</span><span>Сумма</span><span>Статус</span>
        </div>
        <div className="flex flex-col gap-2.5 lg:contents">
          {result.docs.map((o, i) => {
            const tone = ORDER_STATUS_TONE[o.status]
            const [start, end] = o.dates ? o.dates.split('|') : [null, null]
            const dates = start && end ? `${formatDate(start)} – ${formatDate(end)}` : '—'
            const badge = (
              <span
                className="justify-self-start rounded-full px-3 py-1.5 text-[10px] font-semibold tracking-[0.1em] uppercase"
                style={{ background: tone.bg, color: tone.color }}
              >
                {tone.label}
              </span>
            )
            return (
              <Fragment key={o.id}>
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="hidden grid-cols-[90px_1.6fr_1.4fr_1fr_110px_130px] items-center gap-3.5 rounded-2xl px-2.5 py-3.5 text-[13.5px] transition-colors duration-240 ease-expo hover:bg-muted lg:grid"
                  style={{ animation: 'bnIn 560ms var(--ease-expo) both', animationDelay: `${Math.min(i * 55, 400)}ms` }}
                >
                  <span className="font-semibold">#{o.id}</span>
                  <span className="truncate">{o.customerName}</span>
                  <span className="truncate text-[12.5px] text-subtle">{o.itemsSummary}</span>
                  <span className="text-[12.5px] text-subtle">{dates}</span>
                  <span className="font-semibold">{rub(o.totalPrice)}</span>
                  {badge}
                </Link>
                <AdminMobileCard
                  href={`/admin/orders/${o.id}`}
                  title={`#${o.id} · ${o.customerName}`}
                  badge={badge}
                  fields={[
                    { label: 'Позиции', value: o.itemsSummary },
                    { label: 'Даты', value: dates },
                    { label: 'Сумма', value: rub(o.totalPrice) },
                  ]}
                />
              </Fragment>
            )
          })}
        </div>
        {result.docs.length === 0 ? (
          <div className="px-2.5 py-8 text-center text-[13.5px] text-subtle">
            {hasFilters ? 'По этому фильтру ничего не найдено' : 'Заказов пока нет'}
          </div>
        ) : null}

        {result.totalPages > 1 ? (
          <div className="mt-6 flex items-center justify-center gap-3">
            {page > 1 ? (
              <Link href={buildPageHref(page - 1)} className="text-[12.5px] font-semibold text-subtle hover:text-foreground">
                ← Раньше
              </Link>
            ) : null}
            <span className="text-[12.5px] text-subtle">
              {page} / {result.totalPages}
            </span>
            {page < result.totalPages ? (
              <Link href={buildPageHref(page + 1)} className="text-[12.5px] font-semibold text-subtle hover:text-foreground">
                Позже →
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  )
}
