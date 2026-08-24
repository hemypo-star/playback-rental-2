// Browser-only client, unlike lib/data/*.ts's server-only Local API layer —
// selected rental dates only exist client-side (sessionStorage-backed, see
// stores/dates.ts), so this can only ever be called from a mounted
// component/script, never during SSR. Ported from apps/web/src/lib/
// payload.ts's getRentalAvailability()/getRentalAvailabilityBulk(), which
// went through that file's REST client; here it's a direct fetch, since
// /api is already same-origin (native to this app's own (payload) route
// group) rather than something a proxy has to bridge.
export interface RentalAvailability {
  listingType: 'rental' | 'sale'
  quantity: number
  available: number
  bookedRanges?: { startDate: string; endDate: string; quantity: number }[]
}

export async function getRentalAvailability(productId: number, start?: Date, end?: Date): Promise<RentalAvailability> {
  const params = new URLSearchParams({ productId: String(productId) })
  if (start) params.set('start', start.toISOString())
  if (end) params.set('end', end.toISOString())
  const res = await fetch(`/api/rental-availability?${params.toString()}`)
  if (!res.ok) throw new Error(`rental-availability request failed: ${res.status}`)
  return res.json() as Promise<RentalAvailability>
}

export async function getRentalAvailabilityBulk(
  productIds: number[],
  start?: Date,
  end?: Date,
): Promise<Record<number, number>> {
  if (productIds.length === 0) return {}
  const params = new URLSearchParams({ productIds: productIds.join(',') })
  if (start) params.set('start', start.toISOString())
  if (end) params.set('end', end.toISOString())
  const res = await fetch(`/api/rental-availability-bulk?${params.toString()}`)
  if (!res.ok) throw new Error(`rental-availability-bulk request failed: ${res.status}`)
  const result = (await res.json()) as { available: Record<number, number> }
  return result.available
}
