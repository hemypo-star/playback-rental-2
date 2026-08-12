// Periodic reconciliation — a safety net for any missed webhook (network
// blips, a webhook that never got registered after a redeploy, etc). Just
// runs the same full sync as sync-moysklad.ts; kept as a separate script/
// npm command so the *intent* (unattended scheduled run vs. manual trigger)
// is clear in process managers and logs, even though the underlying work
// is identical.
//
// Not wired into a scheduler yet — that's a Phase 3 (deployment) concern.
// On the target VPS (self-hosted + PM2, per the project plan), the natural
// fit is a PM2 app entry with `autorestart: false, cron_restart: '17 * * * *'`
// (hourly, off the :00 mark) rather than a separate OS crontab, to stay
// consistent with how the rest of this app's process management works.
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
