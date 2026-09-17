import { readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { sendNotificationDelivery } from '../lib/notifications/channels'
import {
  buildNotificationDeliveries,
  ensureNotificationQueue,
  notificationQueueRoot,
} from '../lib/notifications/queue'
import type { NotificationJob } from '../lib/notifications/types'

const root = notificationQueueRoot()
const retryMax = Math.max(1, Number(process.env.NOTIFICATION_RETRY_MAX || 5))
const retryBaseMs = Math.max(1000, Number(process.env.NOTIFICATION_RETRY_BASE_MS || 5000))
const pollMs = Math.max(500, Number(process.env.NOTIFICATION_POLL_MS || 2000))
const retentionDays = Math.max(0, Number(process.env.NOTIFICATION_RETENTION_DAYS || 30))
const cleanupIntervalMs = 60 * 60 * 1000
let lastCleanupAt = 0
let stopping = false

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function retryDelay(attempts: number): number {
  return Math.min(5 * 60_000, retryBaseMs * 2 ** Math.max(0, attempts - 1))
}

async function atomicWrite(filename: string, job: NotificationJob): Promise<void> {
  const temporary = `${filename}.tmp`
  await writeFile(temporary, JSON.stringify(job, null, 2), 'utf8')
  await rename(temporary, filename)
}

async function recoverProcessing(): Promise<void> {
  const processing = path.join(root, 'processing')
  const pending = path.join(root, 'pending')
  for (const name of await readdir(processing)) {
    if (!name.endsWith('.json')) continue
    try {
      await rename(path.join(processing, name), path.join(pending, name))
    } catch (error) {
      console.error('notifications: failed to recover processing job', name, error)
    }
  }
}

async function cleanupCompletedJobs(): Promise<void> {
  if (retentionDays <= 0) return
  const now = Date.now()
  if (now - lastCleanupAt < cleanupIntervalMs) return
  lastCleanupAt = now
  const cutoff = now - retentionDays * 24 * 60 * 60 * 1000

  for (const folder of ['sent', 'failed'] as const) {
    const directory = path.join(root, folder)
    for (const name of await readdir(directory)) {
      if (!name.endsWith('.json')) continue
      const createdAt = Number(name.split('-', 1)[0])
      if (!Number.isFinite(createdAt) || createdAt >= cutoff) continue
      try {
        await unlink(path.join(directory, name))
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.error(`notifications: failed to purge old ${folder} job`, error)
        }
      }
    }
  }
}

async function processJob(name: string): Promise<void> {
  const pendingPath = path.join(root, 'pending', name)
  const processingPath = path.join(root, 'processing', name)

  try {
    await rename(pendingPath, processingPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
    throw error
  }

  let job: NotificationJob
  try {
    job = JSON.parse(await readFile(processingPath, 'utf8')) as NotificationJob
    if (job.version !== 1 || !job.id || !Array.isArray(job.deliveries)) throw new Error('Unsupported notification job')
  } catch (error) {
    console.error('notifications: invalid queue job', name, error)
    await rename(processingPath, path.join(root, 'failed', name))
    return
  }

  // The web container deliberately receives no Telegram/MAX/VK/SMTP
  // credentials. Resolve recipients exactly once here, in the worker that
  // owns those secrets, then persist the plan so successful recipients are
  // never repeated just because another channel needs a retry.
  if (job.deliveries.length === 0) {
    job.deliveries = buildNotificationDeliveries(job.payload)
    if (job.deliveries.length === 0) {
      console.error(`notifications: job ${job.id} has no configured delivery channels; moving to failed`)
      await atomicWrite(processingPath, job)
      await rename(processingPath, path.join(root, 'failed', name))
      return
    }
  }

  const now = Date.now()
  for (const delivery of job.deliveries) {
    if (stopping || delivery.status !== 'pending') continue
    if (delivery.nextAttemptAt && Date.parse(delivery.nextAttemptAt) > now) continue

    try {
      await sendNotificationDelivery(job.id, job.payload, delivery)
      delivery.status = 'sent'
      delivery.lastError = undefined
      delivery.nextAttemptAt = undefined
      console.info(`notifications: job ${job.id} sent via ${delivery.kind}`)
    } catch (error) {
      delivery.attempts += 1
      delivery.lastError = error instanceof Error ? error.message : 'Unknown delivery error'
      if (delivery.attempts >= retryMax) {
        delivery.status = 'failed'
        delivery.nextAttemptAt = undefined
        console.error(`notifications: job ${job.id} permanently failed via ${delivery.kind}: ${delivery.lastError}`)
      } else {
        delivery.nextAttemptAt = new Date(Date.now() + retryDelay(delivery.attempts)).toISOString()
        console.warn(
          `notifications: job ${job.id} retry ${delivery.attempts}/${retryMax} via ${delivery.kind}: ${delivery.lastError}`,
        )
      }
    }
  }

  await atomicWrite(processingPath, job)

  const hasPending = job.deliveries.some((delivery) => delivery.status === 'pending')
  const hasFailed = job.deliveries.some((delivery) => delivery.status === 'failed')
  const destination = hasPending ? 'pending' : hasFailed ? 'failed' : 'sent'
  await rename(processingPath, path.join(root, destination, name))
}

async function runPass(): Promise<void> {
  await cleanupCompletedJobs()
  const names = (await readdir(path.join(root, 'pending'))).filter((name) => name.endsWith('.json')).sort()
  for (const name of names) {
    if (stopping) break
    await processJob(name)
  }
}

async function main(): Promise<void> {
  await ensureNotificationQueue(root)
  await recoverProcessing()
  console.info(`notifications: worker started; queue=${root}`)

  while (!stopping) {
    try {
      await runPass()
    } catch (error) {
      console.error('notifications: queue pass failed', error)
    }
    if (!stopping) await sleep(pollMs)
  }
  console.info('notifications: worker stopped')
}

process.on('SIGTERM', () => {
  stopping = true
})
process.on('SIGINT', () => {
  stopping = true
})

main().catch((error) => {
  console.error('notifications: worker failed to start', error)
  process.exit(1)
})
