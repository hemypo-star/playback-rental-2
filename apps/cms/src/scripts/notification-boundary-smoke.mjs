import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000'
const queueRoot = process.env.NOTIFICATION_QUEUE_DIR

if (!queueRoot) {
  console.error('NOTIFICATION_QUEUE_DIR is required')
  process.exit(1)
}

function url(pathname) {
  return new URL(pathname, baseUrl).toString()
}

async function main() {
  // The preceding browser checkout runs against this same server with direct
  // notifications enabled and no worker. That must have persisted one
  // order.created job without making any external delivery attempt.
  const contactResponse = await fetch(url('/api/contact-notification'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Smoke Contact',
      email: 'smoke-contact@example.invalid',
      phone: '+7 (900) 222-33-44',
      subject: 'Notification boundary smoke',
      message: 'This must stay in the local queue until a worker claims it.',
    }),
  })
  const contactBody = await contactResponse.json().catch(() => null)
  if (!contactResponse.ok || contactBody?.success !== true) {
    throw new Error(`Valid contact notification was not queued: HTTP ${contactResponse.status} ${JSON.stringify(contactBody)}`)
  }
  console.log('PASS valid contact event accepted into local queue')

  const pendingDir = path.join(queueRoot, 'pending')
  const filenames = (await readdir(pendingDir)).filter((name) => name.endsWith('.json'))
  const jobs = await Promise.all(
    filenames.map(async (name) => JSON.parse(await readFile(path.join(pendingDir, name), 'utf8'))),
  )

  if (jobs.length !== 2) {
    throw new Error(`Expected exactly two pending jobs (order + contact), found ${jobs.length}: ${filenames.join(', ')}`)
  }

  const orderJob = jobs.find((job) => job?.payload?.event === 'order.created')
  const contactJob = jobs.find((job) => job?.payload?.event === 'contact.created')
  if (!orderJob || orderJob.payload.email !== 'smoke-customer@example.invalid' || orderJob.payload.totalAmount !== 1350) {
    throw new Error(`Queued order event is missing or malformed: ${JSON.stringify(orderJob)}`)
  }
  if (!contactJob || contactJob.payload.email !== 'smoke-contact@example.invalid') {
    throw new Error(`Queued contact event is missing or malformed: ${JSON.stringify(contactJob)}`)
  }

  for (const job of jobs) {
    if (!Array.isArray(job.deliveries) || job.deliveries.length !== 0) {
      throw new Error(`Web process resolved channel recipients before worker claim: ${JSON.stringify(job.deliveries)}`)
    }
  }

  const serialized = JSON.stringify(jobs)
  const forbiddenSentinels = [
    'ci-telegram-secret-sentinel',
    'ci-max-secret-sentinel',
    'ci-vk-secret-sentinel',
    'ci-smtp-secret-sentinel',
    'ci-telegram-recipient-sentinel',
    'ci-max-recipient-sentinel',
    'ci-vk-recipient-sentinel',
    'ci-admin@example.invalid',
  ]
  const leaked = forbiddenSentinels.filter((value) => serialized.includes(value))
  if (leaked.length) {
    throw new Error(`Notification queue leaked worker-only credentials/recipients: ${leaked.join(', ')}`)
  }

  console.log('PASS order + contact jobs remain pending with no resolved deliveries')
  console.log('PASS queue files contain no worker credentials or destination identifiers')
  console.log('Notification boundary smoke passed')
}

main().catch((error) => {
  console.error('Notification boundary smoke failed')
  console.error(error)
  process.exit(1)
})
