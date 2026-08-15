import { useEffect, useState } from 'react'
import { useStore } from '@nanostores/react'
import type { Product, RentalAvailability } from '@playback-rental/shared-types'
import { getRentalAvailability } from '../lib/payload'
import { calculateRentalDays, calculateRentalPrice, formatCurrency } from '../lib/pricing'
import { formatShifts, buildDaysGrid, formatDateHuman, WEEKDAY_LABELS_RU } from '../lib/dateRange'
import RentalDatePicker from './RentalDatePicker'
import QuantitySelector from './QuantitySelector'
import { $selectedDates, setSelectedDates } from '../stores/dates'
import { addToCart } from '../stores/cart'

interface Props {
  product: Product
  imageUrl?: string
}

function isSameDayLocal(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// Compact, non-navigable month view for the sticky purchase panel — always
// the current month, no prev/next (the full RentalDatePicker modal, opened
// from the boxes below, is where month navigation and time selection live).
// Clicking a day sets dates directly, same picking rule as the modal.
function AvailabilityCalendar({ bookedRanges }: { bookedRanges?: RentalAvailability['bookedRanges'] }) {
  const storeDates = useStore($selectedDates)
  // See the `mounted` note in RentalDatePicker.tsx — $selectedDates is
  // sessionStorage-backed and can legitimately differ from the server render.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const dates = mounted ? storeDates : { startDate: null, endDate: null }
  const month = new Date()
  const grid = buildDaysGrid(month)

  const isBusy = (day: Date): boolean => {
    if (!bookedRanges) return false
    const dayStart = day.getTime()
    const dayEnd = dayStart + 24 * 60 * 60 * 1000
    return bookedRanges.some((r) => new Date(r.startDate).getTime() < dayEnd && new Date(r.endDate).getTime() > dayStart)
  }

  const pick = (day: Date) => {
    const from = dates.startDate
    const to = dates.endDate
    if (!from || (from && to)) {
      setSelectedDates(day, null)
      return
    }
    if (day <= from) setSelectedDates(day, null)
    else setSelectedDates(from, day)
  }

  return (
    <div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-subtle">
        {WEEKDAY_LABELS_RU.map((d) => (
          <span key={d}>{d.toUpperCase()}</span>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1">
        {grid.map((day, i) => {
          if (!day) return <div key={i} />
          const from = dates.startDate
          const to = dates.endDate
          const isFrom = from && isSameDayLocal(day, from)
          const isTo = to && isSameDayLocal(day, to)
          const inRange = from && to && day > from && day < to
          const busy = isBusy(day)
          let style = 'bg-muted text-foreground cursor-pointer'
          if (busy) style = 'bg-[rgba(214,36,16,0.12)] text-accent line-through cursor-not-allowed'
          else if (isFrom || isTo) style = 'bg-primary text-primary-foreground font-semibold scale-[1.04] cursor-pointer'
          else if (inRange) style = 'bg-[#E2E0DB] text-foreground font-medium cursor-pointer'
          return (
            <button
              key={i}
              type="button"
              disabled={busy}
              onClick={() => pick(day)}
              className={`flex aspect-square items-center justify-center rounded-[11px] text-[12.5px] transition-[background-color,color,transform] duration-200 ${style}`}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex gap-3.5 text-[10.5px] uppercase tracking-[0.06em] text-subtle">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-primary" />Ваши даты</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[rgba(214,36,16,0.14)]" />Занято</span>
      </div>
    </div>
  )
}

export default function ProductPurchasePanel({ product, imageUrl }: Props) {
  const storeDates = useStore($selectedDates)
  // See the `mounted` note in RentalDatePicker.tsx — $selectedDates is
  // sessionStorage-backed and can legitimately differ from the server render.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const dates = mounted ? storeDates : { startDate: null, endDate: null }
  const [quantity, setQuantity] = useState(1)
  const [available, setAvailable] = useState(product.quantity)
  const [bookedRanges, setBookedRanges] = useState<RentalAvailability['bookedRanges']>(undefined)
  const [checking, setChecking] = useState(false)
  const [added, setAdded] = useState(false)

  const isRental = product.listingType === 'rental'
  const hasDates = Boolean(dates.startDate && dates.endDate)
  const days = calculateRentalDays(dates.startDate ?? undefined, dates.endDate ?? undefined)

  useEffect(() => {
    let cancelled = false
    setChecking(true)
    getRentalAvailability(product.id, dates.startDate ?? undefined, dates.endDate ?? undefined)
      .then((res) => {
        if (cancelled) return
        setAvailable(res.available)
        setBookedRanges(res.bookedRanges)
        setQuantity((q) => Math.min(q, Math.max(1, res.available)))
      })
      .catch(() => {
        if (!cancelled) setAvailable(0)
      })
      .finally(() => {
        if (!cancelled) setChecking(false)
      })
    return () => {
      cancelled = true
    }
  }, [isRental, product.id, dates.startDate?.getTime(), dates.endDate?.getTime()])

  const baseSum = isRental ? product.price * days * quantity : product.price * quantity
  const lineTotal = isRental
    ? calculateRentalPrice(product.price, dates.startDate ?? undefined, dates.endDate ?? undefined) * quantity
    : product.price * quantity

  const canAdd = isRental ? hasDates && available > 0 && !checking : available > 0

  const handleAdd = () => {
    if (!canAdd) return
    addToCart(
      {
        productId: product.id,
        title: product.title,
        price: product.price,
        listingType: product.listingType,
        imageUrl,
        unit: isRental ? 'сутки' : 'шт.',
      },
      quantity,
    )
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1600)
  }

  const monthLabel = new Date().toLocaleDateString('ru-RU', { month: 'long' })

  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[42px] font-semibold leading-none tracking-[-0.045em]">{formatCurrency(product.price)}</span>
        <span className="text-[11px] uppercase tracking-[0.1em] text-subtle">{isRental ? '/ сутки' : '/ шт.'}</span>
      </div>

      {isRental && (
        <>
          <div className="mt-5.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Занятость · {monthLabel}</div>
          <AvailabilityCalendar bookedRanges={bookedRanges} />
        </>
      )}

      <div className="mt-5">
        {isRental ? (
          <RentalDatePicker variant="boxes" bookedRanges={bookedRanges} totalQuantity={product.quantity} />
        ) : null}
      </div>

      {!product.available || product.quantity === 0 ? (
        <div className="pill mt-3.5 bg-danger-bg text-destructive">Нет в наличии</div>
      ) : isRental ? (
        checking ? (
          <div className="pill mt-3.5 bg-muted text-muted-foreground">Проверяем наличие…</div>
        ) : hasDates ? (
          available > 0 ? (
            <div className="pill mt-3.5 bg-success-bg text-success">Доступно: {available} шт. на выбранные даты</div>
          ) : (
            <div className="pill mt-3.5 bg-danger-bg text-destructive">Забронировано на выбранные даты</div>
          )
        ) : (
          <div className="pill mt-3.5 bg-muted text-muted-foreground">Выберите даты, чтобы увидеть наличие</div>
        )
      ) : available > 0 ? (
        <div className="pill mt-3.5 bg-success-bg text-success">В наличии: {available} шт.</div>
      ) : (
        <div className="pill mt-3.5 bg-danger-bg text-destructive">Нет в наличии</div>
      )}

      {available > 1 && (!isRental || hasDates) && (
        <div className="mt-3.5 flex items-center gap-3">
          <span className="text-[13.5px] font-medium text-muted-foreground">Количество</span>
          <QuantitySelector quantity={quantity} onChange={setQuantity} max={available} />
        </div>
      )}

      {(!isRental || hasDates) && (
        <div className="mt-5">
          <div className="flex items-baseline justify-between py-2.5 text-[13.5px]">
            <span className="text-subtle">
              {formatCurrency(product.price)} × {isRental ? `${formatShifts(days)} × ${quantity}` : `${quantity} шт.`}
            </span>
            <span className="whitespace-nowrap font-semibold">{formatCurrency(baseSum)}</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between rounded-2xl bg-muted px-4.5 py-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.13em]">Итого</span>
            <span className="text-[28px] font-semibold tracking-[-0.035em]">{formatCurrency(lineTotal)}</span>
          </div>
        </div>
      )}

      <button type="button" onClick={handleAdd} disabled={!canAdd} className="btn-primary mt-4 h-14 w-full gap-4.5 text-[11.5px] hover:gap-[30px]">
        {added ? '✓ Добавлено в корзину' : isRental && !hasDates ? 'Выберите даты' : 'В корзину'}
        {!added && <span>→</span>}
      </button>
      <a href="/checkout" className="btn-outline mt-2.5 flex h-12 w-full items-center justify-center text-[11px]">
        Перейти в корзину
      </a>
      <p className="mt-3 text-center text-[12px] leading-[1.5] text-subtle">
        Без залога. Бронь держим 2 часа после подтверждения.
      </p>
    </div>
  )
}
