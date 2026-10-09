import { calculateRentalDays } from '../rental/pricing'
import type { OrderItemForPush } from './orders'

// Kits ("Наборы") are created on the site with a synthetic `kit-<uuid>`
// moySkladId (admin/kits/actions.ts) — there is no such entity in МойСклад,
// so a kit line can't be pushed as a position of its own. Instead it is
// expanded into its component products' real positions, with the kit line's
// price spread over them so the pushed total still equals the kit line total.

const BUSINESS_TIME_ZONE = 'Asia/Novokuznetsk'

export function isSyntheticMoySkladId(id: string | null | undefined): boolean {
  return !id || id.startsWith('kit-')
}

const RENTAL_NAME_PREFIX = 'аренда '

/**
 * Key for matching a kit row's label (kept as it was typed or imported, often
 * still "Аренда <name>") against a product title (the sync strips that
 * prefix). Same rule as the sync's stripRentalPrefix, plus case and
 * whitespace folding.
 */
export function kitLabelKey(label: string): string {
  const trimmed = label.trim().toLowerCase()
  const bare = trimmed.startsWith(RENTAL_NAME_PREFIX) ? trimmed.slice(RENTAL_NAME_PREFIX.length) : trimmed
  return bare.replace(/\s+/g, ' ').trim()
}

export interface KitComponent {
  label: string
  // null when the component product could not be resolved to a real
  // МойСклад entity (deleted product, legacy row without productId, nested kit)
  moySkladId: string | null
  listingType: 'rental' | 'sale'
  price: number
}

export interface KitLineInput {
  quantity: number
  lineTotal: number
  startDate?: string | null
  endDate?: string | null
  listingType: 'rental' | 'sale'
  components: KitComponent[]
}

export interface KitExpansion {
  items: OrderItemForPush[]
  resolved: string[]
  unresolved: string[]
}

/**
 * Spreads a kit line's total over its resolvable components, proportionally
 * to their current prices (equally if none has a price). Each component is
 * pushed once per kit unit, so its position quantity matches the kit's.
 * Returns `unitPrice` per position unit (per day for rental), which
 * pushOrderToMoySklad multiplies back by quantity × days.
 */
export function expandKitLine(line: KitLineInput): KitExpansion {
  const usable = line.components.filter((c) => !isSyntheticMoySkladId(c.moySkladId))
  const unresolved = line.components.filter((c) => isSyntheticMoySkladId(c.moySkladId)).map((c) => c.label)
  if (usable.length === 0 || line.quantity <= 0) return { items: [], resolved: [], unresolved }

  const days =
    line.listingType === 'rental' && line.startDate && line.endDate
      ? calculateRentalDays(new Date(line.startDate), new Date(line.endDate))
      : 1
  const weightSum = usable.reduce((sum, c) => sum + Math.max(c.price, 0), 0)

  const items = usable.map((c) => {
    const weight = weightSum > 0 ? Math.max(c.price, 0) / weightSum : 1 / usable.length
    const share = line.lineTotal * weight
    // Same quantity rule as pushOrderToMoySklad: rental positions are
    // quantity × days, sale positions are just quantity.
    const positionUnits = c.listingType === 'rental' ? line.quantity * Math.max(days, 1) : line.quantity
    return {
      moySkladId: c.moySkladId as string,
      listingType: c.listingType,
      quantity: line.quantity,
      unitPrice: share / positionUnits,
      startDate: line.startDate,
      endDate: line.endDate,
    }
  })
  return { items, resolved: usable.map((c) => c.label), unresolved }
}

function money(value: number): string {
  return `${Math.round(value * 100) / 100} ₽`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function businessDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: BUSINESS_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export interface DescriptionLine {
  title: string
  quantity: number
  listingType: 'rental' | 'sale'
  lineTotal: number
  startDate?: string | null
  endDate?: string | null
  kit?: {
    resolved: string[]
    unresolved: string[]
    // Per-day kit price vs the sum of its parts, when the kit is a deal
    price: number
    oldPrice?: number | null
  }
}

export interface DescriptionInput {
  orderId: number
  customerNotes?: string | null
  lines: DescriptionLine[]
  gross: number
  totalPrice: number
  promoCode?: string | null
  promoDiscountType?: 'percent' | 'fixed' | null
  promoDiscountValue?: number | null
  promoMinOrderAmount?: number | null
  promoDiscount: number
}

/**
 * The text МойСклад shows as the order's comment: what the customer said,
 * the line items (with kit composition), and every discount applied, so the
 * manager can reconcile positions that were scaled down by a promo code or
 * spread over a kit's components.
 */
export function buildOrderDescription(input: DescriptionInput): string {
  const out: string[] = [`Заказ с сайта №${input.orderId}`]

  if (input.customerNotes?.trim()) out.push(`Комментарий клиента: ${input.customerNotes.trim()}`)

  out.push('', 'Позиции:')
  input.lines.forEach((line, index) => {
    const isKit = Boolean(line.kit)
    let head = `${index + 1}. ${isKit ? 'Набор «' + line.title + '»' : line.title} ×${line.quantity}`
    if (line.listingType === 'rental' && line.startDate && line.endDate) {
      const days = calculateRentalDays(new Date(line.startDate), new Date(line.endDate))
      head += `, аренда ${businessDate(line.startDate)} — ${businessDate(line.endDate)} (${days} сут.)`
    }
    out.push(`${head} — ${money(line.lineTotal)}`)
    if (line.kit) {
      if (line.kit.resolved.length > 0) {
        out.push(`   Состав набора: ${line.kit.resolved.join('; ')}`)
        out.push('   Цена набора разнесена на эти позиции пропорционально их стоимости.')
      }
      if (line.kit.unresolved.length > 0) {
        out.push(`   ВНИМАНИЕ, нет в МойСклад, в позиции не включены: ${line.kit.unresolved.join('; ')}`)
      }
      if (line.kit.resolved.length === 0) {
        out.push('   ВНИМАНИЕ: состав набора не найден в МойСклад, набор не попал в позиции заказа.')
      }
      if (line.kit.oldPrice && line.kit.oldPrice > line.kit.price) {
        out.push(
          `   Выгода набора: ${money(line.kit.price)} вместо ${money(line.kit.oldPrice)} за сутки при аренде по отдельности.`,
        )
      }
    }
  })

  out.push('', `Сумма позиций: ${money(input.gross)}`)
  if (input.promoDiscount > 0 || input.promoCode) {
    const terms =
      input.promoDiscountType === 'percent'
        ? `${input.promoDiscountValue ?? 0}%`
        : input.promoDiscountType === 'fixed'
          ? money(input.promoDiscountValue ?? 0)
          : ''
    const min =
      input.promoMinOrderAmount && input.promoMinOrderAmount > 0
        ? `, действует от ${money(input.promoMinOrderAmount)}`
        : ''
    out.push(
      `Промокод: ${input.promoCode || 'не указан'}${terms ? ` (${terms}${min})` : ''} — скидка ${money(input.promoDiscount)}`,
    )
    if (input.promoDiscount > 0) {
      out.push('Цены позиций в этом заказе уже уменьшены пропорционально скидке.')
    }
  }
  out.push(`Итого к оплате: ${money(input.totalPrice)}`)

  return out.join('\n')
}
