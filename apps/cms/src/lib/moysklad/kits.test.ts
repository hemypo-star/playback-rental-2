import assert from 'node:assert/strict'
import test from 'node:test'
import { buildOrderDescription, expandKitLine, kitLabelKey } from './kits'

const REAL_A = '79e8782a-4686-11f0-0a80-11bc00051b6d'
const REAL_B = 'a7cd7cda-42c3-11f0-0a80-143100050775'

// 2026-10-10 10:00 -> 2026-10-12 10:00 Kemerovo = exactly 48h = 2 days
const START = '2026-10-10T03:00:00.000Z'
const END = '2026-10-12T03:00:00.000Z'

test('expandKitLine spreads the kit total over components by price', () => {
  const { items, resolved, unresolved } = expandKitLine({
    quantity: 1,
    lineTotal: 3000, // 2 days x 1500/day kit rate
    startDate: START,
    endDate: END,
    listingType: 'rental',
    components: [
      { label: 'A', moySkladId: REAL_A, listingType: 'rental', price: 1000 },
      { label: 'B', moySkladId: REAL_B, listingType: 'rental', price: 500 },
    ],
  })
  assert.deepEqual(resolved, ['A', 'B'])
  assert.deepEqual(unresolved, [])
  // position totals = unitPrice x quantity x 2 days must sum to the kit line total
  const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity * 2, 0)
  assert.ok(Math.abs(total - 3000) < 0.001)
  assert.equal(items[0].unitPrice * 2, 2000)
  assert.equal(items[1].unitPrice * 2, 1000)
})

test('expandKitLine multiplies by kit quantity and skips unresolvable components', () => {
  const { items, unresolved } = expandKitLine({
    quantity: 2,
    lineTotal: 6000,
    startDate: START,
    endDate: END,
    listingType: 'rental',
    components: [
      { label: 'A', moySkladId: REAL_A, listingType: 'rental', price: 700 },
      { label: 'ghost', moySkladId: null, listingType: 'rental', price: 0 },
      { label: 'nested', moySkladId: 'kit-123', listingType: 'rental', price: 10 },
    ],
  })
  assert.deepEqual(unresolved, ['ghost', 'nested'])
  assert.equal(items.length, 1)
  assert.equal(items[0].quantity, 2)
  // whole 6000 lands on the only resolvable component: 6000 / (2 units x 2 days)
  assert.equal(items[0].unitPrice, 1500)
})

test('expandKitLine falls back to equal split when prices are zero, and to nothing when no component resolves', () => {
  const equal = expandKitLine({
    quantity: 1,
    lineTotal: 1000,
    startDate: START,
    endDate: END,
    listingType: 'rental',
    components: [
      { label: 'A', moySkladId: REAL_A, listingType: 'rental', price: 0 },
      { label: 'B', moySkladId: REAL_B, listingType: 'rental', price: 0 },
    ],
  })
  assert.equal(equal.items[0].unitPrice, equal.items[1].unitPrice)

  const none = expandKitLine({
    quantity: 1,
    lineTotal: 1000,
    startDate: START,
    endDate: END,
    listingType: 'rental',
    components: [{ label: 'ghost', moySkladId: null, listingType: 'rental', price: 0 }],
  })
  assert.deepEqual(none.items, [])
  assert.deepEqual(none.unresolved, ['ghost'])
})

test('buildOrderDescription lists kit composition, promo terms and totals', () => {
  const text = buildOrderDescription({
    orderId: 7,
    customerNotes: 'Заберу в 10:00',
    gross: 3000,
    totalPrice: 2700,
    promoCode: 'SALE10',
    promoDiscountType: 'percent',
    promoDiscountValue: 10,
    promoMinOrderAmount: 2000,
    promoDiscount: 300,
    lines: [
      {
        title: 'Набор начинающий',
        quantity: 1,
        listingType: 'rental',
        lineTotal: 3000,
        startDate: START,
        endDate: END,
        kit: { resolved: ['A', 'B'], unresolved: ['ghost'], price: 1500, oldPrice: 1800 },
      },
    ],
  })
  assert.match(text, /Заказ с сайта №7/)
  assert.match(text, /Комментарий клиента: Заберу в 10:00/)
  assert.match(text, /Набор «Набор начинающий» ×1, аренда .* \(2 сут\.\)/)
  assert.match(text, /Состав набора: A; B/)
  assert.match(text, /нет в МойСклад.*ghost/)
  assert.match(text, /Выгода набора/)
  assert.match(text, /Промокод: SALE10 \(10%, действует от 2 000 ₽\) — скидка 300 ₽/)
  assert.match(text, /Итого к оплате: 2 700 ₽/)
})

test('buildOrderDescription stays minimal for a plain order without promo', () => {
  const text = buildOrderDescription({
    orderId: 3,
    gross: 500,
    totalPrice: 500,
    promoDiscount: 0,
    lines: [{ title: 'Интерком', quantity: 1, listingType: 'sale', lineTotal: 500 }],
  })
  assert.doesNotMatch(text, /Промокод/)
  assert.doesNotMatch(text, /Комментарий клиента/)
  assert.match(text, /Итого к оплате: 500 ₽/)
})

test('kitLabelKey matches a legacy "Аренда ..." label with the synced product title', () => {
  assert.equal(kitLabelKey('Аренда 7Artisans MRC Black mist 1/8 67mm'), kitLabelKey('7Artisans MRC Black mist 1/8 67mm'))
  assert.equal(kitLabelKey('  аренда   Apple Box  Set 4 in 1 '), kitLabelKey('Apple Box Set 4 in 1'))
  assert.notEqual(kitLabelKey('Аренда Canon G7X'), kitLabelKey('Canon G7X Mark III'))
})
