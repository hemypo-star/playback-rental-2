import type { MiddlewareHandler } from 'astro'
import { getAdminUser } from './lib/admin/session'

// The CMS proxy this middleware used to do (docs/PLAN-docker-admin.md Step 1)
// is gone as of docs/PLAN-next-migration.md Stage 1 — Next (apps/cms) is now
// the single public entry point and fallback-proxies to this app for
// whatever isn't ported yet, instead of the other way around (see
// apps/cms/src/proxy.ts). Payload is same-origin for the browser
// either way, so relative fetch('/api/...') calls elsewhere in this app
// keep working unchanged.
//
// The /admin session guard stays here — /admin/* pages still live in this
// app until Stage 3 ports the custom admin UI to apps/cms/src/app/(admin).
// Reachable without a session — everything else under /admin needs one.
// Each of these pages does its own further redirect (e.g. login.astro
// bounces to /admin if already authenticated, or to first-register if no
// admin exists yet) — this guard only handles the one thing common to
// every /admin/* route: no session, no access.
const ADMIN_PUBLIC_PATHS = ['/admin/login', '/admin/first-register']

function isAdminPublicPath(pathname: string): boolean {
  return ADMIN_PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  if (context.url.pathname.startsWith('/admin') && !isAdminPublicPath(context.url.pathname)) {
    const user = await getAdminUser(context.cookies)
    if (!user) {
      const nextPath = encodeURIComponent(context.url.pathname + context.url.search)
      return context.redirect(`/admin/login?next=${nextPath}`)
    }
    // Stashed so admin pages don't each re-fetch /api/users/me themselves.
    context.locals.adminUser = user
  }

  return next()
}
