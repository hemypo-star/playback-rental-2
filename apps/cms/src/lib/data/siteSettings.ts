import { getPayload } from 'payload'
import config from '@payload-config'
import type { SiteSetting } from '../../payload-types'

// Server-only data layer (docs/PLAN-next-migration.md Stage 2 "Данные") —
// Local API instead of apps/web/src/lib/payload.ts's REST client. No
// `mutate()`/`{ doc, message }` unwrapping needed: that shape is a REST-only
// artifact, `payload.findGlobal()` returns the document directly.
export async function getSiteSettings(): Promise<SiteSetting> {
  const payload = await getPayload({ config })
  return payload.findGlobal({ slug: 'site-settings', depth: 1 })
}
