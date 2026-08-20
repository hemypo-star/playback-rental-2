import { getPayload } from 'payload'
import config from '@payload-config'

// Admin-scoped user reads (docs/PLAN-next-migration.md Stage 3.5, page
// group 6) — matches apps/web's cmsFetch('/users?sort=email&limit=100&depth=0').
export interface AdminUserRow {
  id: number
  email: string
}

export async function getAdminUsers(): Promise<AdminUserRow[]> {
  const payload = await getPayload({ config })
  const result = await payload.find({ collection: 'users', sort: 'email', limit: 100, depth: 0 })
  return result.docs.map((u) => ({ id: u.id, email: u.email }))
}
