import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

// Replaces apps/web/src/lib/admin/session.ts entirely (docs/PLAN-next-
// migration.md Stage 3.1) — that file's whole reason to exist was that
// Payload's cookie-JWT strategy requires a matching Origin/Sec-Fetch-Site
// header (CSRF defense), which a server-to-server fetch across two
// processes never carries, forcing a manual cookie-read + `Authorization:
// JWT` re-forward. None of that applies here: this runs inside the same
// Next process as Payload itself, so `payload.auth()` reads the request's
// real cookies/headers directly, no token-forwarding hack needed.
export interface AdminUser {
  id: number
  email: string
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return null
  return { id: user.id, email: user.email }
}

export async function isAdminInitialized(): Promise<boolean> {
  const payload = await getPayload({ config })
  const result = await payload.find({ collection: 'users', limit: 1, depth: 0, overrideAccess: true })
  return result.totalDocs > 0
}
