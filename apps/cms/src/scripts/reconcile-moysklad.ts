// One-shot reconciliation run — a safety net for any missed webhook (network
// blips, a webhook that never got registered after a redeploy, etc). Just
// runs the same full sync as sync-moysklad.ts; kept as a separate script/
// npm command so the *intent* (reconciliation vs. manual trigger) is clear
// in logs, even though the underlying work is identical.
//
// The actual schedule lives in reconcile-daemon.ts (a long-running process,
// run automatically as its own `reconcile` service in compose.yaml) — this
// script is for a manual one-off run, e.g. `docker compose run --rm
// reconcile-moysklad` right after fixing something, without waiting for the
// daemon's next interval.
import { getPayload } from 'payload'
import config from '@payload-config'
import { syncAll } from '../lib/moysklad/sync'

async function main() {
  const payload = await getPayload({ config })
  const startedAt = Date.now()
  payload.logger.info('МойСклад reconciliation: starting full sync')

  const result = await syncAll(payload)

  payload.logger.info(
    { result, tookMs: Date.now() - startedAt },
    'МойСклад reconciliation: complete',
  )
  process.exit(0)
}

main().catch((err) => {
  console.error('МойСклад reconciliation failed:', err)
  process.exit(1)
})
