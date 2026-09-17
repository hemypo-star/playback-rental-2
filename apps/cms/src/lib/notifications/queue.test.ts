import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { buildNotificationDeliveries, enqueueNotification } from './queue'
import type { OrderNotificationPayload } from './types'

const payload: OrderNotificationPayload = {
  event: 'order.created',
  source: 'playback-rental',
  createdAt: '2026-09-17T03:00:00.000Z',
  orderId: 7,
  name: 'Тест',
  email: 'client@example.com',
  phone: '+7 900 000-00-00',
  items: [],
  totalAmount: 1000,
  currency: 'RUB',
  promoCode: null,
  promoDiscount: 0,
}

test('delivery plan enables only configured channels', () => {
  const env: NodeJS.ProcessEnv = {
    TELEGRAM_BOT_TOKEN: 'secret-token',
    TELEGRAM_CHAT_IDS: '10, 20',
    MAX_BOT_TOKEN: 'max-secret',
    MAX_USER_IDS: '30',
    VK_ACCESS_TOKEN: 'vk-secret',
    VK_PEER_IDS: '40',
    SMTP_HOST: 'smtp.example.com',
    SMTP_FROM: 'info@example.com',
    SMTP_ADMIN_TO: 'admin@example.com',
  }
  const deliveries = buildNotificationDeliveries(payload, env)
  assert.deepEqual(
    deliveries.map((delivery) => [delivery.kind, delivery.recipient]),
    [
      ['telegram', '10'],
      ['telegram', '20'],
      ['max', '30'],
      ['vk', '40'],
      ['email-admin', 'admin@example.com'],
      ['email-client', 'client@example.com'],
    ],
  )
})

test('enqueue persists a durable job without channel secrets', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'playback-notifications-'))
  const env: NodeJS.ProcessEnv = {
    NOTIFICATION_QUEUE_DIR: root,
    TELEGRAM_BOT_TOKEN: 'must-not-be-written',
    TELEGRAM_CHAT_IDS: '123',
  }

  try {
    const result = await enqueueNotification(payload, env)
    assert.equal(result.success, true)
    const files = await readdir(path.join(root, 'pending'))
    assert.equal(files.length, 1)
    const stored = await readFile(path.join(root, 'pending', files[0]), 'utf8')
    assert.ok(!stored.includes('must-not-be-written'))
    assert.match(stored, /"orderId": 7/)
    assert.match(stored, /"recipient": "123"/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('enqueue reports disabled notifications instead of creating an empty job', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'playback-notifications-empty-'))
  try {
    const result = await enqueueNotification(payload, { NOTIFICATION_QUEUE_DIR: root })
    assert.equal(result.success, false)
    assert.match(result.error || '', /No notification channels configured/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
