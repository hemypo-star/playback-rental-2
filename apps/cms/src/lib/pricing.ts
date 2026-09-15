// Display-only re-export: `lib/rental/pricing.ts` is the single source of
// truth for day-counting/pricing (it's also what the `beforeValidate` hook
// on `orderItems` calls server-side), so the storefront's day/price math and
// the hook's day/price math are always the exact same function, not two
// copies that can drift. This file used to carry its own duplicate copy of
// `calculateRentalDays`/`calculateRentalPrice` (a leftover from when
// `apps/web` was a separate app with its own copy of this file); `apps/web`
// was deleted on 2026-08-21, and the duplicate math — which was also
// independently wrong, see `lib/rental/pricing.ts`'s JSDoc for the
// convention it now follows — went with it.
export { calculateRentalDays, calculateRentalPrice } from './rental/pricing'

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
}
