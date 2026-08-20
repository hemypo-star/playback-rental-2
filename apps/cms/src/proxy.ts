import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Stage 1 of docs/PLAN-next-migration.md: Next is now the single public
// entry point (proxy direction reversed from apps/web/src/middleware.ts,
// which used to do the opposite). Everything not yet ported to (frontend)/
// (admin) falls back to the still-live Astro app (apps/web) over the
// compose network — including /admin/*, which Astro's own middleware still
// guards with a session check for now (see that file's comment). (payload)
// already serves /cms, /api, /_next natively and is excluded from the
// matcher below, same as the moved public assets (favicon, fonts) — both
// must never be proxied. Each route drops out of the matcher's negative
// lookahead as it's ported in Stage 2/3; this whole file disappears in
// Stage 4 alongside apps/web itself.
//
// Named/filed as `proxy.ts`, not `middleware.ts` — Next 16 renamed the
// convention (this app was upgraded to 16.3 in Stage 0.2, so it's written
// the current way from the start rather than starting on the deprecated
// name). No `runtime` export: proxy.ts always runs on the Node.js runtime,
// unlike middleware.ts which defaulted to Edge — exactly what a real
// undici-backed fetch proxy needs (see the duplex/accept-encoding handling
// below), without having to opt in explicitly.
//
// WEB_INTERNAL_URL is deliberately read via process.env, not
// import.meta.env/NEXT_PUBLIC_* — this needs to resolve at actual runtime
// (the Docker-internal http://web:4321 isn't known at build time), not get
// statically inlined at build time. Mirrors CMS_INTERNAL_URL's own reasoning
// in apps/web/src/lib/payload.ts.
const WEB_INTERNAL_URL = process.env.WEB_INTERNAL_URL || 'http://localhost:4321'
const WEB_ORIGIN = new URL(WEB_INTERNAL_URL).origin

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const target = new URL(`${pathname}${search}`, WEB_INTERNAL_URL)

  const headers = new Headers(request.headers)
  headers.set('host', target.host)
  headers.delete('content-length')
  // Same undici gzip double-decode bug apps/web's own (now fallback-only)
  // proxy logic already worked around in the other direction — undici
  // transparently decompresses the upstream body but leaves
  // content-encoding claiming it's still gzip. Ask for identity encoding at
  // the source instead of trying to reconcile the mismatch after the fact.
  headers.set('accept-encoding', 'identity')

  const init: RequestInit & { duplex?: string } = {
    method: request.method,
    headers,
    redirect: 'manual',
  }
  if (!['GET', 'HEAD'].includes(request.method) && request.body) {
    init.body = request.body
    // Node's fetch (undici) requires this when the body is a stream.
    init.duplex = 'half'
  }

  const upstream = await fetch(target, init)

  const responseHeaders = new Headers(upstream.headers)
  responseHeaders.delete('content-encoding')
  responseHeaders.delete('content-length')
  // Astro issues redirects (e.g. the /admin session guard) against its own
  // internal origin (or a bare relative path) — rewrite those to an
  // absolute URL on *this* request's own origin so the browser stays on
  // the unified public port. Must stay absolute, not just relative
  // pathname+search+hash: Next's own Node-runtime proxy handling chokes
  // with "TypeError: Invalid URL" on a relative Location header (it calls
  // `new URL(header)` internally with no base), unlike Astro's plain
  // Node server, which apps/web's own former proxy.ts equivalent relied on.
  const location = responseHeaders.get('location')
  if (location) {
    try {
      const resolved = new URL(location, WEB_INTERNAL_URL)
      if (resolved.origin === WEB_ORIGIN) {
        responseHeaders.set('location', `${request.nextUrl.origin}${resolved.pathname}${resolved.search}${resolved.hash}`)
      }
    } catch {
      // Not resolvable even against WEB_INTERNAL_URL — leave it as-is.
    }
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  })
}

// Excludes what this app already serves natively: (payload)'s /cms, /api,
// /_next, the public assets moved into apps/cms/public (favicon, fonts),
// and each (frontend) route as Stage 2 ports it — proxying those to Astro
// would just be a slower, wrong-origin round-trip to routes/files that
// already resolve correctly here. Update this list every time a page moves.
export const config = {
  matcher: ['/((?!cms|api|_next|favicon\\.ico|favicon\\.svg|fonts/|privacy-policy|user-agreement|how-it-works|contact).*)'],
}
