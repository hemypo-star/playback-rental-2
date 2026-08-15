import { cmsInternalUrl } from '../payload'

// Thin server-side client for the /api/admin/* endpoints (apps/cms/src/
// endpoints/admin/*.ts). Same Authorization: JWT pattern as session.ts —
// see that file for why cookie-forwarding doesn't work here.
async function adminFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${cmsInternalUrl()}/api/admin${path}`, {
    headers: { Authorization: `JWT ${token}` },
  })
  if (!res.ok) {
    throw new Error(`Admin API ${path} failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

// For reading Payload's own native collection REST endpoints server-side
// (Categories/Promotions/Products already have full CRUD via Payload
// itself — Step 6 doesn't need bespoke /api/admin/* endpoints for those,
// only the SSR auth header, same reasoning as adminFetch above). Mutations
// (create/update/delete) happen client-side instead, straight against
// /api/<collection>/... — same-origin browser fetches carry the session
// cookie natively, see the Step 5 dev log entry in CLAUDE.md for why that
// works there but not for this SSR path.
export async function cmsFetch<T>(path: string, token: string): Promise<T | null> {
  const res = await fetch(`${cmsInternalUrl()}/api${path}`, {
    headers: { Authorization: `JWT ${token}` },
  })
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`CMS API ${path} failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export interface AdminKpi {
  weeklyRevenue: number
  weeklyOrdersCount: number
  pendingCount: number
  utilization: number
  activeRentalQty: number
  totalRentalStock: number
  avgOrderValue: number
  submittedCount: number
}

export function getAdminKpi(token: string): Promise<AdminKpi> {
  return adminFetch<AdminKpi>('/kpi', token)
}

export type OrderStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export interface AdminOrderRow {
  id: number
  customerName: string
  customerEmail: string
  customerPhone: string
  itemsSummary: string
  itemCount: number
  dates: string | null // "<startISO>|<endISO>" or null
  totalPrice: number
  status: OrderStatus
  createdAt: string
}

export function getAdminOrders(token: string): Promise<{ orders: AdminOrderRow[] }> {
  return adminFetch('/orders', token)
}

export interface AdminOrderDetail {
  id: number
  customerName: string
  customerEmail: string
  customerPhone: string
  status: OrderStatus
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

export function getAdminOrderDetail(
  token: string,
  id: number,
): Promise<{ order: AdminOrderDetail; items: AdminOrderDetailItem[] }> {
  return adminFetch(`/orders/${id}`, token)
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

export function getAdminCalendar(token: string): Promise<{ days: string[]; products: AdminCalendarProduct[] }> {
  return adminFetch('/calendar', token)
}

export interface AdminStockRow {
  id: number
  title: string
  category: string | null
  quantity: number
  price: number
  listingType: 'rental' | 'sale'
  status: 'out' | 'low' | 'ok'
}

export function getAdminStock(token: string): Promise<{ products: AdminStockRow[] }> {
  return adminFetch('/stock', token)
}

export interface AdminClientRow {
  name: string
  email: string
  phone: string
  orderCount: number
  totalSpent: number
  lastOrderAt: string
}

export function getAdminClients(token: string): Promise<{ clients: AdminClientRow[] }> {
  return adminFetch('/clients', token)
}

export interface AdminAnalyticsRow {
  name: string
  revenue: number
}

export function getAdminAnalytics(token: string): Promise<{ rows: AdminAnalyticsRow[] }> {
  return adminFetch('/analytics', token)
}
