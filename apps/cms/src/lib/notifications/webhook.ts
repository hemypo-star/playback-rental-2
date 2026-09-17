// Compatibility facade for callers that historically posted to an external
// n8n webhook. Notifications are now persisted to the local VDS queue and a
// sibling worker delivers them directly to Telegram, MAX, SMTP and optional
// VK. Keeping these function names avoids coupling checkout/contact code to
// transport details.
import { enqueueNotification } from './queue'
import type { OrderNotificationItem } from './types'

interface NotificationResult {
  success: boolean
  error?: string
}

export type { OrderNotificationItem }

export async function sendOrderNotification(params: {
  orderId: number
  customerName: string
  customerEmail: string
  customerPhone: string
  items: OrderNotificationItem[]
  totalPrice: number
  promoCode?: string | null
  promoDiscount?: number
}): Promise<NotificationResult> {
  const result = await enqueueNotification({
    event: 'order.created',
    source: 'playback-rental',
    createdAt: new Date().toISOString(),
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
    promoCode: params.promoCode ?? null,
    promoDiscount: params.promoDiscount ?? 0,
  })
  return { success: result.success, error: result.error }
}

export async function sendContactNotification(params: {
  name: string
  email: string
  phone: string
  subject?: string
  message: string
}): Promise<NotificationResult> {
  const result = await enqueueNotification({
    event: 'contact.created',
    source: 'playback-rental',
    createdAt: new Date().toISOString(),
    name: params.name,
    email: params.email,
    phone: params.phone,
    subject: params.subject?.trim() || null,
    message: params.message,
  })
  return { success: result.success, error: result.error }
}
