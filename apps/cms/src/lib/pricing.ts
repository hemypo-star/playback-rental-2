// Duplicated from apps/web/src/lib/pricing.ts (docs/PLAN-next-migration.md
// Stage 2) — apps/web keeps its own live copy until Stage 4 deletes that app
// entirely; keep both in sync until then. Display-only: `lib/rental/pricing.ts`
// (a sibling in *this* app, not apps/web) is the server-side authority —
// Payload's beforeValidate hook is what actually prices an order line.
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
