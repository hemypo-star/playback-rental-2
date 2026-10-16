// Unit tests for shared kit/component stock (kitStock.ts). Run with `pnpm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  expandKitBookings,
  kitComposition,
  kitFreeQuantity,
  kitSaturatedRanges,
  mergeRanges,
  peakLoad,
  saturatedRanges,
  type Booking,
} from './kitStock'

const H = 3_600_000
const D = 24 * H
const mon = Date.UTC(2026, 10, 2, 3) // a Monday, 10:00 Kemerovo
const day = (n: number) => mon + n * D

const CAMERA = 1
const LENS = 2
const KIT = 10
const kits = new Map([[KIT, kitComposition([{ productId: CAMERA }, { productId: LENS }])]])

test('kitComposition counts repeated components and skips label-only rows', () => {
  const c = kitComposition([{ productId: 5 }, { productId: 5 }, { productId: null }, {}])
  assert.deepEqual([...c], [[5, 2]])
})

test('a kit booking also loads each of its components', () => {
  const load = expandKitBookings([{ productId: KIT, quantity: 2, start: day(0), end: day(1) }], kits)
  assert.equal(peakLoad(load, KIT, { start: day(0), end: day(1) }), 2)
  assert.equal(peakLoad(load, CAMERA, { start: day(0), end: day(1) }), 2)
  assert.equal(peakLoad(load, LENS, { start: day(0), end: day(1) }), 2)
})

test('peak load, not the sum: non-overlapping bookings share one unit', () => {
  const load: Booking[] = [
    { productId: CAMERA, quantity: 1, start: day(0), end: day(1) },
    { productId: CAMERA, quantity: 1, start: day(2), end: day(3) },
  ]
  assert.equal(peakLoad(load, CAMERA, { start: day(0), end: day(4) }), 1)
})

test('a return at the same instant as a pickup frees the unit', () => {
  const load: Booking[] = [
    { productId: CAMERA, quantity: 1, start: day(0), end: day(1) },
    { productId: CAMERA, quantity: 1, start: day(1), end: day(2) },
  ]
  assert.equal(peakLoad(load, CAMERA, { start: day(0), end: day(2) }), 1)
})

test('owner rule: kit and component book together while stock lasts', () => {
  // 2 cameras, 2 lenses, kit capacity 2; one kit and one bare camera booked.
  const load = expandKitBookings(
    [
      { productId: KIT, quantity: 1, start: day(0), end: day(2) },
      { productId: CAMERA, quantity: 1, start: day(0), end: day(2) },
    ],
    kits,
  )
  const window = { start: day(0), end: day(2) }
  const stock = new Map([
    [CAMERA, { quantity: 2, available: true }],
    [LENS, { quantity: 2, available: true }],
  ])
  // Both cameras are out (one bare, one in the kit): no second kit.
  assert.equal(
    kitFreeQuantity({ kitId: KIT, kit: { quantity: 2, available: true }, composition: kits.get(KIT)!, components: stock, load, window }),
    0,
  )
  // With three cameras the second kit fits.
  stock.set(CAMERA, { quantity: 3, available: true })
  assert.equal(
    kitFreeQuantity({ kitId: KIT, kit: { quantity: 2, available: true }, composition: kits.get(KIT)!, components: stock, load, window }),
    1,
  )
})

test('a switched-off component makes the kit unavailable', () => {
  const free = kitFreeQuantity({
    kitId: KIT,
    kit: { quantity: 3, available: true },
    composition: kits.get(KIT)!,
    components: new Map([
      [CAMERA, { quantity: 3, available: true }],
      [LENS, { quantity: 3, available: false }],
    ]),
    load: [],
  })
  assert.equal(free, 0)
})

test('a component listed twice needs two units per kit', () => {
  const composition = kitComposition([{ productId: LENS }, { productId: LENS }])
  const free = kitFreeQuantity({
    kitId: KIT,
    kit: { quantity: 5, available: true },
    composition,
    components: new Map([[LENS, { quantity: 3, available: true }]]),
    load: [],
  })
  assert.equal(free, 1)
})

test('saturatedRanges reports only stretches with no unit free', () => {
  const load: Booking[] = [
    { productId: CAMERA, quantity: 1, start: day(0), end: day(3) },
    { productId: CAMERA, quantity: 1, start: day(1), end: day(2) },
  ]
  assert.deepEqual(saturatedRanges(load, CAMERA, 2, 1), [{ start: day(1), end: day(2) }])
  assert.deepEqual(saturatedRanges(load, CAMERA, 3, 1), [])
})

test('kit calendar is busy when the kit itself or any component runs out', () => {
  const load = expandKitBookings([{ productId: CAMERA, quantity: 1, start: day(4), end: day(5) }], kits)
  const ranges = kitSaturatedRanges({
    kitId: KIT,
    kit: { quantity: 2, available: true },
    composition: kits.get(KIT)!,
    components: new Map([
      [CAMERA, { quantity: 1, available: true }],
      [LENS, { quantity: 2, available: true }],
    ]),
    load,
  })
  assert.deepEqual(ranges, [{ start: day(4), end: day(5) }])
})

test('mergeRanges joins overlapping and touching ranges', () => {
  assert.deepEqual(
    mergeRanges([
      { start: 5, end: 7 },
      { start: 1, end: 3 },
      { start: 3, end: 4 },
    ]),
    [
      { start: 1, end: 4 },
      { start: 5, end: 7 },
    ],
  )
})
