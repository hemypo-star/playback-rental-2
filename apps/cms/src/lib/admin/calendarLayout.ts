import type { AdminCalendarItem, AdminCalendarProduct } from './data/calendar'
import type { OrderStatus } from './format'

// D4 (calendar consolidation): the layout logic both admin calendar UIs
// (`(admin)/admin/calendar/page.tsx` — Tailwind — and
// `components/admin/CalendarView.tsx` — Payload's own /cms admin) used to
// duplicate inline, with the same two real bugs in both copies: bars that
// overlap in time rendered stacked directly on top of each other (hiding
// whichever one happened to render last — usually the pending booking an
// operator most needs to see), and nothing ever compared booked quantity
// against a product's actual stock. Written once, here, with no React/
// Payload/Next import — plain functions over already-fetched data, so it's
// trivial to unit-test later and impossible for the two UIs to drift again.
const DAY_MS = 86400000

function isoStartOfDayMs(iso: string): number {
  const d = new Date(iso)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export interface CalendarBar {
  id: number
  orderId: number
  orderStatus: OrderStatus | null
  quantity: number
  /** Day index (0-based) within the window where this bar starts. */
  startOffset: number
  /** Number of days (>=1) this bar spans, clipped to the window. */
  span: number
  /** Lane (0-based, top-to-bottom) assigned to avoid visually overlapping another bar in the same row. */
  lane: number
}

export interface CalendarRow {
  /** Number of lanes this row needs — the row's rendered height is laneCount * (barHeight + gap). */
  laneCount: number
  bars: CalendarBar[]
  /** Day indexes (0-based, into the same `days` window) where booked quantity exceeds the product's stock. */
  deficitDayIndexes: number[]
}

interface ClippedItem {
  item: AdminCalendarItem
  startOffset: number
  span: number
}

/**
 * Clips an item's [startDate, endDate] range to the visible window and
 * expresses it as a day-offset/span pair — the same clipping math both
 * original implementations had (correct, just duplicated): day-granularity,
 * inclusive end date. Returns null if the item doesn't actually fall inside
 * the window (shouldn't happen given the query both callers already scope
 * items to, but this module makes no assumption about its caller).
 */
function clipToWindow(item: AdminCalendarItem, windowStartMs: number, windowEndExclusiveMs: number): ClippedItem | null {
  const itemStartMs = isoStartOfDayMs(item.startDate)
  const itemEndMs = isoStartOfDayMs(item.endDate)
  const clippedStartMs = Math.max(itemStartMs, windowStartMs)
  const clippedEndMs = Math.min(itemEndMs, windowEndExclusiveMs - DAY_MS)
  if (clippedEndMs < clippedStartMs) return null

  const startOffset = Math.round((clippedStartMs - windowStartMs) / DAY_MS)
  const span = Math.max(1, Math.round((clippedEndMs - clippedStartMs) / DAY_MS) + 1)
  return { item, startOffset, span }
}

/**
 * Greedy interval partitioning ("minimum number of tracks to avoid
 * overlap"): sort items by start offset ascending, ties broken by longer
 * span first, then assign each item to the lowest-numbered lane whose
 * most-recently-placed item ends strictly before this item starts — open a
 * new lane when no existing lane qualifies. This is the standard optimal
 * algorithm for the problem (never uses more lanes than the true maximum
 * simultaneous overlap at any single day), which is the actual fix for bars
 * silently stacking on top of each other.
 */
function assignLanes(clipped: ClippedItem[]): number[] {
  const order = clipped.map((_, index) => index).sort((a, b) => {
    const byStart = clipped[a].startOffset - clipped[b].startOffset
    if (byStart !== 0) return byStart
    return clipped[b].span - clipped[a].span // longer span first on ties
  })

  const laneLastEnd: number[] = [] // lane index -> last-placed item's inclusive end offset
  const lanes: number[] = new Array(clipped.length)

  for (const index of order) {
    const { startOffset, span } = clipped[index]
    const end = startOffset + span - 1
    let lane = laneLastEnd.findIndex((lastEnd) => lastEnd < startOffset)
    if (lane === -1) {
      lane = laneLastEnd.length
      laneLastEnd.push(end)
    } else {
      laneLastEnd[lane] = end
    }
    lanes[index] = lane
  }

  return lanes
}

interface SweepEvent {
  timeMs: number
  delta: number
}

/**
 * True concurrently-booked quantity vs. the product's total stock, via a
 * sweep line over each item's real (untruncated) start/end timestamps —
 * NOT a per-day sum of which bars visually touch that day. A day-bucket sum
 * (checking whether each item merely overlaps a given calendar day) looked
 * right but double-counts a same-day handover: an item ending the morning of
 * day N and a different item starting that same afternoon each individually
 * "touch" day N, so a naive per-day sum flags day N as over capacity even
 * though the two bookings never coexist. The system's own availability check
 * (OrderItems' beforeValidate hook, mirrored in lib/rental/availability.ts:
 * `startDate.less_than(endDate) && endDate.greater_than(startDate)`) already
 * approves exactly this pairing — the deficit indicator must agree with it.
 *
 * The sweep: +quantity at each item's start, -quantity at its end, sorted by
 * time with end-events ordered before start-events at an identical instant
 * (so a same-instant handover never produces a spurious momentary "both
 * here" peak). Any point where the running total exceeds `productQuantity`
 * is a real deficit interval; the calendar days that interval overlaps are
 * flagged. The bars' own rendered spans stay day-truncated/inclusive
 * (correct — a day-column Gantt has no finer resolution to draw), so a
 * same-day handover still renders in separate lanes; only this calculation,
 * which has no such rendering excuse, needs the real timestamps.
 */
function computeDeficitDayIndexes(clipped: ClippedItem[], windowStartMs: number, dayCount: number, productQuantity: number): number[] {
  if (clipped.length === 0) return []

  const events: SweepEvent[] = []
  for (const { item } of clipped) {
    events.push({ timeMs: new Date(item.startDate).getTime(), delta: item.quantity })
    events.push({ timeMs: new Date(item.endDate).getTime(), delta: -item.quantity })
  }
  events.sort((a, b) => a.timeMs - b.timeMs || a.delta - b.delta)

  const deficitDayIndexes = new Set<number>()
  let running = 0
  for (let i = 0; i < events.length; i++) {
    running += events[i].delta
    if (running > productQuantity) {
      const intervalStartMs = events[i].timeMs
      const intervalEndMs = i + 1 < events.length ? events[i + 1].timeMs : intervalStartMs
      const fromDay = Math.max(0, Math.floor((intervalStartMs - windowStartMs) / DAY_MS))
      const toDay = Math.min(dayCount - 1, Math.ceil((intervalEndMs - windowStartMs) / DAY_MS) - 1)
      for (let day = fromDay; day <= toDay; day++) deficitDayIndexes.add(day)
    }
  }
  return Array.from(deficitDayIndexes).sort((a, b) => a - b)
}

/**
 * The single function both calendar UIs call. `days` is the same
 * `getAdminCalendar()` window (ISO day strings, already clamped/offset) —
 * its length is the window's day count, and `days[0]` anchors item dates to
 * day offsets.
 */
export function computeCalendarRow(product: AdminCalendarProduct, days: string[]): CalendarRow {
  const dayCount = days.length
  if (dayCount === 0) return { laneCount: 0, bars: [], deficitDayIndexes: [] }

  const windowStartMs = isoStartOfDayMs(days[0])
  const windowEndExclusiveMs = isoStartOfDayMs(days[dayCount - 1]) + DAY_MS

  const clipped = product.items
    .map((item) => clipToWindow(item, windowStartMs, windowEndExclusiveMs))
    .filter((c): c is ClippedItem => c !== null)

  const lanes = assignLanes(clipped)
  const laneCount = lanes.length ? Math.max(...lanes) + 1 : 0

  const bars: CalendarBar[] = clipped.map(({ item, startOffset, span }, index) => ({
    id: item.id,
    orderId: item.orderId,
    orderStatus: item.orderStatus,
    quantity: item.quantity,
    startOffset,
    span,
    lane: lanes[index],
  }))

  const deficitDayIndexes = computeDeficitDayIndexes(clipped, windowStartMs, dayCount, product.quantity)

  return { laneCount, bars, deficitDayIndexes }
}
