import { atom } from 'nanostores'

// Live per-date availability for the catalog grid, shared between the one
// component that fetches it (PrototypeCatalogAvailability) and the many cards
// that render it (PrototypeProductCard).
//
// Why a store rather than a prop: the grid is server-rendered, but the dates
// this is keyed on live only in the browser (stores/dates.ts, sessionStorage).
// One client component fetches the whole page's products in a single bulk
// request and publishes here; cards subscribe. The alternative — a fetch per
// card — would be one request per visible product.
//
// `failed` is a first-class state, not an absence. The implementation this
// replaces (scripts/catalog-availability.ts) swallowed a failed lookup with
// `catch { return }`, which left the static "Свободно" badge in place and so
// made an outage indistinguishable from real availability — audit finding N10.
// A card must be able to tell "not checked yet" from "checked, unavailable"
// from "could not check".
export type CatalogAvailabilityStatus = 'idle' | 'loading' | 'ready' | 'failed'

export interface CatalogAvailabilityState {
  status: CatalogAvailabilityStatus
  // productId -> units free for the selected dates. Only meaningful when
  // status is 'ready', and only for ids in the current result set.
  available: Record<number, number>
}

export const $catalogAvailability = atom<CatalogAvailabilityState>({ status: 'idle', available: {} })

export function setCatalogAvailabilityLoading(): void {
  $catalogAvailability.set({ status: 'loading', available: {} })
}

export function setCatalogAvailabilityReady(available: Record<number, number>): void {
  $catalogAvailability.set({ status: 'ready', available })
}

export function setCatalogAvailabilityFailed(): void {
  $catalogAvailability.set({ status: 'failed', available: {} })
}

// Called when the grid unmounts, and whenever the customer clears their dates.
// Without this, navigating from the catalog to a page that also renders product
// cards (the homepage) would leave those cards reading a result set computed for
// a different page's products and a possibly different date range.
export function resetCatalogAvailability(): void {
  $catalogAvailability.set({ status: 'idle', available: {} })
}
