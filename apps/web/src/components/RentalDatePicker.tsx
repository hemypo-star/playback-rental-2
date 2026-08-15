import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '@nanostores/react'
import {
  buildDaysGrid,
  formatDayLabel,
  formatDateShort,
  formatMonthYear,
  hourOptions,
  nextMonth,
  prevMonth,
  withTime,
  formatShifts,
  WEEKDAY_LABELS_RU,
} from '../lib/dateRange'
import { calculateRentalDays } from '../lib/pricing'
import { $selectedDates, setSelectedDates } from '../stores/dates'

const HOURS = hourOptions()

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function isSameDayLocal(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

interface BookedRange {
  startDate: string
  endDate: string
  quantity: number
}

interface Props {
  /** compact: single trigger pill (catalog header). boxes: side-by-side Выдача/Возврат boxes (product/cart). hero: inline dual-field pill with its own CTA (homepage). navbar: black round pill in the sticky header. */
  variant?: 'compact' | 'boxes' | 'hero' | 'navbar'
  onApply?: () => void
  /** When known (product detail page), used to grey out fully-booked days in the calendar. */
  bookedRanges?: BookedRange[]
  totalQuantity?: number
}

export default function RentalDatePicker({ variant = 'boxes', onApply, bookedRanges, totalQuantity }: Props) {
  const storeDates = useStore($selectedDates)
  // $selectedDates is sessionStorage-backed, so it can legitimately differ
  // between the server render and the client's first (hydration) render.
  // Only trust it for display once mounted — a normal post-hydration state
  // update, not a hydration-time value — so React never flags a mismatch.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const dates = mounted ? storeDates : { startDate: null, endDate: null }
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => startOfMonth(dates.startDate ?? new Date()))
  const [activeTab, setActiveTab] = useState<'from' | 'to'>('from')
  const [draftFrom, setDraftFrom] = useState<Date | null>(dates.startDate)
  const [draftTo, setDraftTo] = useState<Date | null>(dates.endDate)
  const [startHour, setStartHour] = useState(dates.startDate ? String(dates.startDate.getHours()) : '10')
  const [endHour, setEndHour] = useState(dates.endDate ? String(dates.endDate.getHours()) : '10')

  const openPicker = (tab: 'from' | 'to' = 'from') => {
    setDraftFrom(dates.startDate)
    setDraftTo(dates.endDate)
    setStartHour(dates.startDate ? String(dates.startDate.getHours()) : '10')
    setEndHour(dates.endDate ? String(dates.endDate.getHours()) : '10')
    setActiveTab(tab)
    setMonth(startOfMonth(dates.startDate ?? new Date()))
    setOpen(true)
  }

  const pickDay = (day: Date) => {
    if (activeTab === 'from') {
      const from = day
      const to = draftTo && draftTo > from ? draftTo : new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1)
      setDraftFrom(from)
      setDraftTo(to)
    } else {
      const to = draftFrom && day > draftFrom ? day : new Date((draftFrom ?? day).getFullYear(), (draftFrom ?? day).getMonth(), (draftFrom ?? day).getDate() + 1)
      setDraftTo(to)
    }
  }

  const apply = () => {
    if (!draftFrom || !draftTo) {
      setOpen(false)
      return
    }
    setSelectedDates(withTime(draftFrom, startHour)!, withTime(draftTo, endHour)!)
    setOpen(false)
    onApply?.()
  }

  const grid = buildDaysGrid(month)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const isFullyBooked = (day: Date): boolean => {
    if (!bookedRanges || !totalQuantity) return false
    const dayStart = day.getTime()
    const dayEnd = dayStart + 24 * 60 * 60 * 1000
    const booked = bookedRanges
      .filter((r) => new Date(r.startDate).getTime() < dayEnd && new Date(r.endDate).getTime() > dayStart)
      .reduce((sum, r) => sum + r.quantity, 0)
    return booked >= totalQuantity
  }

  const fromLabel = dates.startDate ? formatDateShort(dates.startDate) : 'Выберите'
  const toLabel = dates.endDate ? formatDateShort(dates.endDate) : 'Выберите'
  const fromTime = dates.startDate ? `${String(dates.startDate.getHours()).padStart(2, '0')}:00` : ''
  const toTime = dates.endDate ? `${String(dates.endDate.getHours()).padStart(2, '0')}:00` : ''

  const draftFromLabel = draftFrom ? formatDateShort(draftFrom) : 'Выберите'
  const draftToLabel = draftTo ? formatDateShort(draftTo) : 'Выберите'
  const days = calculateRentalDays(draftFrom ?? undefined, draftTo ?? undefined) || 1

  return (
    <>
      {variant === 'navbar' && (
        <button
          type="button"
          onClick={() => openPicker('from')}
          className="flex h-[38px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-muted px-[15px] text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors duration-200 hover:bg-primary hover:text-primary-foreground"
        >
          <span>{dates.startDate && dates.endDate ? `${fromLabel} — ${toLabel}` : 'Выбрать даты'}</span>
        </button>
      )}

      {variant === 'compact' && (
        <button
          type="button"
          onClick={() => openPicker('from')}
          className="rounded-xl px-3.5 py-2 text-left transition-colors duration-200 hover:bg-primary hover:text-primary-foreground"
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.06em] opacity-60">Даты и время</div>
          <div className="mt-0.5 whitespace-nowrap text-[13.5px] font-semibold tracking-[-0.015em]">
            {dates.startDate && dates.endDate ? `${fromLabel} — ${toLabel}, ${fromTime}` : 'Выбрать даты аренды'}
          </div>
        </button>
      )}

      {variant === 'hero' && (
        <div className="inline-flex items-center gap-1.5 rounded-[18px] bg-muted p-2">
          <button
            type="button"
            onClick={() => openPicker('from')}
            className="rounded-xl px-3.5 py-2 text-left transition-colors duration-200 hover:bg-white"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.02em] text-subtle">Забрать</div>
            <div className="mt-0.5 whitespace-nowrap text-[14.5px] font-semibold tracking-[-0.015em]">
              {fromLabel}{fromTime && `, ${fromTime}`}
            </div>
          </button>
          <div className="h-[34px] w-px bg-border" />
          <button
            type="button"
            onClick={() => openPicker('to')}
            className="rounded-xl px-3.5 py-2 text-left transition-colors duration-200 hover:bg-white"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.02em] text-subtle">Вернуть</div>
            <div className="mt-0.5 whitespace-nowrap text-[14.5px] font-semibold tracking-[-0.015em]">
              {toLabel}{toTime && `, ${toTime}`}
            </div>
          </button>
          <a href="/catalog" className="btn-primary ml-1 h-[50px] px-6 text-[11.5px]">
            Показать свободное
          </a>
        </div>
      )}

      {variant === 'boxes' && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => openPicker('from')}
            className="rounded-2xl bg-muted p-3.5 text-left transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-[#EAE8E4]"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-subtle">Выдача</div>
            <div className="mt-1.5 whitespace-nowrap text-[14px] font-semibold tracking-[-0.018em]">{fromLabel}{fromTime && ` · ${fromTime}`}</div>
          </button>
          <button
            type="button"
            onClick={() => openPicker('to')}
            className="rounded-2xl bg-muted p-3.5 text-left transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-[#EAE8E4]"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-subtle">Возврат</div>
            <div className="mt-1.5 whitespace-nowrap text-[14px] font-semibold tracking-[-0.018em]">{toLabel}{toTime && ` · ${toTime}`}</div>
          </button>
        </div>
      )}

      {open && createPortal(
        // Portalled to <body> — the navbar's backdrop-blur establishes a new
        // containing block for `position: fixed` descendants, which would
        // otherwise confine this overlay to the navbar's own box instead of
        // the viewport.
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-5" style={{ animation: 'bnFade 240ms ease both' }}>
          <div className="absolute inset-0 bg-[rgba(10,10,10,0.42)] backdrop-blur-[6px]" onClick={() => setOpen(false)} />
          <div
            className="relative max-h-[90vh] w-full max-w-[780px] overflow-y-auto rounded-[26px] bg-card shadow-[var(--shadow-lifted)]"
            style={{ animation: 'bnIn 560ms cubic-bezier(0.16,1,0.3,1) both' }}
          >
            <div className="flex items-start justify-between gap-4 p-6 pb-0">
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Период аренды</div>
                <div className="mt-1.5 text-[22px] font-medium tracking-[-0.03em]">
                  {activeTab === 'to' ? 'День и время возврата' : 'День и время выдачи'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-muted text-[14px] transition-[background-color,color,transform] duration-200 hover:rotate-90 hover:bg-primary hover:text-primary-foreground"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 px-6 pt-4.5">
              <button
                type="button"
                onClick={() => setActiveTab('from')}
                className={`rounded-2xl p-3.5 text-left transition-colors duration-200 ${activeTab === 'from' ? 'bg-primary text-primary-foreground' : 'bg-transparent hover:bg-muted'}`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.13em] opacity-60">Выдача</div>
                <div className="mt-1.5 text-[16px] font-medium">{draftFromLabel} · {String(startHour).padStart(2, '0')}:00</div>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('to')}
                className={`rounded-2xl p-3.5 text-left transition-colors duration-200 ${activeTab === 'to' ? 'bg-primary text-primary-foreground' : 'bg-transparent hover:bg-muted'}`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.13em] opacity-60">Возврат</div>
                <div className="mt-1.5 text-[16px] font-medium">{draftToLabel} · {String(endHour).padStart(2, '0')}:00</div>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4.5 px-6 pt-4.5 sm:grid-cols-[1.25fr_1fr]">
              <div>
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setMonth((m) => prevMonth(m))} className="flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 hover:bg-muted" aria-label="Предыдущий месяц">←</button>
                  <div className="flex items-center gap-3.5">
                    <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle capitalize">{formatMonthYear(month)}</div>
                    {bookedRanges && (
                      <div className="hidden items-center gap-3 text-[10.5px] uppercase tracking-[0.06em] text-subtle sm:flex">
                        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-primary" />выбрано</span>
                        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[rgba(214,36,16,0.14)]" />занято</span>
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => setMonth((m) => nextMonth(m))} className="flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 hover:bg-muted" aria-label="Следующий месяц">→</button>
                </div>
                <div className="mt-3 grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold text-subtle">
                  {WEEKDAY_LABELS_RU.map((d) => (
                    <div key={d}>{d.toUpperCase()}</div>
                  ))}
                </div>
                <div className="mt-1.5 grid grid-cols-7 gap-1.5">
                  {grid.map((date, i) => {
                    if (!date) return <div key={i} />
                    const past = date < today
                    const busy = !past && isFullyBooked(date)
                    const disabled = past || busy
                    const isFrom = draftFrom && isSameDayLocal(date, draftFrom)
                    const isTo = draftTo && isSameDayLocal(date, draftTo)
                    const inRange = draftFrom && draftTo && date > draftFrom && date < draftTo
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={disabled}
                        onClick={() => pickDay(date)}
                        className={[
                          'flex aspect-square items-center justify-center rounded-xl text-[13px] transition-[background-color,color,transform] duration-200',
                          disabled && !busy && 'pointer-events-none opacity-30',
                          busy && 'pointer-events-none bg-[rgba(214,36,16,0.12)] text-accent line-through',
                          !busy && (isFrom || isTo) && 'scale-[1.04] bg-primary font-semibold text-primary-foreground',
                          !busy && inRange && !isFrom && !isTo && 'bg-[#E2E0DB] font-medium text-foreground',
                          !busy && !isFrom && !isTo && !inRange && 'bg-muted text-foreground',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {formatDayLabel(date)}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">
                  {activeTab === 'to' ? 'Время возврата' : 'Время выдачи'}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-[7px]">
                  {HOURS.map((h) => {
                    const active = activeTab === 'to' ? endHour === h.value : startHour === h.value
                    return (
                      <button
                        key={h.value}
                        type="button"
                        onClick={() => (activeTab === 'to' ? setEndHour(h.value) : setStartHour(h.value))}
                        className={`flex h-10 items-center justify-center rounded-xl text-[13px] transition-[background-color,color,transform] duration-200 active:scale-95 ${
                          active ? 'scale-[1.04] bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-[#EAE8E4]'
                        }`}
                      >
                        {h.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4.5 flex flex-wrap items-center justify-between gap-4.5 border-t border-border p-6">
              <span className="max-w-[400px] text-[12.5px] text-subtle">Рабочие часы 10:00 — 21:00.</span>
              <button type="button" onClick={apply} disabled={!draftFrom} className="btn-primary h-12 gap-3.5 pl-5.5 pr-3 hover:gap-[22px]">
                <span>Готово · {formatShifts(days)}</span><span>→</span>
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
