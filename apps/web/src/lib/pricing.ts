// Ported verbatim from the old app's src/utils/pricingUtils.ts (and matches
// apps/cms/src/lib/rental/pricing.ts, the server-side authority) — display-only
// here; Payload's beforeValidate hook is what actually prices an order line.
export function calculateRentalDays(startDate?: Date, endDate?: Date): number {
  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return 0
  }
  const hours = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))
  if (hours <= 0) return 0
  return Math.ceil(hours / 24) || 1
}

export function calculateRentalPrice(basePrice: number, startDate?: Date, endDate?: Date): number {
  const days = calculateRentalDays(startDate, endDate)
  if (days <= 0) return 0
  return Math.round(basePrice * days)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
}
