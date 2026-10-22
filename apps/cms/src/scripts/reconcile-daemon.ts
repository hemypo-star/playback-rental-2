// Actually schedules the reconciliation sync — reconcile-moysklad.ts (the
// one-shot script) never got wired to anything that re-runs it, so the only
// safety net against a missed/failed webhook was a human remembering to run
// `pnpm reconcile:moysklad` by hand. This is a long-running process instead
// of a cron entry: the 2.0 stack is plain `docker compose` (see compose.yaml)
// with no cron/PM2 layer in it, and everything else in this deployment is
// already a normal always-on service under `restart: unless-stopped` — a
// self-scheduling daemon fits that shape without adding a scheduler
// container (which would otherwise need Docker-socket access just to invoke
// `docker compose run`).
//
// One run failing (network blip, a single bad item aborting syncProducts —
// see sync.ts) must not kill the daemon itself, since that would silently
// turn "safety net" back into "nothing" until someone notices the container
// exited. Each run is caught independently; only a failure to even start
// Payload is fatal.
import { writeFile } from 'node:fs/promises'
import { getPayload } from 'payload'
import config from '@payload-config'
import '../sentry.server.config'
import { captureError, flushErrors } from '../lib/monitoring/serverErrors'
import { SyncAlreadyRunningError, syncAll } from '../lib/moysklad/sync'
import { retryPendingMoySkladPushes } from '../lib/rental/submitOrder'

const INTERVAL_MS = (Number(process.env.MOYSKLAD_RECONCILE_INTERVAL_MIN) || 60) * 60 * 1000
// Resending order pushes that failed at checkout is cheap (usually nothing to
// do) and time-sensitive, so it runs far more often than the full sync.
const PUSH_RETRY_INTERVAL_MS = (Number(process.env.MOYSKLAD_PUSH_RETRY_INTERVAL_MIN) || 10) * 60 * 1000

async function retryPushes(payload: Awaited<ReturnType<typeof getPayload>>) {
  try {
    const result = await retryPendingMoySkladPushes(payload)
    if (result.attempted > 0) payload.logger.info({ result }, 'МойСклад: order push retry pass')
  } catch (err) {
    captureError(err, { process: 'moysklad-push-retry' })
    payload.logger.error({ err }, 'МойСклад: order push retry pass failed')
  }
}

async function runOnce(payload: Awaited<ReturnType<typeof getPayload>>) {
  const startedAt = Date.now()
  payload.logger.info('МойСклад reconciliation: starting full sync')
  try {
    const result = await syncAll(payload)
    payload.logger.info({ result, tookMs: Date.now() - startedAt }, 'МойСклад reconciliation: complete')
  } catch (err) {
    if (err instanceof SyncAlreadyRunningError) {
      payload.logger.info('МойСклад reconciliation: another full sync is running, skipped this pass')
      return
    }
    captureError(err, { process: 'moysklad-reconcile' })
    await flushErrors()
    payload.logger.error({ err, tookMs: Date.now() - startedAt }, 'МойСклад reconciliation: run failed, will retry next interval')
  }
}

async function main() {
  const payload = await getPayload({ config })
  payload.logger.info({ intervalMs: INTERVAL_MS }, 'МойСклад reconciliation daemon: started')

  // Run immediately on boot (covers "container was down/redeploying" gaps),
  // then on the fixed interval for as long as the process stays up.
  // Each pass is skipped while the previous one of the same kind is still
  // running, so a slow МойСклад never stacks overlapping syncs.
  let syncRunning = false
  let retryRunning = false
  const syncPass = async () => {
    if (syncRunning) return
    syncRunning = true
    try {
      await runOnce(payload)
    } finally {
      syncRunning = false
    }
  }
  const retryPass = async () => {
    if (retryRunning) return
    retryRunning = true
    try {
      await retryPushes(payload)
    } finally {
      retryRunning = false
    }
  }

  // Order push retries start right away and do not wait for the first full
  // sync: a long or failing sync must not hold back orders that missed
  // МойСклад at checkout.
  void retryPass()
  setInterval(() => void retryPass(), PUSH_RETRY_INTERVAL_MS)
  void syncPass()
  setInterval(() => void syncPass(), INTERVAL_MS)

  // compose.yaml's healthcheck reads this file's age. A timer, not the sync
  // itself: a long full sync is normal, a dead event loop is not.
  const beat = () => void writeFile('/tmp/heartbeat', String(Date.now())).catch(() => {})
  beat()
  setInterval(beat, 60_000)

  const stop = (signal: string) => {
    payload.logger.info({ signal }, 'МойСклад reconciliation daemon: stopping')
    process.exit(0)
  }
  process.on('SIGTERM', () => stop('SIGTERM'))
  process.on('SIGINT', () => stop('SIGINT'))
}

// Anything that still escapes (it should not: both passes catch their own
// errors) is logged instead of killing the daemon.
process.on('unhandledRejection', (err) => {
  captureError(err, { process: 'moysklad-reconcile', phase: 'unhandled' })
  console.error('МойСклад reconciliation daemon: unhandled rejection', err)
})

main().catch(async (err) => {
  // Only reachable if getPayload() itself fails (bad DB connection, bad
  // config) — a real reason to let the container restart via its own
  // `restart: unless-stopped` policy rather than loop forever half-broken.
  captureError(err, { process: 'moysklad-reconcile', phase: 'startup' })
  await flushErrors()
  console.error('МойСклад reconciliation daemon failed to start:', err)
  process.exit(1)
})
