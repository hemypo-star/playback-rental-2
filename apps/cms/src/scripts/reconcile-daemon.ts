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
import * as Sentry from '@sentry/nextjs'
import { getPayload } from 'payload'
import config from '@payload-config'
import '../sentry.server.config'
import { syncAll } from '../lib/moysklad/sync'

const INTERVAL_MS = (Number(process.env.MOYSKLAD_RECONCILE_INTERVAL_MIN) || 60) * 60 * 1000

async function runOnce(payload: Awaited<ReturnType<typeof getPayload>>) {
  const startedAt = Date.now()
  payload.logger.info('МойСклад reconciliation: starting full sync')
  try {
    const result = await syncAll(payload)
    payload.logger.info({ result, tookMs: Date.now() - startedAt }, 'МойСклад reconciliation: complete')
  } catch (err) {
    Sentry.captureException(err, { tags: { process: 'moysklad-reconcile' } })
    await Sentry.flush(2_000)
    payload.logger.error({ err, tookMs: Date.now() - startedAt }, 'МойСклад reconciliation: run failed, will retry next interval')
  }
}

async function main() {
  const payload = await getPayload({ config })
  payload.logger.info({ intervalMs: INTERVAL_MS }, 'МойСклад reconciliation daemon: started')

  // Run immediately on boot (covers "container was down/redeploying" gaps),
  // then on the fixed interval for as long as the process stays up.
  await runOnce(payload)
  setInterval(() => {
    void runOnce(payload)
  }, INTERVAL_MS)
}

main().catch(async (err) => {
  // Only reachable if getPayload() itself fails (bad DB connection, bad
  // config) — a real reason to let the container restart via its own
  // `restart: unless-stopped` policy rather than loop forever half-broken.
  Sentry.captureException(err, { tags: { process: 'moysklad-reconcile', phase: 'startup' } })
  await Sentry.flush(2_000)
  console.error('МойСклад reconciliation daemon failed to start:', err)
  process.exit(1)
})
