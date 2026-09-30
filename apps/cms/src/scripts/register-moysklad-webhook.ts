// Registers (or re-registers) the МойСклад webhook subscription pointing
// at this app's /api/webhooks/moysklad endpoint. NOT run automatically —
// this needs a publicly reachable URL, so it only makes sense once deployed
// (or tunneled for a manual one-off test). Run once per environment/URL:
//
//   pnpm --filter cms register:moysklad-webhook -- https://your-deployed-domain.com
//
// Safe to re-run: deletes any existing webhook(s) pointing at the same
// target URL before creating a fresh one, so it won't accumulate duplicates.

const BASE_URL = 'https://api.moysklad.ru/api/remap/1.2'

async function main() {
  const targetOrigin = process.argv[2]
  if (!targetOrigin) {
    console.error('Usage: pnpm register:moysklad-webhook -- https://your-deployed-domain.com')
    process.exit(1)
  }

  const token = process.env.MOYSKLAD_API_TOKEN
  const secret = process.env.MOYSKLAD_WEBHOOK_SECRET
  if (!token) throw new Error('MOYSKLAD_API_TOKEN is not set')
  if (!secret) throw new Error('MOYSKLAD_WEBHOOK_SECRET is not set')

  const webhookUrl = `${targetOrigin.replace(/\/$/, '')}/api/webhooks/moysklad?secret=${secret}`
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  // Clean up any previous registration pointing at this same origin first.
  const existingRes = await fetch(`${BASE_URL}/entity/webhook`, { headers })
  const existing = await existingRes.json()
  for (const hook of existing.rows || []) {
    if (typeof hook.url === 'string' && hook.url.startsWith(targetOrigin)) {
      await fetch(`${BASE_URL}/entity/webhook/${hook.id}`, { method: 'DELETE', headers })
      console.log(`Removed stale webhook: ${hook.id} (${hook.entityType}/${hook.action})`)
    }
  }

  // One webhook per (entityType, action) pair we care about — updates and
  // creates for product, service, and productfolder (category renames etc).
  const subscriptions = [
    { entityType: 'product', action: 'UPDATE' },
    { entityType: 'product', action: 'CREATE' },
    { entityType: 'service', action: 'UPDATE' },
    { entityType: 'service', action: 'CREATE' },
    { entityType: 'productfolder', action: 'UPDATE' },
  ]

  for (const sub of subscriptions) {
    const res = await fetch(`${BASE_URL}/entity/webhook`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url: webhookUrl, ...sub }),
    })
    if (!res.ok) {
      console.error(`Failed to register ${sub.entityType}/${sub.action}:`, await res.text())
      continue
    }
    const doc = await res.json()
    console.log(`Registered: ${sub.entityType}/${sub.action} -> ${doc.id}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
