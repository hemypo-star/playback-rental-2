// Manually-triggerable МойСклад sync, for Phase 1 build/verification.
// Usage: pnpm --filter cms sync:moysklad -- --limit 15
import { getPayload } from 'payload'
import config from '@payload-config'
import { syncAll } from '../lib/moysklad/sync'

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith('--limit'))
  const limit = limitArg ? parseInt(limitArg.split('=')[1] || process.argv[process.argv.indexOf(limitArg) + 1], 10) : undefined

  const payload = await getPayload({ config })

  console.log(`Starting МойСклад sync${limit ? ` (limit: ${limit} products)` : ' (full)'}...`)
  const result = await syncAll(payload, { limit })
  console.log('Sync complete:', JSON.stringify(result, null, 2))

  process.exit(0)
}

main().catch((err) => {
  console.error('Sync failed:', err)
  if (err?.data?.errors) {
    console.error('Validation details:', JSON.stringify(err.data.errors, null, 2))
  }
  process.exit(1)
})
