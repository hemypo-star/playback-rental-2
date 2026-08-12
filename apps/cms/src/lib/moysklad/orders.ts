import { msGet } from './client'

const BASE_URL = 'https://api.moysklad.ru/api/remap/1.2'
// The account is shared with unrelated businesses (Sneaker Base, Fixit,
// etc. — see the Phase 0/1 folder audit); orders must be filed under the
// "Playback Rental" organization specifically, not whichever is default.
const PLAYBACK_RENTAL_ORG_ID = '3b2aa547-3f88-11f0-0a80-0f17002ca55b'

function getToken(): string {
  const token = process.env.MOYSKLAD_API_TOKEN
  if (!token) throw new Error('MOYSKLAD_API_TOKEN is not set')
  return token
}

async function msPost<T = any>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`МойСклад API error ${res.status} on POST ${path}: ${errBody}`)
  }
  return res.json() as Promise<T>
}

async function msDelete(path: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}`, 'Accept-Encoding': 'gzip' },
  })
  if (!res.ok && res.status !== 404) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`МойСклад API error ${res.status} on DELETE ${path}: ${errBody}`)
  }
}

export interface OrderItemForPush {
  moySkladId: string // service id (rental) or product id (sale)
  listingType: 'rental' | 'sale'
  quantity: number
  unitPrice: number // RUB
}

/**
 * Finds an existing counterparty by phone, or creates one. Site customers
 * aren't pre-registered in МойСклад, so this is find-or-create by phone
 * (the one field we can reasonably expect to be a stable, unique-ish key
 * for a given customer across repeat orders).
 */
export async function findOrCreateCounterparty(
  name: string,
  email: string,
  phone: string,
): Promise<{ id: string; href: string }> {
  const existing = await msGet<{ rows: any[] }>(
    `/entity/counterparty?filter=${encodeURIComponent(`phone=${phone}`)}&limit=1`,
  )
  if (existing.rows.length > 0) {
    const c = existing.rows[0]
    return { id: c.id, href: c.meta.href }
  }

  const created = await msPost<any>('/entity/counterparty', {
    name,
    email,
    phone,
  })
  return { id: created.id, href: created.meta.href }
}

/**
 * Pushes a site order to МойСклад as a customerorder (заказ покупателя),
 * with one position per line item. Rental line items reference a *service*
 * entity, sale line items a *product* entity — same moySkladId field either
 * way, just a different assortment type, mirroring how the inbound sync
 * distinguishes them (see sync.ts).
 */
export async function pushOrderToMoySklad(params: {
  customerName: string
  customerEmail: string
  customerPhone: string
  notes?: string
  items: OrderItemForPush[]
}): Promise<{ id: string; href: string }> {
  const counterparty = await findOrCreateCounterparty(
    params.customerName,
    params.customerEmail,
    params.customerPhone,
  )

  const positions = params.items.map((item) => ({
    quantity: item.quantity,
    price: Math.round(item.unitPrice * 100), // МойСклад stores money in kopecks
    assortment: {
      meta: {
        href: `${BASE_URL}/entity/${item.listingType === 'rental' ? 'service' : 'product'}/${item.moySkladId}`,
        type: item.listingType === 'rental' ? 'service' : 'product',
        mediaType: 'application/json',
      },
    },
  }))

  const created = await msPost<any>('/entity/customerorder', {
    organization: {
      meta: {
        href: `${BASE_URL}/entity/organization/${PLAYBACK_RENTAL_ORG_ID}`,
        type: 'organization',
        mediaType: 'application/json',
      },
    },
    agent: { meta: { href: counterparty.href, type: 'counterparty', mediaType: 'application/json' } },
    description: params.notes || '',
    positions,
  })

  return { id: created.id, href: created.meta.href }
}

export async function deleteCustomerOrder(id: string): Promise<void> {
  await msDelete(`/entity/customerorder/${id}`)
}

export async function deleteCounterparty(id: string): Promise<void> {
  await msDelete(`/entity/counterparty/${id}`)
}
