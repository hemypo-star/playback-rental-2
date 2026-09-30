import { getPayload } from 'payload'
import config from '@payload-config'

// Exit 0 when there are no products, non-zero otherwise. Used by
// scripts/start-hosted.sh to decide whether a hosted preview should seed
// itself on boot: seeding must be a one-time thing, or every restart would
// overwrite content edited through the admin.
async function main() {
  const payload = await getPayload({ config })
  const { totalDocs } = await payload.count({ collection: 'products', overrideAccess: true })
  console.log(`products: ${totalDocs}`)
  process.exit(totalDocs === 0 ? 0 : 1)
}

main().catch((error) => {
  // Refuse to claim "empty" when the question could not be answered — that
  // would seed over a database this failed to read.
  console.error('is-catalog-empty failed', error)
  process.exit(2)
})
