import { getPayload } from 'payload'
import config from '@payload-config'
import type { OrderItem, Product } from '../../../payload-types'
import type { OrderStatus } from '../format'

// Ported from apps/cms/src/endpoints/admin/calendar.ts (docs/PLAN-next-
// migration.md Stage 3.5, page group 4) — same reasoning as
// lib/admin/data/{kpi,orders}.ts: the endpoint body minus its own req.user
// check, now covered once by (admin)/admin/layout.tsx's guard. The endpoint
// itself is untouched, still serving apps/web's REST-based admin.
const DAYS_TO_SHOW = 14
const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'confirmed']

function startOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

export interface AdminCalendarItem {
  id: number
  startDate: string
  endDate: string
  quantity: number
  orderId: number
  orderStatus: OrderStatus | null
}

export interface AdminCalendarProduct {
  id: number
  title: string
  items: AdminCalendarItem[]
}

export async function getAdminCalendar(): Promise<{ days: string[]; products: AdminCalendarProduct[] }> {
  const payload = await getPayload({ config })

  const today = startOfDay(new Date())
  const days = Array.from({ length: DAYS_TO_SHOW }, (_, i) => addDays(today, i).toISOString())
  const rangeEnd = addDays(today, DAYS_TO_SHOW)

  const [products, activeOrders] = await Promise.all([
    payload.find({ collection: 'products', where: { listingType: { equals: 'rental' } }, limit: 0, depth: 0 }),
    payload.find({ collection: 'orders', where: { status: { in: ACTIVE_STATUSES } }, limit: 0, depth: 0 }),
  ])

  const activeOrderIds = activeOrders.docs.map((o) => o.id)
  const orderStatusById = new Map(activeOrders.docs.map((o) => [o.id, o.status as OrderStatus]))

  const itemsInRange =
    activeOrderIds.length === 0
      ? { docs: [] as OrderItem[] }
      : await payload.find({
          collection: 'orderItems',
          where: {
            and: [
              { order: { in: activeOrderIds } },
              { listingType: { equals: 'rental' } },
              { startDate: { less_than: rangeEnd.toISOString() } },
              { endDate: { greater_than: today.toISOString() } },
            ],
          },
          limit: 0,
          depth: 1,
        })

  const itemsByProduct = new Map<number, OrderItem[]>()
  for (const item of itemsInRange.docs) {
    const productId = typeof item.product === 'object' ? item.product.id : item.product
    if (!itemsByProduct.has(productId)) itemsByProduct.set(productId, [])
    itemsByProduct.get(productId)!.push(item)
  }

  const productsWithBookings = products.docs.filter((p: Product) => itemsByProduct.has(p.id))
  const productsWithoutBookings = products.docs.filter((p: Product) => !itemsByProduct.has(p.id))
  const orderedProducts = [...productsWithBookings, ...productsWithoutBookings]

  const rows: AdminCalendarProduct[] = orderedProducts.map((product) => ({
    id: product.id,
    title: product.title,
    items: (itemsByProduct.get(product.id) || []).map((item) => {
      const orderId = typeof item.order === 'object' ? item.order.id : item.order
      return {
        id: item.id,
        startDate: item.startDate!,
        endDate: item.endDate!,
        quantity: item.quantity,
        orderId,
        orderStatus: orderStatusById.get(orderId) ?? null,
      }
    }),
  }))

  return { days, products: rows }
}
