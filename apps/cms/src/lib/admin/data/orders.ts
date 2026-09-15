import { getPayload } from 'payload'
import type { Where } from 'payload'
import config from '@payload-config'
import type { OrderItem } from '../../../payload-types'

// Ported from apps/cms/src/endpoints/admin/{orders,orderDetail}.ts
// (docs/PLAN-next-migration.md Stage 3.3) — same reasoning as
// lib/admin/data/kpi.ts: endpoint bodies minus the req.user check, which
// the (admin)/admin/layout.tsx guard now covers once for every page under
// it. Both endpoints stay as-is for apps/web's REST-based admin.

// Pagination: uses a fixed PAGE_SIZE for all queries, whether filtered or
// unfiltered. Payload's find() method handles pagination via limit + page
// parameters and returns totalDocs/totalPages for rendering controls.
const PAGE_SIZE = 50

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

export interface AdminOrdersFilters {
  status?: AdminOrderRow['status']
  q?: string
  page?: number
}

export interface AdminOrdersResult {
  docs: AdminOrderRow[]
  totalDocs: number
  totalPages: number
}

export async function getAdminOrders(filters: AdminOrdersFilters = {}): Promise<AdminOrdersResult> {
  const payload = await getPayload({ config })

  const and: Where[] = []
  if (filters.status) and.push({ status: { equals: filters.status } })
  const q = filters.q?.trim()
  if (q) {
    // `contains` (not `like`): a plain case-insensitive substring match
    // (SQL ILIKE %q%) against the whole field value. `like` (used for
    // getProducts()'s title search in lib/data/products.ts) instead splits
    // the query on spaces and ANDs a LIKE %word% per word — built for
    // multi-word title search, wrong here since a partial phone number or
    // a first-name-only query isn't a set of independent "words" to match
    // separately.
    and.push({ or: [{ customerPhone: { contains: q } }, { customerName: { contains: q } }] })
  }

  const page = Math.max(1, filters.page || 1)

  const orders = await payload.find({
    collection: 'orders',
    where: and.length > 0 ? { and } : undefined,
    sort: '-createdAt',
    limit: PAGE_SIZE,
    page,
    depth: 0,
  })

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

  const docs = orders.docs.map((o) => {
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

  return {
    docs,
    totalDocs: orders.totalDocs,
    totalPages: orders.totalPages,
  }
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
