import { randomUUID } from 'node:crypto'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { NotificationDelivery, NotificationJob, NotificationPayload } from './types'

export interface NotificationQueueResult {
  success: boolean
  error?: string
  jobId?: string
}

function list(value: string | undefined): string[] {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function smtpEnabled(env: NodeJS.ProcessEnv): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_FROM)
}

export function buildNotificationDeliveries(
  payload: NotificationPayload,
  env: NodeJS.ProcessEnv = process.env,
): NotificationDelivery[] {
  const deliveries: NotificationDelivery[] = []
  const add = (kind: NotificationDelivery['kind'], recipient: string) => {
    deliveries.push({
      id: `${kind}:${recipient}`,
      kind,
      recipient,
      status: 'pending',
      attempts: 0,
    })
  }

  if (env.TELEGRAM_BOT_TOKEN) {
    for (const chatId of list(env.TELEGRAM_CHAT_IDS)) add('telegram', chatId)
  }
  if (env.MAX_BOT_TOKEN) {
    for (const userId of list(env.MAX_USER_IDS)) add('max', userId)
  }
  if (env.VK_ACCESS_TOKEN) {
    for (const peerId of list(env.VK_PEER_IDS)) add('vk', peerId)
  }
  if (smtpEnabled(env)) {
    for (const address of list(env.SMTP_ADMIN_TO)) add('email-admin', address)
    if (payload.event === 'order.created' && payload.email) add('email-client', payload.email)
  }

  return deliveries
}

export function notificationQueueRoot(env: NodeJS.ProcessEnv = process.env): string {
  return env.NOTIFICATION_QUEUE_DIR || path.resolve('.notification-queue')
}

export async function ensureNotificationQueue(root = notificationQueueRoot()): Promise<void> {
  await Promise.all(
    ['pending', 'processing', 'sent', 'failed'].map((name) => mkdir(path.join(root, name), { recursive: true })),
  )
}

export async function enqueueNotification(
  payload: NotificationPayload,
  env: NodeJS.ProcessEnv = process.env,
): Promise<NotificationQueueResult> {
  const deliveries = buildNotificationDeliveries(payload, env)
  if (deliveries.length === 0) {
    return { success: false, error: 'No notification channels configured' }
  }

  const root = notificationQueueRoot(env)
  await ensureNotificationQueue(root)

  const id = randomUUID()
  const job: NotificationJob = {
    version: 1,
    id,
    createdAt: new Date().toISOString(),
    payload,
    deliveries,
  }
  const filename = `${Date.now()}-${id}.json`
  const pending = path.join(root, 'pending', filename)
  const temporary = `${pending}.tmp`

  try {
    await writeFile(temporary, JSON.stringify(job, null, 2), { encoding: 'utf8', flag: 'wx' })
    await rename(temporary, pending)
    return { success: true, jobId: id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to persist notification job',
    }
  }
}
