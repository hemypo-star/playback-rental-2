import type { Metadata } from 'next'
import Link from 'next/link'
import AdminPageHeader from '../../../../components/admin/AdminPageHeader'
import CalendarGrid, { type CalendarGridTheme, type CalendarStatusTone } from '../../../../components/admin/CalendarGrid'
import { getAdminCalendar } from '../../../../lib/admin/data/calendar'
import { ORDER_STATUS_TONE, STOCK_STATUS_TONE, type OrderStatus } from '../../../../lib/admin/format'

// Ported from apps/web/src/pages/admin/calendar.astro (docs/PLAN-next-
// migration.md Stage 3.5, page group 4). D4 (calendar consolidation): now
// paginated (?offset=N, 14-day pages) and renders through the shared
// CalendarGrid (lib/admin/calendarLayout.ts owns the lane/deficit math) —
// see CalendarView.tsx for the same rewrite on the /cms side.
export const metadata: Metadata = { title: 'Календарь аренд' }
export const dynamic = 'force-dynamic'

const DAYS_PER_PAGE = 14

// Bars only render for confirmed/pending order statuses — those are the
// only two an item can have (see lib/admin/data/calendar.ts, which only
// ever queries ACTIVE_STATUSES = ['pending', 'confirmed']).
const LEGEND: { status: OrderStatus; label: string }[] = [
  { status: 'confirmed', label: 'Аренда' },
  { status: 'pending', label: 'Бронь' },
]

function toneByStatus(status: OrderStatus): CalendarStatusTone {
  const tone = ORDER_STATUS_TONE[status]
  return { background: tone.bg, color: tone.color, label: tone.label }
}

// Deficit tint reuses the app's existing "out of stock" tone (format.ts) —
// same shortage semantics as StockStatusCell elsewhere in this admin, not a
// new color invented for this screen.
const THEME: CalendarGridTheme = {
  headerLabelColor: 'var(--color-subtle)',
  rowLabelColor: 'var(--color-foreground)',
  emptyStateColor: 'var(--color-subtle)',
  emptyStateText: 'Нет товаров в аренде',
  deficitBackground: STOCK_STATUS_TONE.out.bg,
  deficitBorderColor: STOCK_STATUS_TONE.out.color,
  unknownStatusTone: { background: '#F0F0F3', color: '#6E6E73', label: '—' },
}

interface Props {
  searchParams: Promise<{ offset?: string }>
}

function parseOffset(raw: string | undefined): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.trunc(n))
}

export default async function AdminCalendarPage({ searchParams }: Props) {
  const { offset: offsetParam } = await searchParams
  const offset = parseOffset(offsetParam)
  const { days, products } = await getAdminCalendar(offset)

  const rangeStart = new Date(days[0]).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
  const rangeEnd = new Date(days[days.length - 1]).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })

  return (
    <>
      <AdminPageHeader title="Календарь аренд" subtitle={`Занятость парка: ${rangeStart} – ${rangeEnd}`} />

      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
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
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded" style={{ background: STOCK_STATUS_TONE.out.bg, border: `1px dashed ${STOCK_STATUS_TONE.out.color}` }} />
              Перебронь
            </span>
          </div>

          <div className="flex items-center gap-3 text-[12.5px] font-semibold text-subtle">
            {offset > 0 ? (
              <Link href={`/admin/calendar?offset=${Math.max(0, offset - DAYS_PER_PAGE)}`} className="transition-colors duration-240 ease-expo hover:text-foreground">
                ← Раньше
              </Link>
            ) : null}
            {offset > 0 ? (
              <Link href="/admin/calendar" className="transition-colors duration-240 ease-expo hover:text-foreground">
                Сегодня
              </Link>
            ) : null}
            <Link href={`/admin/calendar?offset=${offset + DAYS_PER_PAGE}`} className="transition-colors duration-240 ease-expo hover:text-foreground">
              Позже →
            </Link>
          </div>
        </div>

        <div className="mt-5">
          <CalendarGrid
            days={days}
            products={products}
            toneByStatus={toneByStatus}
            theme={THEME}
            rowClassName="rounded-2xl transition-colors duration-240 ease-expo hover:bg-muted"
            barClassName="transition-transform duration-320 ease-overshoot hover:scale-y-[1.16]"
          />
        </div>
      </div>
    </>
  )
}
