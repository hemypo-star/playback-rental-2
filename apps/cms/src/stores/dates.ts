import { atom } from 'nanostores'

// Duplicated from apps/web/src/stores/dates.ts (docs/PLAN-next-migration.md
// Stage 2) — apps/web keeps its own live copy until Stage 4 deletes that app
// entirely; keep both in sync until then.
//
// Deliberately NOT using @nanostores/persistent here: its storage engine is a
// module-level global, so mixing it with the cart's localStorage-backed
// persistentJSON (see stores/cart.ts) would make whichever engine was set
// last win for every store's writes. Sale-safe to hand-roll: this store only
// needs sessionStorage (reset per new tab/session — same behavior as the old
// app's BookingDatesContext) with a tiny manual read/write.
export interface DateSelection {
  startDate: Date | null
  endDate: Date | null
}

const STORAGE_KEY = 'pb:selectedDates'

function load(): DateSelection {
  if (typeof window === 'undefined') return { startDate: null, endDate: null }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { startDate: null, endDate: null }
    const parsed = JSON.parse(raw)
    return {
      startDate: parsed.startDate ? new Date(parsed.startDate) : null,
      endDate: parsed.endDate ? new Date(parsed.endDate) : null,
    }
  } catch {
    return { startDate: null, endDate: null }
  }
}

// Real value on the client, {null, null} on the server — components that
// render date-derived text must not use this store's value on their very
// first (hydration) render, or React will flag a mismatch against the
// server-rendered HTML. Gate display on a post-mount `mounted` flag instead
// (see RentalDatePicker) rather than trying to delay this store itself,
// which only races against Astro's per-island hydration timing in dev.
export const $selectedDates = atom<DateSelection>(load())

if (typeof window !== 'undefined') {
  $selectedDates.subscribe((value) => {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        startDate: value.startDate ? value.startDate.toISOString() : null,
        endDate: value.endDate ? value.endDate.toISOString() : null,
      }),
    )
  })
}

export function setSelectedDates(startDate: Date | null, endDate: Date | null): void {
  $selectedDates.set({ startDate, endDate })
}

export function resetSelectedDates(): void {
  $selectedDates.set({ startDate: null, endDate: null })
}
