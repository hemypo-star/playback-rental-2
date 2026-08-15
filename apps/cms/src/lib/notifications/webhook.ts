// Notifications go to a single external webhook (an n8n workflow the owner
// configures independently — this side only needs to post structured data,
// nothing here should assume a specific downstream channel). Replaces the
// old app's two separate, already-fragile paths it had accumulated on prod:
// a direct Telegram Bot API integration for orders, and a contact-form path
// that was outright broken (`sendContactNotification` always threw). Payload
// shape for order.created intentionally matches what the old app's
// `sendOrderWebhookDirect` (src/services/serverApi.ts on the prod branch)
// already sent, in case the same n8n workflow is being reused rather than
// rebuilt: { event, source, createdAt, orderId, name, email, phone, items[],
// totalAmount, currency }. contact.created has no old-app reference (that
// path never worked on prod) so its shape is new but follows the same
// event/source/createdAt envelope for consistency.

const WEBHOOK_URL = process.env.NOTIFICATION_WEBHOOK_URL

interface WebhookResult {
  success: boolean
  error?: string
}

async function postToWebhook(payload: Record<string, unknown>): Promise<WebhookResult> {
  if (!WEBHOOK_URL) return { success: false, error: 'NOTIFICATION_WEBHOOK_URL not configured' }
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ createdAt: new Date().toISOString(), ...payload }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { success: false, error: `HTTP ${res.status}: ${body}` }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export interface OrderNotificationItem {
  title: string
  quantity: number
  listingType: 'rental' | 'sale'
  startDate?: string | null
  endDate?: string | null
  lineTotal: number
}

export async function sendOrderNotification(params: {
  orderId: number
  customerName: string
  customerEmail: string
  customerPhone: string
  items: OrderNotificationItem[]
  totalPrice: number
}): Promise<WebhookResult> {
  return postToWebhook({
    event: 'order.created',
    source: 'playback-rental',
    orderId: params.orderId,
    name: params.customerName,
    email: params.customerEmail,
    phone: params.customerPhone,
    items: params.items.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      listingType: item.listingType,
      startDate: item.startDate ?? null,
      endDate: item.endDate ?? null,
      totalPrice: item.lineTotal,
    })),
    totalAmount: params.totalPrice,
    currency: 'RUB',
  })
}

export async function sendContactNotification(params: {
  name: string
  email: string
  phone: string
  subject?: string
  message: string
}): Promise<WebhookResult> {
  return postToWebhook({
    event: 'contact.created',
    source: 'playback-rental',
    name: params.name,
    email: params.email,
    phone: params.phone,
    subject: params.subject ?? null,
    message: params.message,
  })
}
