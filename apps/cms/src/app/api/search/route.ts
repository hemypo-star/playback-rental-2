import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { searchCatalog } from '@/lib/data/search'

// JSON feed for the header's live search dropdown. Deliberately a thin route
// handler over lib/data/search.ts (the same function the /search page calls)
// rather than a Server Action or a Payload custom endpoint: the dropdown is a
// storefront read that must work before any session/CSRF context exists, and
// Payload endpoints are admin-scoped by convention here.
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('q') ?? ''
  const result = await searchCatalog({ raw })
  return NextResponse.json(result, { headers: { 'Cache-Control': 'public, max-age=30' } })
}
