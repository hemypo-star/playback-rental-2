import type { AstroCookies } from 'astro'
import { cmsInternalUrl } from '../payload'

// Server-only (middleware + Astro frontmatter, never the browser) — reads
// the admin's session for SSR auth checks and data fetches.
//
// Cookie-forwarding doesn't work for this: Payload's cookie JWT extraction
// requires a matching Origin, or falls back to Sec-Fetch-Site, to defend
// against CSRF (see payload's auth/extractJWT.js) — neither header exists
// on a server-to-server fetch from this Node process. So instead we read
// the raw token out of the incoming request's `payload-token` cookie
// ourselves and forward it as `Authorization: JWT <token>`, which Payload's
// extractJWT accepts unconditionally (no Origin/CSRF check applies to the
// JWT strategy — that's the whole point of a bearer-style header).
export const ADMIN_COOKIE_NAME = 'payload-token'

export interface AdminUser {
  id: number
  email: string
}

// Exported for lib/admin/api.ts — pages already have the user via
// Astro.locals (set by middleware.ts), but the *token* isn't stashed there,
// so admin API calls re-read it from the cookie directly (cheap, no extra
// network round trip).
export function getAdminToken(cookies: AstroCookies): string | null {
  return cookies.get(ADMIN_COOKIE_NAME)?.value ?? null
}

export async function getAdminUser(cookies: AstroCookies): Promise<AdminUser | null> {
  const token = getAdminToken(cookies)
  if (!token) return null

  try {
    const res = await fetch(`${cmsInternalUrl()}/api/users/me`, {
      headers: { Authorization: `JWT ${token}` },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { user: AdminUser | null }
    return data.user ?? null
  } catch {
    return null
  }
}

export async function isAdminInitialized(): Promise<boolean> {
  try {
    const res = await fetch(`${cmsInternalUrl()}/api/users/init`)
    if (!res.ok) return true // fail closed: don't offer first-register on an error
    const data = (await res.json()) as { initialized: boolean }
    return data.initialized
  } catch {
    return true
  }
}
