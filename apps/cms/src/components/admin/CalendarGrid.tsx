import Link from 'next/link'
import { computeCalendarRow } from '../../lib/admin/calendarLayout'
import type { AdminCalendarProduct } from '../../lib/admin/data/calendar'
import type { OrderStatus } from '../../lib/admin/format'

// D4 (calendar consolidation): the shared Gantt grid both admin calendar
// screens now render through — `(admin)/admin/calendar/page.tsx` (this
// app's own Tailwind-themed /admin UI) and `CalendarView.tsx` (a custom
// view registered inside Payload's own, unrelated /cms admin theme). All
// layout math (lanes, deficit, day-offset clipping) lives in
// lib/admin/calendarLayout.ts — this component is purely presentational.
//
// It never hardcodes either app's palette: every color/token it needs comes
// in through `theme` as literal CSS values — a hex, an rgba()/color-mix(),
// or (on the Payload side) a `var(--theme-elevation-*)`/`var(--theme-error-*)`
// reference into Payload's own shipped theme. That's what lets one component
// render correctly inside both this app's Tailwind design system and
// Payload's completely different admin CSS without duplicating the buggy
// logic a plain copy-paste port would have re-introduced. Purely static
// visual flourishes each original screen had (the Tailwind page's row-hover
// tint and bar hover-scale) are opt-in via `rowClassName`/`barClassName`
// instead of being baked in here, so this component makes no assumption
// about Tailwind being available at all.
export interface CalendarStatusTone {
  background: string
  color: string
  label: string
}

export interface CalendarGridTheme {
  headerLabelColor: string
  rowLabelColor: string
  /** Border between rows. Omit for no border (matches the Tailwind page's original, borderless rows). */
  rowBorderColor?: string
  emptyStateColor: string
  emptyStateText: string
  /** Background tint painted behind bars on days where booked quantity exceeds stock. */
  deficitBackground: string
  deficitBorderColor: string
  /** Fallback tone for a bar whose order status is somehow missing — shouldn't happen (see lib/admin/data/calendar.ts), kept only as a safe fallback. */
  unknownStatusTone: CalendarStatusTone
  /** Keeps the label column visible while the grid scrolls horizontally — CalendarView.tsx's original table had this via `position: sticky`; the Tailwind page's original didn't. */
  stickyLabelColumn?: boolean
  /** Background painted behind a sticky label column so bars scrolling underneath don't show through. Required when stickyLabelColumn is true. */
  labelBackground?: string
}

export interface CalendarGridProps {
  /** ISO day strings for the visible window, from getAdminCalendar(). */
  days: string[]
  products: AdminCalendarProduct[]
  /** Resolves a bar's CSS-friendly color tone from its order status. */
  toneByStatus: (status: OrderStatus) => CalendarStatusTone
  theme: CalendarGridTheme
  /** Width of the product-label column, in px. */
  labelColumnWidth?: number
  /** Height of a single lane's bar, in px. */
  barHeight?: number
  /** Vertical gap between stacked lanes, in px. */
  laneGap?: number
  /** Extra className applied to each bar link (e.g. a Tailwind hover-scale transition). */
  barClassName?: string
  /** Extra className applied to each product row (e.g. a Tailwind hover background). */
  rowClassName?: string
}

export default function CalendarGrid({
  days,
  products,
  toneByStatus,
  theme,
  labelColumnWidth = 210,
  barHeight = 28,
  laneGap = 6,
  barClassName,
  rowClassName,
}: CalendarGridProps) {
  const dayCount = days.length
  const stickyLabelStyle = theme.stickyLabelColumn
    ? ({ position: 'sticky' as const, left: 0, background: theme.labelBackground, zIndex: 1 })
    : undefined

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 900 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `${labelColumnWidth}px 1fr`, gap: 14 }}>
          <div style={stickyLabelStyle} />
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${dayCount}, 1fr)`, gap: 3 }}>
            {days.map((day) => (
              <div key={day} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: theme.headerLabelColor }}>
                {new Date(day).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
              </div>
            ))}
          </div>
        </div>

        {products.map((product) => {
          const { laneCount, bars, deficitDayIndexes } = computeCalendarRow(product, days)
          const lanes = Math.max(1, laneCount)
          const rowHeight = lanes * barHeight + (lanes - 1) * laneGap

          return (
            <div
              key={product.id}
              className={rowClassName}
              style={{
                display: 'grid',
                gridTemplateColumns: `${labelColumnWidth}px 1fr`,
                gap: 14,
                alignItems: 'center',
                padding: '12px 0',
                borderTop: theme.rowBorderColor ? `1px solid ${theme.rowBorderColor}` : undefined,
              }}
            >
              <div style={{ minWidth: 0, ...stickyLabelStyle }}>
                <div
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    color: theme.rowLabelColor,
                  }}
                >
                  {product.title}
                </div>
              </div>

              <div style={{ position: 'relative', height: rowHeight }}>
                {deficitDayIndexes.map((dayIndex) => (
                  <div
                    key={dayIndex}
                    aria-hidden
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: `${(dayIndex / dayCount) * 100}%`,
                      width: `${(1 / dayCount) * 100}%`,
                      background: theme.deficitBackground,
                      borderTop: `1px dashed ${theme.deficitBorderColor}`,
                      borderBottom: `1px dashed ${theme.deficitBorderColor}`,
                      pointerEvents: 'none',
                    }}
                  />
                ))}

                {bars.map((bar) => {
                  const tone = bar.orderStatus ? toneByStatus(bar.orderStatus) : theme.unknownStatusTone
                  return (
                    <Link
                      key={bar.id}
                      href={`/admin/orders/${bar.orderId}`}
                      title={`${bar.quantity} шт. — заказ #${bar.orderId} · ${tone.label}`}
                      className={barClassName}
                      style={{
                        position: 'absolute',
                        left: `${(bar.startOffset / dayCount) * 100}%`,
                        width: `${(bar.span / dayCount) * 100}%`,
                        top: bar.lane * (barHeight + laneGap),
                        height: barHeight,
                        display: 'flex',
                        alignItems: 'center',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        padding: '0 8px',
                        borderRadius: 9,
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: 'none',
                        background: tone.background,
                        color: tone.color,
                      }}
                    >
                      ×{bar.quantity}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}

        {products.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', fontSize: 13.5, color: theme.emptyStateColor }}>
            {theme.emptyStateText}
          </div>
        ) : null}
      </div>
    </div>
  )
}
