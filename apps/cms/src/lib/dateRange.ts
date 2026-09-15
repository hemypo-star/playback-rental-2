// Framework-agnostic grid/selection math, originally ported from the old
// app's src/hooks/useDateRangeCalendar.ts, then from apps/web/src/lib/
// dateRange.ts (docs/PLAN-next-migration.md Stage 2; apps/web itself was
// deleted on 2026-08-21).
//
// Nothing here counts days for money — `lib/rental/pricing.ts` is the single
// source of truth for that (see its JSDoc for the calendar-days-inclusive
// convention). `isInSelection` is inclusive of both endpoints via
// `isWithinInterval`, which does agree with that convention, but note it has
// no callers: `RentalDatePicker` renders its highlight from its own inline
// exclusive comparison plus separate `isFrom`/`isTo` boundary styling, so
// changing this function will not move what the calendar shows.
import { addMonths, isBefore, isSameDay, isWithinInterval, format } from 'date-fns'
import { ru } from 'date-fns/locale'

export interface DateSelection {
  from: Date | null
  to: Date | null
}

export function buildDaysGrid(monthDate: Date): (Date | null)[] {
  const month = monthDate.getMonth()
  const year = monthDate.getFullYear()
  const firstOfMonth = new Date(year, month, 1)
  const lastOfMonth = new Date(year, month + 1, 0)
  let firstJs = firstOfMonth.getDay()
  firstJs = firstJs === 0 ? 7 : firstJs
  const grid: (Date | null)[] = []
  for (let i = 1; i < firstJs; i++) grid.push(null)
  for (let day = 1; day <= lastOfMonth.getDate(); day++) grid.push(new Date(year, month, day))
  return grid
}

export function nextMonth(month: Date): Date {
  return addMonths(month, 1)
}

export function prevMonth(month: Date): Date {
  return addMonths(month, -1)
}

export function pickDate(selection: DateSelection, date: Date): DateSelection {
  if (!selection.from || (selection.from && selection.to)) return { from: date, to: null }
  if (isSameDay(date, selection.from)) return { from: null, to: null }
  if (isBefore(date, selection.from)) return { from: date, to: selection.from }
  return { from: selection.from, to: date }
}

export function isInSelection(date: Date, selection: DateSelection): boolean {
  if (!selection.from || !selection.to) return false
  return isWithinInterval(date, { start: selection.from, end: selection.to })
}

export function withTime(date: Date | null, hour: string): Date | null {
  if (!date) return null
  const d = new Date(date)
  d.setHours(parseInt(hour, 10), 0, 0, 0)
  return d
}

// B4 (design_handoff_swiss_bento/08-instruction.md, audit N5) — this used to
// be a hardcoded `BUSINESS_HOURS = { open: 9, close: 21 }` constant here,
// disagreeing with a separate hardcoded "Рабочие часы 10:00 — 21:00." string
// in RentalDatePicker.tsx's JSX (09:00 was offered in the grid; the caption
// under the same grid claimed the business was closed until 10:00). Both
// numbers now come from SiteSettings (`businessHoursOpen`/
// `businessHoursClose`, apps/cms/src/globals/SiteSettings.ts) via
// components/BusinessHoursContext.tsx, so the grid and the caption can no
// longer drift from each other — see that file for how the value reaches
// this client component tree. DEFAULT_BUSINESS_HOURS is only the context's
// fallback for the (practically unreachable, since the field has a
// `defaultValue`) case where SiteSettings has no value yet; it intentionally
// matches that `defaultValue`, not the old, wrong `9`.
export const DEFAULT_BUSINESS_HOURS = { open: 10, close: 21 }

export function hourOptions(open: number, close: number): { value: string; label: string }[] {
  const options = []
  for (let h = open; h <= close; h++) {
    options.push({ value: String(h), label: `${String(h).padStart(2, '0')}:00` })
  }
  return options
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

// "10:00—21:00" — Navbar's own always-visible label (a third hardcoded
// "10:00—21:00" found while fixing N5's original pair, in RentalDatePicker's
// grid/caption). Bare em-dash, no spaces, matching Navbar's existing markup.
export function formatBusinessHoursRange(open: number, close: number): string {
  return `${formatHour(open)}—${formatHour(close)}`
}

// Builds the exact caption RentalDatePicker renders under the time grid, from
// the same two numbers hourOptions() just built the grid from — the N5 fix
// is specifically that these can no longer be a separately-typed JSX string.
// Its "HH:MM — HH:MM" spacing differs from formatBusinessHoursRange's bare
// "HH:MM—HH:MM" (Navbar's copy), so this builds its own string from
// formatHour rather than reformatting that one — both still derive from the
// same two open/close numbers, which is the actual N5 fix.
export function formatBusinessHoursCaption(open: number, close: number): string {
  return `Рабочие часы ${formatHour(open)} — ${formatHour(close)}.`
}

export function formatDayLabel(date: Date): string {
  return format(date, 'd')
}

export function formatDateShort(date: Date): string {
  return format(date, 'dd.MM')
}

export function formatDateHuman(date: Date): string {
  return format(date, 'd MMM', { locale: ru })
}

export function formatMonthYear(date: Date): string {
  return format(date, 'LLLL yyyy', { locale: ru })
}

export const WEEKDAY_LABELS_RU = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

// Ru plural rules (1 смена / 2 смены / 5 смен) — ported from the design
// reference's `plural()` helper, generalized for reuse.
export function pluralizeRu(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

export function formatShifts(days: number): string {
  return `${days} ${pluralizeRu(days, 'смена', 'смены', 'смен')}`
}
