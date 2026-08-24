// Duplicated from apps/web/src/scripts/catalog-availability.ts (docs/PLAN-
// next-migration.md Stage 2) — apps/web keeps its own live copy until Stage
// 4 deletes that app entirely; keep both in sync until then.
//
// Client-side "only free" filtering + live per-card availability, scoped to
// the catalog grid. Runs entirely after hydration since selected rental dates
// only exist client-side (sessionStorage-backed, see stores/dates.ts) — the
// server-rendered grid always shows the static available-in-stock state.
import { $selectedDates } from '../stores/dates'
import { getRentalAvailabilityBulk } from '../lib/rentalAvailability'

export function initCatalogAvailability(): void {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-product-card]'))
  const rentalCards = cards.filter((c) => c.dataset.listingType === 'rental')
  const toggle = document.querySelector<HTMLButtonElement>('[data-only-free-toggle]')
  const track = toggle?.querySelector<HTMLElement>('[data-only-free-track]')
  const knob = toggle?.querySelector<HTMLElement>('[data-only-free-knob]')

  function setToggleVisual(checked: boolean): void {
    if (!toggle || !track || !knob) return
    track.classList.toggle('bg-primary', checked)
    track.classList.toggle('bg-[rgba(10,10,10,0.12)]', !checked)
    knob.classList.toggle('translate-x-[18px]', checked)
    knob.classList.toggle('translate-x-0', !checked)
  }

  async function refresh(): Promise<void> {
    const dates = $selectedDates.get()
    const onlyFree = toggle?.dataset.checked === 'true'

    if (!dates.startDate || !dates.endDate || rentalCards.length === 0) {
      cards.forEach((c) => {
        c.style.display = ''
      })
      return
    }

    const ids = rentalCards.map((c) => Number(c.dataset.productId))
    let availableMap: Record<number, number>
    try {
      availableMap = await getRentalAvailabilityBulk(ids, dates.startDate, dates.endDate)
    } catch {
      return
    }

    rentalCards.forEach((card) => {
      const id = Number(card.dataset.productId)
      const available = availableMap[id] ?? 0
      // Out-of-stock cards already show "Нет в наличии" server-side — don't
      // overwrite that with "Забронировано" (booked by someone), which
      // implies stock exists but is taken for these dates specifically.
      const inStock = card.dataset.inStock !== 'false'
      const badge = card.querySelector<HTMLElement>('[data-avail-badge]')
      if (badge && inStock) {
        badge.textContent = available > 0 ? `Доступно: ${available}` : 'Забронировано'
        badge.classList.toggle('bg-white/[0.88]', available > 0)
        badge.classList.toggle('text-foreground', available > 0)
        badge.classList.toggle('bg-accent', available <= 0)
        badge.classList.toggle('text-white', available <= 0)
      }
      card.style.display = onlyFree && available <= 0 ? 'none' : ''
    })
  }

  $selectedDates.subscribe(refresh)

  toggle?.addEventListener('click', () => {
    const next = toggle.dataset.checked !== 'true'
    toggle.dataset.checked = String(next)
    setToggleVisual(next)
    refresh()
  })

  refresh()
}
