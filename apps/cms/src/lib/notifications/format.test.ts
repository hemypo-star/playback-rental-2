import assert from 'node:assert/strict'
import test from 'node:test'
import { formatAdminEmail, formatAdminMessage, formatClientOrderEmail } from './format'
import type { ContactNotificationPayload, OrderNotificationPayload } from './types'

const order: OrderNotificationPayload = {
  event: 'order.created',
  source: 'playback-rental',
  createdAt: '2026-09-17T03:00:00.000Z',
  orderId: 42,
  name: 'Иван Иванов',
  email: 'client@example.com',
  phone: '+7 900 000-00-00',
  items: [
    {
      title: 'Камера <Test>',
      quantity: 2,
      listingType: 'rental',
      startDate: '2026-09-18T03:00:00.000Z',
      endDate: '2026-09-19T03:00:00.000Z',
      totalPrice: 3000,
    },
  ],
  totalAmount: 2700,
  currency: 'RUB',
  promoCode: 'TEST10',
  promoDiscount: 300,
}

const contact: ContactNotificationPayload = {
  event: 'contact.created',
  source: 'playback-rental',
  createdAt: '2026-09-17T03:00:00.000Z',
  name: 'Анна',
  email: 'anna@example.com',
  phone: '+7 999 111-22-33',
  subject: 'Вопрос',
  message: '<script>alert(1)</script>\nВторая строка',
}

test('order admin message includes customer, items, promo and net total', () => {
  const message = formatAdminMessage(order)
  assert.match(message, /#42/)
  assert.match(message, /Иван Иванов/)
  assert.match(message, /Камера <Test>/)
  assert.match(message, /TEST10/)
  assert.match(message, /2\s700 ₽/)
})

test('email HTML escapes user-controlled content', () => {
  const admin = formatAdminEmail(contact)
  assert.ok(admin.html.includes('&lt;script&gt;'))
  assert.ok(!admin.html.includes('<script>'))
})

test('customer email contains order number and contact promise', () => {
  const client = formatClientOrderEmail(order)
  assert.match(client.subject, /#42/)
  assert.match(client.html, /Менеджер свяжется/)
})
