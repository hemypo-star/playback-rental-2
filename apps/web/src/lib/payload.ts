import type {
  Category,
  Order,
  OrderItem,
  PayloadFindResult,
  Product,
  Promotion,
  RentalAvailability,
  SiteSettings,
} from '@playback-rental/shared-types'

// Server code (Astro frontmatter/SSR) and browser code (React islands) both
// call this same client, but they must resolve Payload differently:
//
// - Server (SSR): runs in the Node process, talks to Payload directly over
//   CMS_INTERNAL_URL (e.g. http://cms:3000 in Docker — a hostname that only
//   resolves on the internal network).
// - Browser: only sees PUBLIC_-prefixed env vars, and those get inlined into
//   the client bundle at *build* time — baking a Docker-internal hostname in
//   there would ship unreachable URLs. So the browser instead goes through
//   this app's own origin (relative fetch) and relies on middleware.ts to
//   reverse-proxy /api to Payload. PUBLIC_PAYLOAD_URL should stay '' unless
//   Payload is genuinely reachable at a different *public* origin.
//
// CMS_INTERNAL_URL is deliberately read via process.env, not
// import.meta.env: Vite/Astro statically inlines import.meta.env.* at
// *build* time for every var, PUBLIC_-prefixed or not — in Docker this
// value isn't known until the container starts (compose sets it per
// environment), so import.meta.env baked in whatever the build stage saw
// (nothing) permanently, and every server-side request then tried to reach
// http://localhost:3000 instead of http://cms:3000 — a real bug caught by
// actually running the built container, not just building it. `typeof
// process !== 'undefined'` guards against this file also being loaded in
// the browser bundle (React islands import mediaUrl/submitOrder/etc. from
// here too), where `process` doesn't exist at all.
// Exported for lib/admin/session.ts, which needs to reach the CMS directly
// (Authorization: JWT header, not a cookie — see that file) rather than
// through request()'s JSON-only helpers.
export function cmsInternalUrl(): string {
  const fromEnv = typeof process !== 'undefined' ? process.env.CMS_INTERNAL_URL : undefined
  return fromEnv || 'http://localhost:3000'
}
const PUBLIC_PAYLOAD_URL = import.meta.env.PUBLIC_PAYLOAD_URL ?? ''

function apiBase(): string {
  return typeof window === 'undefined' ? cmsInternalUrl() : PUBLIC_PAYLOAD_URL
}

export class PayloadApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message)
    this.name = 'PayloadApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => undefined)
    throw new PayloadApiError(
      (body as any)?.errors?.[0]?.message || (body as any)?.error || `Payload request failed: ${res.status}`,
      res.status,
      body,
    )
  }
  return res.json() as Promise<T>
}

// Payload's REST API wraps single-document create/update responses as
// { doc, message } (unlike GET, which returns the document directly) — this
// unwraps that so callers get the document itself, typed as T.
async function mutate<T>(path: string, init: RequestInit): Promise<T> {
  const result = await request<{ doc: T }>(path, init)
  return result.doc
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const usp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) usp.set(key, String(value))
  }
  const s = usp.toString()
  return s ? `?${s}` : ''
}

export function mediaUrl(media: { url: string } | number | null | undefined): string | undefined {
  if (!media || typeof media === 'number') return undefined
  // Unlike request()/apiBase() above, this value is embedded straight into
  // HTML (<img src>) that the *browser* renders regardless of whether
  // mediaUrl() ran during SSR or in a client component — so it must always
  // be browser-resolvable. media.url from Payload is already relative
  // (/api/media/file/...), which middleware.ts proxies same-origin; an
  // absolute url (e.g. an external storage adapter) is used as-is. Never
  // prepend CMS_INTERNAL_URL here, or Docker builds would ship <img>
  // tags pointing at a hostname the browser can't resolve.
  return media.url
}

// ---- Categories ----

export async function getCategories(): Promise<Category[]> {
  const result = await request<PayloadFindResult<Category>>(
    `/api/categories${qs({ sort: 'order', limit: 100, depth: 1 })}`,
  )
  return result.docs
}

export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  const result = await request<PayloadFindResult<Category>>(
    `/api/categories${qs({ 'where[slug][equals]': slug, limit: 1, depth: 1 })}`,
  )
  return result.docs[0]
}

// ---- Products ----

export interface GetProductsParams {
  categorySlug?: string
  categoryId?: number
  search?: string
  isKit?: boolean
  limit?: number
  page?: number
  sort?: string
}

export async function getProducts(params: GetProductsParams = {}): Promise<PayloadFindResult<Product>> {
  const where: Record<string, string> = {
    'where[available][equals]': 'true',
  }
  if (params.categoryId) where['where[category][equals]'] = String(params.categoryId)
  if (params.search) where['where[title][like]'] = params.search
  if (params.isKit !== undefined) where['where[isKit][equals]'] = String(params.isKit)

  return request<PayloadFindResult<Product>>(
    `/api/products${qs({
      ...where,
      limit: params.limit ?? 100,
      page: params.page ?? 1,
      sort: params.sort ?? '-lastSyncedAt',
      depth: 1,
    })}`,
  )
}

export async function getProductById(id: number): Promise<Product> {
  return request<Product>(`/api/products/${id}${qs({ depth: 1 })}`)
}

// ---- Promotions ----

export async function getActivePromotions(): Promise<Promotion[]> {
  const result = await request<PayloadFindResult<Promotion>>(
    `/api/promotions${qs({ 'where[active][equals]': 'true', sort: 'order', limit: 20, depth: 1 })}`,
  )
  return result.docs
}

export async function getPromotionBySlug(slug: string): Promise<Promotion | undefined> {
  const result = await request<PayloadFindResult<Promotion>>(
    `/api/promotions${qs({ 'where[slug][equals]': slug, 'where[active][equals]': 'true', limit: 1, depth: 2 })}`,
  )
  return result.docs[0]
}

// ---- Site settings (global) ----

export async function getSiteSettings(): Promise<SiteSettings> {
  return request<SiteSettings>(`/api/globals/site-settings${qs({ depth: 1 })}`)
}

// ---- Availability ----

export async function getRentalAvailability(
  productId: number,
  start?: Date,
  end?: Date,
): Promise<RentalAvailability> {
  return request<RentalAvailability>(
    `/api/rental-availability${qs({
      productId,
      start: start?.toISOString(),
      end: end?.toISOString(),
    })}`,
  )
}

export async function getRentalAvailabilityBulk(
  productIds: number[],
  start?: Date,
  end?: Date,
): Promise<Record<number, number>> {
  if (productIds.length === 0) return {}
  const result = await request<{ available: Record<number, number> }>(
    `/api/rental-availability-bulk${qs({
      productIds: productIds.join(','),
      start: start?.toISOString(),
      end: end?.toISOString(),
    })}`,
  )
  return result.available
}

// ---- Orders / cart ----

export async function createOrder(data: {
  customerName: string
  customerEmail: string
  customerPhone: string
  notes?: string
}): Promise<Order> {
  return mutate<Order>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateOrder(id: number, data: Partial<Pick<Order, 'customerName' | 'customerEmail' | 'customerPhone' | 'notes'>>): Promise<Order> {
  return mutate<Order>(`/api/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function createOrderItem(data: {
  order: number
  product: number
  quantity: number
  startDate?: string
  endDate?: string
}): Promise<OrderItem> {
  return mutate<OrderItem>('/api/orderItems', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateOrderItem(
  id: number,
  data: Partial<{ quantity: number; startDate: string; endDate: string }>,
): Promise<OrderItem> {
  return mutate<OrderItem>(`/api/orderItems/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteOrderItem(id: number): Promise<void> {
  await request(`/api/orderItems/${id}`, { method: 'DELETE' })
}

// ---- Contact form ----

export async function sendContactNotification(data: {
  name: string
  email: string
  phone: string
  subject?: string
  message: string
}): Promise<{ success: boolean }> {
  return request('/api/contact-notification', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function submitOrder(orderId: number, submitToken: string): Promise<{
  success: boolean
  moySkladOrderId: string | null
  moySkladError: string | null
  notificationSent: boolean
}> {
  return request(`/api/orders/${orderId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ submitToken }),
  })
}
