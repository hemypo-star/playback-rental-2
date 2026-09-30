export interface OrderNotificationItem {
  title: string
  quantity: number
  listingType: 'rental' | 'sale'
  startDate?: string | null
  endDate?: string | null
  lineTotal: number
}

export interface OrderNotificationPayload {
  event: 'order.created'
  source: 'playback-rental'
  createdAt: string
  orderId: number
  name: string
  email: string
  phone: string
  items: Array<{
    title: string
    quantity: number
    listingType: 'rental' | 'sale'
    startDate: string | null
    endDate: string | null
    totalPrice: number
  }>
  totalAmount: number
  currency: 'RUB'
  promoCode: string | null
  promoDiscount: number
}

export interface ContactNotificationPayload {
  event: 'contact.created'
  source: 'playback-rental'
  createdAt: string
  name: string
  email: string
  phone: string
  subject: string | null
  message: string
}

export type NotificationPayload = OrderNotificationPayload | ContactNotificationPayload

export type NotificationDeliveryKind = 'telegram' | 'max' | 'vk' | 'email-admin' | 'email-client'
export type NotificationDeliveryStatus = 'pending' | 'sent' | 'failed'

export interface NotificationDelivery {
  id: string
  kind: NotificationDeliveryKind
  recipient: string
  status: NotificationDeliveryStatus
  attempts: number
  nextAttemptAt?: string
  lastError?: string
}

export interface NotificationJob {
  version: 1
  id: string
  createdAt: string
  payload: NotificationPayload
  deliveries: NotificationDelivery[]
}
