import { MOYSKLAD_TIMEOUT_MS, msGet } from './client'
import { calculateRentalDays } from '../rental/pricing'

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

async function msPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(MOYSKLAD_TIMEOUT_MS),
  })
  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`МойСклад API error ${res.status} on POST ${path}: ${errBody}`)
  }
  return res.json() as Promise<T>
}

// МойСклад returns every created/fetched entity with at least these two
// fields — enough for what this module does with the response (link it
// into other entities' `assortment`/`agent` refs by href, store the id).
interface MsEntityRef {
  id: string
  meta: { href: string }
}

export interface OrderItemForPush {
  moySkladId: string // service id (rental) or product id (sale)
  listingType: 'rental' | 'sale'
  quantity: number
  unitPrice: number // RUB, per day for rental
  startDate?: string | null // rental only
  endDate?: string | null // rental only
}

/**
 * Finds an existing counterparty by phone, or creates one. Site customers
 * aren't pre-registered in МойСклад, so this is find-or-create by phone
 * (the one field we can reasonably expect to be a stable, unique-ish key
 * for a given customer across repeat orders).
 */
async function findOrCreateCounterparty(
  name: string,
  email: string,
  phone: string,
): Promise<{ id: string; href: string }> {
  // Only the LOOKUP uses a cleaned copy: in МойСклад's filter syntax `;`
  // starts another condition, so a crafted value could match (and attach
  // this order to) another business's counterparty in this shared account.
  // A real number ("+7 (900) 123-45-67", what the checkout mask produces) is
  // unchanged by this, so existing counterparties still match. The new
  // counterparty below gets the phone exactly as the customer typed it.
  const lookupPhone = phone.replace(/[^\d+()\- ]/g, '').trim()
  const existing = await msGet<{ rows: MsEntityRef[] }>(
    `/entity/counterparty?filter=${encodeURIComponent(`phone=${lookupPhone}`)}&limit=1`,
  )
  if (existing.rows.length > 0) {
    const c = existing.rows[0]
    return { id: c.id, href: c.meta.href }
  }

  const created = await msPost<MsEntityRef>('/entity/counterparty', {
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
  /** Site order id; becomes the customerorder's externalCode (see below). */
  orderId: number
  customerName: string
  customerEmail: string
  customerPhone: string
  // Free text for the order's comment field; see buildOrderDescription
  description?: string
  items: OrderItemForPush[]
}): Promise<{ id: string; href: string }> {
  if (params.items.length === 0) {
    throw new Error('No pushable positions: every line was a kit without resolvable components')
  }

  // Idempotency for retries (submitOrder.ts retryPendingMoySkladPushes): a
  // push can land in МойСклад and still fail here (timeout, dropped
  // response). Tag every order with its site id and look for it first, so a
  // retry returns the existing customerorder instead of creating a duplicate.
  const externalCode = `playback-site-${params.orderId}`
  const existing = await msGet<{ rows: MsEntityRef[] }>(
    `/entity/customerorder?filter=${encodeURIComponent(`externalCode=${externalCode}`)}&limit=1`,
  )
  if (existing.rows?.[0]) return { id: existing.rows[0].id, href: existing.rows[0].meta.href }

  const counterparty = await findOrCreateCounterparty(
    params.customerName,
    params.customerEmail,
    params.customerPhone,
  )

  const positions = params.items.map((item) => {
    // Rental services are priced per day in МойСклад too (unit of measure
    // "Сутки" on the assortment item) — quantity must be cart-quantity ×
    // rental days, or the pushed order undercounts a multi-day booking down
    // to a single day (caught via a live test push: a 2-day/100₽-per-day
    // rental landed in МойСклад as qty 1 × 100₽ instead of qty 2 × 100₽).
    const days =
      item.listingType === 'rental' && item.startDate && item.endDate
        ? calculateRentalDays(new Date(item.startDate), new Date(item.endDate))
        : 1
    const quantity = item.listingType === 'rental' ? item.quantity * days : item.quantity

    return {
      quantity,
      price: Math.round(item.unitPrice * 100), // МойСклад stores money in kopecks
      assortment: {
        meta: {
          href: `${BASE_URL}/entity/${item.listingType === 'rental' ? 'service' : 'product'}/${item.moySkladId}`,
          type: item.listingType === 'rental' ? 'service' : 'product',
          mediaType: 'application/json',
        },
      },
    }
  })

  const created = await msPost<MsEntityRef>('/entity/customerorder', {
    organization: {
      meta: {
        href: `${BASE_URL}/entity/organization/${PLAYBACK_RENTAL_ORG_ID}`,
        type: 'organization',
        mediaType: 'application/json',
      },
    },
    agent: { meta: { href: counterparty.href, type: 'counterparty', mediaType: 'application/json' } },
    externalCode,
    description: params.description || '',
    positions,
  })

  return { id: created.id, href: created.meta.href }
}
