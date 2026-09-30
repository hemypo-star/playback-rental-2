import { getPayload } from 'payload'
import config from '@payload-config'
import type { Media } from '../../../payload-types'

// Admin-scoped media reads (docs/PLAN-next-migration.md Stage 3.5, page
// group 6) — matches apps/web's cmsFetch('/media?sort=-createdAt&limit=
// ...&page=...&depth=0').
const PER_PAGE = 60

export async function getAdminMedia(page: number): Promise<{ docs: Media[]; totalDocs: number; totalPages: number }> {
  const payload = await getPayload({ config })
  const result = await payload.find({ collection: 'media', sort: '-createdAt', limit: PER_PAGE, page, depth: 0 })
  return { docs: result.docs, totalDocs: result.totalDocs, totalPages: result.totalPages }
}
