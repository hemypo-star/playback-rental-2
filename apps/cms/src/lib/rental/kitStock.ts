// Shared-stock arithmetic for rentals, kits included. Pure functions only (no
// DB access) so they can be unit-tested; lib/rental/availability.ts and
// lib/rental/bookedQuantity.ts load the bookings and call these.
//
// Owner's rule (2026-10-15): a kit and its component products may be booked
// at the same time as long as stock allows. So a kit booking consumes one
// unit of each component it lists (more if a component is listed twice), and
// a component's free quantity is reduced by the kits booked over it.
//
// Free quantity over a window is capacity minus the PEAK concurrent load in
// that window, not the sum of every booking touching it: two one-day bookings
// on Monday and Wednesday occupy one unit, not two, for a Monday–Friday rental.

/** componentId -> units of that component in one kit. */
export type KitComposition = Map<number, number>

export interface Booking {
  productId: number
  quantity: number
  /** Epoch ms, inclusive. */
  start: number
  /** Epoch ms, exclusive. */
  end: number
}

export interface Range {
  start: number
  end: number
}

export function kitComposition(kitItems?: ReadonlyArray<{ productId?: number | null }> | null): KitComposition {
  const composition: KitComposition = new Map()
  for (const item of kitItems ?? []) {
    // Legacy rows imported with only a label have no productId; they cannot be
    // tied to stock, so they don't constrain availability (submitOrder still
    // matches them by title when pushing to МойСклад).
    const id = item?.productId
    if (typeof id === 'number' && Number.isFinite(id)) composition.set(id, (composition.get(id) ?? 0) + 1)
  }
  return composition
}

/**
 * The load each booking places on stock: the booking itself (a kit's own
 * capacity counts too) plus, for a kit, one booking per component scaled by
 * how many of it the kit contains.
 */
export function expandKitBookings(bookings: readonly Booking[], kits: ReadonlyMap<number, KitComposition>): Booking[] {
  const expanded: Booking[] = []
  for (const booking of bookings) {
    expanded.push(booking)
    const composition = kits.get(booking.productId)
    if (!composition) continue
    for (const [componentId, count] of composition) {
      expanded.push({ ...booking, productId: componentId, quantity: booking.quantity * count })
    }
  }
  return expanded
}

type Edge = { at: number; delta: number }

function edgesFor(bookings: readonly Booking[], productId: number, window?: Range): Edge[] {
  const edges: Edge[] = []
  for (const b of bookings) {
    if (b.productId !== productId || b.quantity <= 0) continue
    const start = window ? Math.max(b.start, window.start) : b.start
    const end = window ? Math.min(b.end, window.end) : b.end
    if (end <= start) continue
    edges.push({ at: start, delta: b.quantity }, { at: end, delta: -b.quantity })
  }
  // Ends before starts at the same instant: a return at 10:00 frees the unit
  // for a pickup at 10:00.
  return edges.sort((a, b) => a.at - b.at || a.delta - b.delta)
}

/** Highest number of units of `productId` in use at any one moment of `window`. */
export function peakLoad(bookings: readonly Booking[], productId: number, window: Range): number {
  let load = 0
  let peak = 0
  for (const edge of edgesFor(bookings, productId, window)) {
    load += edge.delta
    if (load > peak) peak = load
  }
  return peak
}

/** Stretches of time when fewer than `need` units of `productId` are free. */
export function saturatedRanges(bookings: readonly Booking[], productId: number, capacity: number, need: number): Range[] {
  if (capacity < need) return [{ start: -Infinity, end: Infinity }]
  const ranges: Range[] = []
  let load = 0
  let openedAt: number | null = null
  const edges = edgesFor(bookings, productId)
  for (let i = 0; i < edges.length; i++) {
    load += edges[i].delta
    // Apply every edge at the same instant before judging the state.
    if (i + 1 < edges.length && edges[i + 1].at === edges[i].at) continue
    const saturated = capacity - load < need
    if (saturated && openedAt === null) openedAt = edges[i].at
    if (!saturated && openedAt !== null) {
      ranges.push({ start: openedAt, end: edges[i].at })
      openedAt = null
    }
  }
  return ranges
}

export function mergeRanges(ranges: readonly Range[]): Range[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start)
  const merged: Range[] = []
  for (const range of sorted) {
    const last = merged[merged.length - 1]
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end)
    else merged.push({ ...range })
  }
  return merged
}

export interface StockItem {
  quantity: number
  available: boolean
}

export interface KitAvailabilityInput {
  kitId: number
  kit: StockItem
  composition: KitComposition
  components: ReadonlyMap<number, StockItem>
  /** Already expanded with expandKitBookings. */
  load: readonly Booking[]
  window?: Range
}

/** How many more of a kit can be booked over `window` (or right now, with no window). */
export function kitFreeQuantity({ kitId, kit, composition, components, load, window }: KitAvailabilityInput): number {
  if (!kit.available) return 0
  const loadOf = (id: number) => (window ? peakLoad(load, id, window) : 0)
  let free = kit.quantity - loadOf(kitId)
  for (const [componentId, count] of composition) {
    const component = components.get(componentId)
    // A component that no longer exists or is switched off makes the kit
    // impossible to assemble.
    if (!component || !component.available) return 0
    free = Math.min(free, Math.floor((component.quantity - loadOf(componentId)) / count))
  }
  return Math.max(0, free)
}

/** Stretches of time when not even one kit can be assembled. */
export function kitSaturatedRanges({ kitId, kit, composition, components, load }: Omit<KitAvailabilityInput, 'window'>): Range[] {
  const ranges = saturatedRanges(load, kitId, kit.available ? kit.quantity : 0, 1)
  for (const [componentId, count] of composition) {
    const component = components.get(componentId)
    const capacity = component && component.available ? component.quantity : 0
    ranges.push(...saturatedRanges(load, componentId, capacity, count))
  }
  return mergeRanges(ranges)
}

export interface CartLine {
  productId: number
  quantity: number
}

export interface CartStock extends StockItem {
  isKit: boolean
  composition: KitComposition
}

/**
 * Free quantity for each line of one cart over one window, walking the lines
 * in cart order exactly as checkout submits them: each line sees what the
 * lines before it will take, kits included, on top of everyone else's
 * bookings. A line that is short still claims what is free (the "оставить N,
 * остаток по звонку" path submits that much), so later lines see the stock
 * that will really be left. `stock` must cover every line's product and every
 * kit component.
 */
export function cartLineAvailability(
  lines: readonly CartLine[],
  stock: ReadonlyMap<number, CartStock>,
  existingLoad: readonly Booking[],
  window: Range,
): number[] {
  const load: Booking[] = [...existingLoad]
  const kits = new Map<number, KitComposition>()
  for (const [id, s] of stock) if (s.isKit) kits.set(id, s.composition)

  return lines.map((line) => {
    const s = stock.get(line.productId)
    let free = 0
    if (s?.isKit) {
      free = kitFreeQuantity({ kitId: line.productId, kit: s, composition: s.composition, components: stock, load, window })
    } else if (s?.available) {
      free = Math.max(0, s.quantity - peakLoad(load, line.productId, window))
    }
    const claimed = Math.min(line.quantity, free)
    if (claimed > 0) {
      load.push(...expandKitBookings([{ productId: line.productId, quantity: claimed, start: window.start, end: window.end }], kits))
    }
    return free
  })
}
