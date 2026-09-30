import React from 'react'
import Link from 'next/link'
import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'
import { getAdminCalendar } from '../../lib/admin/data/calendar'
import CalendarGrid, { type CalendarGridTheme, type CalendarStatusTone } from './CalendarGrid'
import type { OrderStatus } from '../../lib/admin/format'

const DAYS_PER_PAGE = 14

// D4 (calendar consolidation): this view used to duplicate the entire
// data-fetch + lane/deficit-free bar layout that `(admin)/admin/calendar/
// page.tsx` (this app's own Tailwind /admin UI) also had — same bugs in
// both copies (overlapping bars silently stacked, no deficit indicator, no
// pagination). Now both call the same `getAdminCalendar()` (gained
// `offsetDays`) and render through the same `CalendarGrid` (lib/admin/
// calendarLayout.ts owns the lane/deficit math) — only the surrounding
// chrome below (header, legend, colors) stays specific to Payload's own
// /cms admin theme, matching its pre-existing visual language.
//
// Matches the delivered design's occupancy Gantt: confirmed bookings render
// as a solid bar ("Аренда"), pending ones as a hatched bar ("Бронь") — same
// visual grammar, backed by the real order status instead of invented data.
const STATUS_TONE: Record<OrderStatus, CalendarStatusTone> = {
  confirmed: { background: '#0A0A0A', color: '#fff', label: 'Подтверждён' },
  pending: {
    background: 'repeating-linear-gradient(45deg, rgba(10,10,10,0.5), rgba(10,10,10,0.5) 1px, #fff 1px, #fff 4px)',
    color: '#0A0A0A',
    label: 'Ожидает звонка',
  },
  completed: { background: 'var(--theme-elevation-400)', color: '#fff', label: 'Завершён' },
  cancelled: { background: 'var(--theme-elevation-200)', color: 'var(--theme-elevation-600)', label: 'Отменён' },
}

function toneByStatus(status: OrderStatus): CalendarStatusTone {
  return STATUS_TONE[status]
}

// Deficit tint reuses Payload's own shipped "error" theme tokens (already
// used elsewhere in Payload's admin UI, e.g. validation-error banners) —
// not a new color introduced for this screen, and it stays within Payload's
// own visual language rather than borrowing the Tailwind side's palette.
const THEME: CalendarGridTheme = {
  headerLabelColor: 'var(--theme-elevation-500)',
  rowLabelColor: 'var(--theme-elevation-800)',
  rowBorderColor: 'var(--theme-elevation-50)',
  emptyStateColor: 'var(--theme-elevation-400)',
  emptyStateText: 'Нет товаров в аренде',
  deficitBackground: 'var(--theme-error-100)',
  deficitBorderColor: 'var(--theme-error-600)',
  unknownStatusTone: { background: 'var(--theme-elevation-500)', color: '#fff', label: '—' },
  stickyLabelColumn: true,
  labelBackground: 'var(--theme-elevation-0)',
}

function parseOffset(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.trunc(n))
}

export const CalendarView = async (props: AdminViewServerProps) => {
  const { initPageResult, params, searchParams } = props
  const { req } = initPageResult

  const offset = parseOffset(searchParams?.offset)
  const { days, products } = await getAdminCalendar(offset)
  const rangeStart = new Date(days[0]).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
  const rangeEnd = new Date(days[days.length - 1]).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })

  return (
    <DefaultTemplate
      i18n={props.initPageResult.req.i18n}
      locale={props.initPageResult.locale}
      params={params}
      payload={req.payload}
      permissions={initPageResult.permissions}
      req={req}
      searchParams={searchParams}
      user={req.user ?? undefined}
      visibleEntities={initPageResult.visibleEntities}
    >
      <div style={{ padding: '2rem 2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 23, fontWeight: 700, letterSpacing: '-0.03em' }}>Календарь занятости</h1>
            <p style={{ margin: '0.2rem 0 0', fontSize: 13, color: 'var(--theme-elevation-500)' }}>
              {rangeStart} – {rangeEnd} — товары с активными бронированиями показаны первыми.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 12, color: 'var(--theme-elevation-500)' }}>
            {Object.entries(STATUS_TONE)
              .filter(([status]) => status === 'confirmed' || status === 'pending')
              .map(([status, tone]) => (
                <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 4, background: tone.background, border: '1px solid var(--theme-elevation-150)', display: 'inline-block' }} />
                  {tone.label}
                </div>
              ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: THEME.deficitBackground, border: `1px dashed ${THEME.deficitBorderColor}`, display: 'inline-block' }} />
              Перебронь
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontWeight: 600 }}>
              {offset > 0 ? (
                <Link href={`/cms/calendar?offset=${Math.max(0, offset - DAYS_PER_PAGE)}`} style={{ color: 'var(--theme-elevation-500)' }}>
                  ← Раньше
                </Link>
              ) : null}
              {offset > 0 ? (
                <Link href="/cms/calendar" style={{ color: 'var(--theme-elevation-500)' }}>
                  Сегодня
                </Link>
              ) : null}
              <Link href={`/cms/calendar?offset=${offset + DAYS_PER_PAGE}`} style={{ color: 'var(--theme-elevation-500)' }}>
                Позже →
              </Link>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20, border: '1px solid var(--theme-elevation-100)', borderRadius: 20, background: 'var(--theme-elevation-0)', padding: '1rem' }}>
          <CalendarGrid days={days} products={products} toneByStatus={toneByStatus} theme={THEME} labelColumnWidth={220} />
        </div>
      </div>
    </DefaultTemplate>
  )
}
