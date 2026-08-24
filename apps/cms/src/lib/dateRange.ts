// Duplicated from apps/web/src/lib/dateRange.ts (docs/PLAN-next-migration.md
// Stage 2) — apps/web keeps its own live copy until Stage 4 deletes that app
// entirely; keep both in sync until then. Framework-agnostic grid/selection
// math, originally ported from the old app's src/hooks/useDateRangeCalendar.ts.
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

export const BUSINESS_HOURS = { open: 9, close: 21 }

export function hourOptions(): { value: string; label: string }[] {
  const options = []
  for (let h = BUSINESS_HOURS.open; h <= BUSINESS_HOURS.close; h++) {
    options.push({ value: String(h), label: `${String(h).padStart(2, '0')}:00` })
  }
  return options
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
