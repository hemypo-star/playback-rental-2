import { NextResponse, type NextRequest } from 'next/server'

// Early gate for the custom admin: no Payload session cookie → straight to the
// login page, before any admin route (page, RSC payload, route handler or
// server action) runs. This is only a cheap presence check; the real session
// check is requireAdminSession() in every lib/admin/data loader and
// requireAdmin()/getAdminUser() in every admin server action, so a forged or
// expired cookie still gets nothing.
//
// /admin/login and /admin/first-register live under (frontend) and must stay
// reachable without a session.
const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/first-register']

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  if (PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next()
  // Payload accepts the session either as the cookie or as an
  // `Authorization: JWT …` header (the API-driven smokes use the header).
  if (request.cookies.has('payload-token') || request.headers.has('authorization')) return NextResponse.next()

  const login = new URL('/admin/login', request.url)
  if (request.method === 'GET' && !request.headers.has('rsc')) login.searchParams.set('next', `${pathname}${search}`)
  return NextResponse.redirect(login)
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
