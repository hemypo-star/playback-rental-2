import type { MiddlewareHandler } from 'astro'
import { getAdminUser } from './lib/admin/session'

// Reverse-proxies the CMS through this app's own origin so the storefront
// and Payload's native admin live on one public port, with it reachable at
// /cms as if it were native to this app (Payload's own routes.admin is
// configured to /cms in payload.config.ts to match). /admin is intentionally
// NOT proxied — it's reserved for this app's own custom admin UI (Astro
// routes, see docs/PLAN-docker-admin.md Step 3), which calls the CMS's REST
// API directly rather than being served by it. /api carries the CMS's REST
// API (used by both admin UIs' browser-side calls) and /api/media/file/* —
// /_next is the CMS's own Next.js build assets, needed for /cms to
// render/style correctly once its HTML is loaded through the proxy.
// This is the proxy target — always the *internal* address of the CMS
// (e.g. http://cms:3000 in Docker), never the public/browser-facing one.
// Mirrors CMS_INTERNAL_URL in lib/payload.ts's server-side apiBase().
//
// Read via process.env, not import.meta.env: this middleware is
// server-only (never bundled to the browser), but import.meta.env.* still
// gets statically inlined at *build* time by Vite/Astro regardless — in
// Docker this value isn't known until the container starts, so the
// build-time value (nothing) would get baked in permanently and every
// proxied request would try http://localhost:3000 instead of
// http://cms:3000. process.env is read fresh at actual runtime.
const PAYLOAD_URL = process.env.CMS_INTERNAL_URL || process.env.PUBLIC_PAYLOAD_URL || 'http://localhost:3000'
const PAYLOAD_ORIGIN = new URL(PAYLOAD_URL).origin

const PROXIED_PREFIXES = ['/cms', '/api', '/_next']

function isProxiedPath(pathname: string): boolean {
  return PROXIED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

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

  if (!isProxiedPath(context.url.pathname)) {
    return next()
  }

  const target = new URL(`${context.url.pathname}${context.url.search}`, PAYLOAD_URL)

  const headers = new Headers(context.request.headers)
  headers.set('host', target.host)
  headers.delete('content-length')
  // Ask the upstream not to compress. undici (Node's fetch, used below)
  // transparently decompresses gzip/br bodies but leaves the response's
  // content-encoding header untouched — so `upstream.body` here is already
  // plain bytes while `upstream.headers` still claims it's gzip. Copying
  // that header downstream made the browser try to gunzip plain bytes:
  // HTML often survived (mostly ASCII, gunzip fails soft in some paths),
  // but CSS/JS did not, which is why /admin rendered with variables applied
  // but no component styles. Requesting identity encoding avoids the
  // mismatch at the source instead of trying to reconstruct it after.
  headers.set('accept-encoding', 'identity')

  const init: RequestInit = {
    method: context.request.method,
    headers,
    redirect: 'manual',
  }
  if (!['GET', 'HEAD'].includes(context.request.method) && context.request.body) {
    init.body = context.request.body
    // Node's fetch (undici) requires this when the body is a stream.
    ;(init as { duplex?: string }).duplex = 'half'
  }

  const upstream = await fetch(target, init)

  const responseHeaders = new Headers(upstream.headers)
  // Defensive: even with identity encoding requested above, strip these so
  // a future change upstream can't reintroduce the content-encoding/body
  // mismatch silently. Content-Length is also unreliable here since Astro
  // may re-chunk the body when relaying the response.
  responseHeaders.delete('content-encoding')
  responseHeaders.delete('content-length')
  // The CMS issues redirects against its own internal origin (e.g. after
  // login) — rewrite those back to this origin so the browser stays on the
  // unified port instead of jumping straight to the CMS's real port.
  const location = responseHeaders.get('location')
  if (location) {
    try {
      const resolved = new URL(location, PAYLOAD_URL)
      if (resolved.origin === PAYLOAD_ORIGIN) {
        responseHeaders.set('location', `${resolved.pathname}${resolved.search}${resolved.hash}`)
      }
    } catch {
      // Already a relative location — nothing to rewrite.
    }
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  })
}
