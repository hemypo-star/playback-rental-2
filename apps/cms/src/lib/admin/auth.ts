import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
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

// cache(): one payload.auth() per request, however many data loaders ask.
export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return null
  return { id: user.id, email: user.email }
})

// Every loader in lib/admin/data/ calls this before touching the Local API
// (which runs with overrideAccess). The admin layout's own check is NOT
// enough: on a client-side navigation Next renders only the changed page
// segment, not the layouts above it, so a crafted RSC request (RSC: 1 plus a
// Next-Router-State-Tree claiming the admin layout is already mounted) used
// to get page data with no session at all — customer contacts, orders and
// promo codes were readable anonymously that way.
export async function requireAdminSession(): Promise<AdminUser> {
  const user = await getAdminUser()
  if (!user) redirect('/admin/login')
  return user
}

export async function isAdminInitialized(): Promise<boolean> {
  const payload = await getPayload({ config })
  const result = await payload.find({ collection: 'users', limit: 1, depth: 0, overrideAccess: true })
  return result.totalDocs > 0
}
