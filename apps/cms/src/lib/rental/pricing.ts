// Ported from the old app's src/utils/pricingUtils.ts (post "rework discount
// system": flat per-day rate, no tiered discounts). This is the exact logic
// whose duplication across three call sites caused the price-recalculation
// bug fixed earlier this session — here it lives in exactly one place.
// Any duration up to 24h counts as 1 day.
export function calculateRentalDays(startDate: Date, endDate: Date): number {
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0
  const hours = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))
  if (hours <= 0) return 0
  return Math.ceil(hours / 24) || 1
}

export function calculateRentalPrice(basePrice: number, startDate: Date, endDate: Date): number {
  const days = calculateRentalDays(startDate, endDate)
  if (days <= 0) return 0
  return Math.round(basePrice * days)
}

export function calculateLineTotal(params: {
  listingType: 'rental' | 'sale'
  unitPrice: number
  quantity: number
  startDate?: Date | null
  endDate?: Date | null
}): number {
  const { listingType, unitPrice, quantity } = params
  if (listingType === 'sale') {
    return Math.round(unitPrice * quantity)
  }
  if (!params.startDate || !params.endDate) return 0
  return calculateRentalPrice(unitPrice, new Date(params.startDate), new Date(params.endDate)) * quantity
}
