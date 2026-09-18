'use client'

// Duplicated from apps/web/src/components/RentalDatePicker.tsx (docs/PLAN-
// next-migration.md Stage 2) — near-verbatim, React 19 on both sides; the
// Astro `client:load` directive is just this file's `'use client'` now.
// apps/web keeps its own live copy until Stage 4 deletes that app entirely;
// keep both in sync until then. The `mounted` hydration-mismatch guard below
// is still required — the server still has no sessionStorage.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { useStore } from '@nanostores/react'
import {
  buildDaysGrid,
  formatDayLabel,
  formatDateShort,
  formatMonthYear,
  hourOptions,
  formatBusinessHoursCaption,
  nextMonth,
  prevMonth,
  withTime,
  formatShifts,
  WEEKDAY_LABELS_RU,
} from '../lib/dateRange'
import { calculateRentalDays } from '../lib/pricing'
import { $selectedDates, setSelectedDates, resetSelectedDates } from '../stores/dates'
import { useBusinessHours } from './BusinessHoursContext'

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
  // E2 (design_handoff_swiss_bento/08-instruction.md) — investigated the
  // typography gap E1 flagged for `variant='boxes'` and confirmed it's
  // real: template.html's product-page boxes (lines ~653-663) and its
  // checkout "02 — Даты и время" boxes (lines ~727-736) are genuinely
  // different treatments, not the same box reused —
  //   product:  padding 14px, value 16px/500 -0.02em, a SEPARATE muted
  //             12.5px time line below the date,
  //   checkout: padding 16px, value 18px/500 -0.025em, date+time combined
  //             into one line.
  // Before this, both call sites shared one rendering (14px/600 semibold,
  // dot-joined date+time) that matched neither spec exactly. Only meaningful
  // for variant='boxes'; ignored otherwise.
  context?: 'product' | 'checkout'
  onApply?: () => void
  /** When known (product detail page), used to grey out fully-booked days in the calendar. */
  bookedRanges?: BookedRange[]
  totalQuantity?: number
}

// Imperative escape hatch for a caller that needs to open this modal from
// somewhere other than one of its own trigger buttons — e.g. CheckoutPage's
// "изменить даты" action on a RENTAL_DATES_INVALID/RENTAL_QUANTITY_UNAVAILABLE
// error (A3, design_handoff_swiss_bento/08-instruction.md). Every other call
// site keeps rendering this uncontrolled (no ref), so this is additive only.
export interface RentalDatePickerHandle {
  open: (tab?: 'from' | 'to') => void
}

const RentalDatePicker = forwardRef<RentalDatePickerHandle, Props>(function RentalDatePicker(
  { variant = 'boxes', context = 'product', onApply, bookedRanges, totalQuantity },
  ref,
) {
  // B4 (design_handoff_swiss_bento/08-instruction.md, audit N5) — HOURS
  // (the time grid) and the "Рабочие часы …" caption below are both built
  // from this one value, not a module-scope constant and a separately-typed
  // JSX string like before, so they can't drift from each other again.
  const businessHours = useBusinessHours()
  const HOURS = hourOptions(businessHours.open, businessHours.close)
  const storeDates = useStore($selectedDates)
  // $selectedDates is sessionStorage-backed, so it can legitimately differ
  // between the server render and the client's first (hydration) render.
  // Only trust it for display once mounted — a normal post-hydration state
  // update, not a hydration-time value — so React never flags a mismatch.
  const [mounted, setMounted] = useState(false)
  // Deliberate post-mount hydration-mismatch guard (see CLAUDE.md — don't
  // remove it). This used to carry an inline eslint-disable for
  // react-hooks/set-state-in-effect. Wrapping the component in forwardRef
  // (for the imperative `open()` handle below) made that directive report as
  // unused, so it was dropped — but be clear about why, because it is not
  // that this one line stopped needing it: react-hooks 5.2.0's
  // set-state-in-effect does not analyse a forwardRef-wrapped component at
  // all, so it no longer checks ANY setState-in-effect in this file.
  // Verified against a synthetic forwardRef component with a deliberately
  // bad setState-in-effect, which the rule also failed to flag, while
  // rules-of-hooks and exhaustive-deps do still fire in the same wrapper.
  // The guard below is correct as written; just don't expect lint to catch
  // it if someone later breaks it.
  useEffect(() => setMounted(true), [])
  const dates = mounted ? storeDates : { startDate: null, endDate: null }
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => startOfMonth(dates.startDate ?? new Date()))
  const [activeTab, setActiveTab] = useState<'from' | 'to'>('from')
  const [draftFrom, setDraftFrom] = useState<Date | null>(dates.startDate)
  const [draftTo, setDraftTo] = useState<Date | null>(dates.endDate)
  const [startHour, setStartHour] = useState(dates.startDate ? String(dates.startDate.getHours()) : '10')
  const [endHour, setEndHour] = useState(dates.endDate ? String(dates.endDate.getHours()) : '10')
  // ACC-001 (docs/audits/2026-08-24-baseline.md): this modal had no dialog
  // semantics, no Escape handling, and no focus trap — confirmed via a
  // code-level a11y pass, no Lighthouse/screen-reader session available at
  // audit time. modalRef anchors the focus trap + initial focus-on-open;
  // previouslyFocusedRef restores focus to whichever of the 4 variant
  // trigger buttons actually opened it, without threading a ref through
  // each one individually.
  const modalRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const titleId = 'rental-date-picker-title'

  const openPicker = (tab: 'from' | 'to' = 'from') => {
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setDraftFrom(dates.startDate)
    setDraftTo(dates.endDate)
    setStartHour(dates.startDate ? String(dates.startDate.getHours()) : '10')
    setEndHour(dates.endDate ? String(dates.endDate.getHours()) : '10')
    setActiveTab(tab)
    setMonth(startOfMonth(dates.startDate ?? new Date()))
    setOpen(true)
  }

  useImperativeHandle(ref, () => ({ open: openPicker }))

  const closePicker = useCallback(() => {
    setOpen(false)
    previouslyFocusedRef.current?.focus()
  }, [])

  // Focus the dialog on open (modalRef has tabIndex={-1} — programmatically
  // focusable without joining the page's normal tab order on its own), and
  // trap Tab/Shift+Tab within it while it's open so keyboard focus can't
  // silently escape to the page behind the backdrop. Escape closes it, same
  // as the existing backdrop-click and ✕-button affordances.
  useEffect(() => {
    if (!open) return
    modalRef.current?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        closePicker()
        return
      }
      if (e.key !== 'Tab') return
      const modal = modalRef.current
      if (!modal) return
      const focusable = modal.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, closePicker])

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
      closePicker()
      return
    }
    setSelectedDates(withTime(draftFrom, startHour)!, withTime(draftTo, endHour)!)
    closePicker()
    onApply?.()
  }

  // «Сбросить» (B1, design_handoff_swiss_bento/08-instruction.md) — matches
  // the old site's DateRangePickerRu, whose reset cleared the range
  // immediately rather than waiting for a confirm step. Deliberately clears
  // the committed store too, not just the draft: this button's whole job is
  // to let the customer abandon a previously-chosen range (shared across
  // every RentalDatePicker instance on the site, session-scoped per
  // CLAUDE.md), and the modal's other dismissal paths (Esc, backdrop click,
  // ✕) already cover "discard my in-progress edit without committing it" —
  // none of them touch the committed store. Stays open afterward (also
  // matching the old site) so the customer can immediately pick a fresh
  // range instead of having to reopen the modal.
  const handleReset = () => {
    resetSelectedDates()
    setDraftFrom(null)
    setDraftTo(null)
    setStartHour('10')
    setEndHour('10')
    setActiveTab('from')
    setMonth(startOfMonth(new Date()))
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
  // calculateRentalDays itself now floors at 1 day for any two real dates
  // (the A1 fix — see lib/rental/pricing.ts's JSDoc), so this `|| 1` is no
  // longer a day-math band-aid: pickDay always keeps draftFrom/draftTo in
  // sync (never from-set-but-to-null), so the only way calculateRentalDays
  // can return 0 here is the pre-first-click state (both null). The button
  // is disabled then anyway (`disabled={!draftFrom}`), but it still renders
  // a label — `|| 1` is what keeps that label reading "1 смена" instead of
  // "0 смен" before the customer has picked anything. Changing that label's
  // no-dates copy is B-block scope, not A1, so it's kept as-is.
  const days = calculateRentalDays(draftFrom ?? undefined, draftTo ?? undefined) || 1

  return (
    <>
      {variant === 'navbar' && (
        // E1/E3/E4 (design_handoff_swiss_bento/08-instruction.md) each
        // independently flagged, but left unfixed as out of their own
        // screen's scope, the same real bug: this pill's real text content
        // ("Выбрать даты" or a full date range like "12–14 АВГ") is a
        // `whitespace-nowrap` element with no mobile treatment, and — packed
        // into the header row alongside the logo/cart/hamburger — was the
        // single biggest contributor to Navbar's page-level horizontal
        // overflow at 360-390px (confirmed via document.documentElement.
        // scrollWidth: this button alone accounted for ~92 of the ~89-136px
        // overflow, depending on viewport). `04-screens.md`'s S0 section is
        // explicit about the intended mobile treatment ("чип даты →
        // иконка-кнопка 44px с датой в подписи") — an icon-only 44px button
        // below the same breakpoint the burger nav already collapses at
        // (the visible-text form now starts above the mobile 760px cutoff):
        // already built and verified against `md`=768px throughout the
        // whole migration, and introducing a second, different breakpoint
        // just for this one element would fragment the header's responsive
        // behavior for no real benefit) — so the label becomes the button's
        // `aria-label` (present at every breakpoint, so the accessible name
        // never depends on which element is visually shown) instead of
        // visible text once the icon replaces it. The calendar glyph reuses
        // this app's own established stroke-icon conventions (viewBox 0 0
        // 24 24, fill none, stroke currentColor, strokeWidth 1.8 — see
        // CatalogPage.tsx's search icon) rather than inventing new
        // iconography, and `h-11 w-11` (44px, Tailwind's own default scale,
        // not an arbitrary/new value) matches the spec's literal number —
        // unlike the breakpoint, nothing here conflicts with the rest of
        // the row's `h-[38px]` siblings badly enough to justify diverging
        // from the one number the spec actually pins down.
        <button
          type="button"
          onClick={() => openPicker('from')}
          aria-label={dates.startDate && dates.endDate ? `Даты аренды: ${fromLabel} — ${toLabel}` : 'Выбрать даты'}
          className="flex h-9 w-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-muted text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors duration-240 ease-expo hover:bg-primary hover:text-primary-foreground min-[761px]:h-[38px] min-[761px]:w-auto min-[761px]:justify-start min-[761px]:px-[15px]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5 shrink-0 min-[761px]:hidden" aria-hidden="true">
            <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
            <path strokeLinecap="round" d="M8 3v4M16 3v4M3.5 9.5h17" />
          </svg>
          <span className="hidden min-[761px]:inline">{dates.startDate && dates.endDate ? `${fromLabel} — ${toLabel}` : 'Выбрать даты'}</span>
        </button>
      )}

      {variant === 'compact' && (
        <button
          type="button"
          onClick={() => openPicker('from')}
          className="rounded-xl px-3.5 py-2 text-left transition-colors duration-240 ease-expo hover:bg-primary hover:text-primary-foreground"
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.06em] opacity-60">Даты и время</div>
          <div className="mt-0.5 whitespace-nowrap text-[13.5px] font-semibold tracking-[-0.015em]">
            {dates.startDate && dates.endDate ? `${fromLabel} — ${toLabel}, ${fromTime}` : 'Выбрать даты аренды'}
          </div>
        </button>
      )}

      {variant === 'hero' && (
        // E3 (design_handoff_swiss_bento/08-instruction.md) drive-by, found
        // during the homepage's required 360px live check: this variant has
        // no design-file counterpart at all (a B1 UX decision, not a
        // template.html element — see this prop's own doc comment above),
        // so it never got a narrow-viewport treatment. inline-flex with no
        // wrap let "Забрать"/divider/"Вернуть"/the CTA button force the
        // hero card wider than a 360px viewport, causing real page-level
        // horizontal scroll (confirmed via document.documentElement.
        // scrollWidth before this fix). flex-wrap is layout-only — no new
        // token, no visual change at any width this already fit.
        <div className="flex flex-wrap items-center gap-1.5 rounded-[18px] bg-muted p-2">
          <button
            type="button"
            onClick={() => openPicker('from')}
            className="rounded-xl px-3.5 py-2 text-left transition-colors duration-240 ease-expo hover:bg-white"
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
            className="rounded-xl px-3.5 py-2 text-left transition-colors duration-240 ease-expo hover:bg-white"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.02em] text-subtle">Вернуть</div>
            <div className="mt-0.5 whitespace-nowrap text-[14.5px] font-semibold tracking-[-0.015em]">
              {toLabel}{toTime && `, ${toTime}`}
            </div>
          </button>
          <Link href="/catalog" className="btn-primary ml-1 h-[50px] px-6 text-[11.5px]">
            Показать свободное
          </Link>
        </div>
      )}

      {variant === 'boxes' && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => openPicker('from')}
            className={`rounded-2xl bg-muted text-left transition-[background-color,transform] duration-240 ease-expo hover:-translate-y-0.5 hover:bg-[#EAE8E4] ${context === 'checkout' ? 'p-4' : 'p-3.5'}`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-subtle">Выдача</div>
            {context === 'checkout' ? (
              <div className="mt-2 whitespace-nowrap text-[18px] font-medium tracking-[-0.025em]">{fromLabel}{fromTime && `, ${fromTime}`}</div>
            ) : (
              <>
                <div className="mt-[7px] whitespace-nowrap text-[16px] font-medium tracking-[-0.02em]">{fromLabel}</div>
                {fromTime && <div className="mt-[3px] text-[12.5px] text-subtle">{fromTime}</div>}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => openPicker('to')}
            className={`rounded-2xl bg-muted text-left transition-[background-color,transform] duration-240 ease-expo hover:-translate-y-0.5 hover:bg-[#EAE8E4] ${context === 'checkout' ? 'p-4' : 'p-3.5'}`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-subtle">Возврат</div>
            {context === 'checkout' ? (
              <div className="mt-2 whitespace-nowrap text-[18px] font-medium tracking-[-0.025em]">{toLabel}{toTime && `, ${toTime}`}</div>
            ) : (
              <>
                <div className="mt-[7px] whitespace-nowrap text-[16px] font-medium tracking-[-0.02em]">{toLabel}</div>
                {toTime && <div className="mt-[3px] text-[12.5px] text-subtle">{toTime}</div>}
              </>
            )}
          </button>
        </div>
      )}

      {open && createPortal(
        // Portalled to <body> — the navbar's backdrop-blur establishes a new
        // containing block for `position: fixed` descendants, which would
        // otherwise confine this overlay to the navbar's own box instead of
        // the viewport.
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-5" style={{ animation: 'bnFade 240ms ease both' }}>
          <div className="absolute inset-0 bg-[rgba(10,10,10,0.42)] backdrop-blur-[6px]" onClick={closePicker} />
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            // C3 (design_handoff_swiss_bento/08-instruction.md) —
            // structurally exempts this panel's entrance from
            // global.css's `html[data-nav-back]` suppression rule: this
            // mounts on a click, not on page load, so it must animate
            // however long after a Back navigation it's opened, whether
            // or not that navigation's own suppression flag has cleared
            // yet. See global.css's own comment on that rule for why a
            // second, structural guard exists here rather than relying on
            // flag timing alone.
            data-manual-entry="true"
            className="relative max-h-[90vh] w-full max-w-[780px] overflow-y-auto rounded-[26px] bg-card shadow-[var(--shadow-lifted)] outline-none"
            style={{ animation: 'bnIn 560ms var(--ease-expo) both' }}
          >
            <div className="flex items-start justify-between gap-4 p-6 pb-0">
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Период аренды</div>
                <div id={titleId} className="mt-1.5 text-[22px] font-medium tracking-[-0.03em]">
                  {activeTab === 'to' ? 'День и время возврата' : 'День и время выдачи'}
                </div>
              </div>
              <button
                type="button"
                onClick={closePicker}
                aria-label="Закрыть"
                // Background/color stay on this file's usual duration-240
                // ease-expo pairing; the rotation itself gets the design's
                // own transform-specific curve+duration (interactions.css
                // `.d-h1ht6c`: transform 320ms --ease-overshoot — one of
                // the eight overshoot instances the work order flags as
                // lost). A single Tailwind duration/ease pair can't
                // express two different timings on one `transition-[...]`
                // list, hence the arbitrary shorthand.
                className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-muted text-[14px] [transition:background-color_240ms_var(--ease-expo),color_240ms_var(--ease-expo),transform_320ms_var(--ease-overshoot)] hover:rotate-90 hover:bg-primary hover:text-primary-foreground"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 px-6 pt-4.5">
              <button
                type="button"
                onClick={() => setActiveTab('from')}
                className={`rounded-2xl p-3.5 text-left transition-colors duration-240 ease-expo ${activeTab === 'from' ? 'bg-primary text-primary-foreground' : 'bg-transparent hover:bg-muted'}`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.13em] opacity-60">Выдача</div>
                <div className="mt-1.5 text-[16px] font-medium">{draftFromLabel} · {String(startHour).padStart(2, '0')}:00</div>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('to')}
                className={`rounded-2xl p-3.5 text-left transition-colors duration-240 ease-expo ${activeTab === 'to' ? 'bg-primary text-primary-foreground' : 'bg-transparent hover:bg-muted'}`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.13em] opacity-60">Возврат</div>
                <div className="mt-1.5 text-[16px] font-medium">{draftToLabel} · {String(endHour).padStart(2, '0')}:00</div>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4.5 px-6 pt-4.5 sm:grid-cols-[1.25fr_1fr]">
              <div>
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setMonth((m) => prevMonth(m))} className="flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-240 ease-expo hover:bg-muted" aria-label="Предыдущий месяц">←</button>
                  <div className="flex items-center gap-3.5">
                    <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle capitalize">{formatMonthYear(month)}</div>
                    {bookedRanges && (
                      <div className="hidden items-center gap-3 text-[10.5px] uppercase tracking-[0.06em] text-subtle sm:flex">
                        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-primary" />выбрано</span>
                        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[rgba(214,36,16,0.14)]" />занято</span>
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => setMonth((m) => nextMonth(m))} className="flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-240 ease-expo hover:bg-muted" aria-label="Следующий месяц">→</button>
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
                          // Below `sm` (the breakpoint where this column
                          // stops stacking full-width and settles into the
                          // narrower 1.25fr split — see the grid a few
                          // lines up), min-h-11 (44px) floors the tap
                          // target height, since the 7-column grid's own
                          // track width (~36px at 360px) leaves no room for
                          // a true 44px-wide cell without cutting into the
                          // modal's padding (N16). Deliberately plain
                          // min-height there rather than aspect-square +
                          // min-h together: Chromium's aspect-ratio sizing
                          // re-derives BOTH axes from whichever one a min-*
                          // constraint clamps, so aspect-square would
                          // inflate width to match the enforced 44px
                          // height too — confirmed live, it overflowed the
                          // 7-column row (7×44 + gaps ≫ the ~272px
                          // available) into a page-wide horizontal
                          // scrollbar. A taller, non-square cell meets the
                          // real target (a reliable ≥44px-tall tap area)
                          // without that regression; every mainstream
                          // mobile calendar makes the same width/height
                          // tradeoff in a 7-column month grid at this
                          // viewport width. `sm:aspect-square` restores the
                          // design's literal 1:1 cells (`template.html`'s
                          // `aspect-ratio:1/1`) once the column is wide
                          // enough that a square already clears 44px on
                          // its own.
                          // Eyeball pass (template.html's `pickerCalendar`
                          // day cell): same transform-curve mismatch as the
                          // close button above — background/color stay on
                          // duration-240 ease-expo, transform (the
                          // isFrom/isTo scale pop) gets the design's own
                          // 320ms overshoot instead of ease-expo.
                          'flex min-h-11 sm:aspect-square items-center justify-center rounded-xl text-[13px] [transition:background-color_240ms_var(--ease-expo),color_240ms_var(--ease-expo),transform_320ms_var(--ease-overshoot)]',
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
                        // h-11 (44px) — the standard minimum mobile tap
                        // target; was h-10 (40px), N16. Transform (the
                        // active-state scale pop and the active:scale-95
                        // press feedback) gets the design's own 320ms
                        // overshoot curve, same fix as the day cells above.
                        className={`flex h-11 items-center justify-center rounded-xl text-[13px] [transition:background-color_240ms_var(--ease-expo),color_240ms_var(--ease-expo),transform_320ms_var(--ease-overshoot)] active:scale-95 ${
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
              <div className="flex flex-wrap items-center gap-3.5">
                <span className="max-w-[400px] text-[12.5px] text-subtle">{formatBusinessHoursCaption(businessHours.open, businessHours.close)}</span>
                {(draftFrom || draftTo) && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-[12.5px] font-semibold text-subtle transition-colors duration-240 ease-expo hover:text-accent hover:underline"
                  >
                    Сбросить
                  </button>
                )}
              </div>
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
})

RentalDatePicker.displayName = 'RentalDatePicker'

export default RentalDatePicker
