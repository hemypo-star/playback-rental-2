import { getPayload } from 'payload'
import config from '@payload-config'
import type { OrderItem } from '../../../payload-types'

// Ported from apps/cms/src/endpoints/admin/{orders,orderDetail}.ts
// (docs/PLAN-next-migration.md Stage 3.3) — same reasoning as
// lib/admin/data/kpi.ts: endpoint bodies minus the req.user check, which
// the (admin)/admin/layout.tsx guard now covers once for every page under
// it. Both endpoints stay as-is for apps/web's REST-based admin.

// Step 4 scope carried over verbatim: most-recent orders only, no
// search/filter — that's a later admin page group if ever needed.
const RECENT_LIMIT = 50

export interface AdminOrderRow {
  id: number
  customerName: string
  customerEmail: string
  customerPhone: string
  itemsSummary: string
  itemCount: number
  dates: string | null // "<startISO>|<endISO>" or null
  totalPrice: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  createdAt: string
}

export async function getAdminOrders(): Promise<AdminOrderRow[]> {
  const payload = await getPayload({ config })

  const orders = await payload.find({ collection: 'orders', sort: '-createdAt', limit: RECENT_LIMIT, depth: 0 })

  const orderIds = orders.docs.map((o) => o.id)
  const items =
    orderIds.length === 0
      ? { docs: [] as OrderItem[] }
      : await payload.find({ collection: 'orderItems', where: { order: { in: orderIds } }, limit: 0, depth: 1 })

  const itemsByOrder = new Map<number, OrderItem[]>()
  for (const item of items.docs) {
    const orderId = typeof item.order === 'object' ? item.order.id : item.order
    if (!itemsByOrder.has(orderId)) itemsByOrder.set(orderId, [])
    itemsByOrder.get(orderId)!.push(item)
  }

  return orders.docs.map((o) => {
    const orderItems = itemsByOrder.get(o.id) || []
    const itemsSummary = orderItems
      .map((item) => `${typeof item.product === 'object' ? item.product?.title : '—'} ×${item.quantity}`)
      .join(', ')

    const rentalItems = orderItems.filter(
      (item): item is OrderItem & { startDate: string; endDate: string } =>
        item.listingType === 'rental' && Boolean(item.startDate) && Boolean(item.endDate),
    )
    let dates: string | null = null
    if (rentalItems.length > 0) {
      const start = rentalItems.reduce((min, i) => (i.startDate < min ? i.startDate : min), rentalItems[0].startDate)
      const end = rentalItems.reduce((max, i) => (i.endDate > max ? i.endDate : max), rentalItems[0].endDate)
      dates = `${start}|${end}`
    }

    return {
      id: o.id,
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      customerPhone: o.customerPhone,
      itemsSummary: itemsSummary || '—',
      itemCount: orderItems.length,
      dates,
      totalPrice: o.totalPrice ?? 0,
      status: o.status,
      createdAt: o.createdAt,
    }
  })
}

export interface AdminOrderDetail {
  id: number
  customerName: string
  customerEmail: string
  customerPhone: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  totalPrice: number
  notes: string | null
  moySkladOrderId: string | null
  submittedAt: string | null
  createdAt: string
}

export interface AdminOrderDetailItem {
  id: number
  product: { id: number; title: string }
  listingType: 'rental' | 'sale'
  quantity: number
  startDate: string | null
  endDate: string | null
  lineTotal: number
}

export async function getAdminOrderDetail(orderId: number): Promise<{ order: AdminOrderDetail; items: AdminOrderDetailItem[] } | null> {
  const payload = await getPayload({ config })

  const order = await payload.findByID({ collection: 'orders', id: orderId, depth: 0, disableErrors: true })
  if (!order) return null

  const itemsResult = await payload.find({ collection: 'orderItems', where: { order: { equals: orderId } }, sort: 'id', limit: 0, depth: 1 })

  return {
    order: {
      id: order.id,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      status: order.status,
      totalPrice: order.totalPrice ?? 0,
      notes: order.notes ?? null,
      moySkladOrderId: order.moySkladOrderId ?? null,
      submittedAt: order.submittedAt ?? null,
      createdAt: order.createdAt,
    },
    items: itemsResult.docs.map((item) => ({
      id: item.id,
      product: {
        id: typeof item.product === 'object' ? item.product.id : item.product,
        title: typeof item.product === 'object' ? item.product.title : '—',
      },
      listingType: item.listingType ?? 'rental',
      quantity: item.quantity,
      startDate: item.startDate ?? null,
      endDate: item.endDate ?? null,
      lineTotal: item.lineTotal ?? 0,
    })),
  }
}
