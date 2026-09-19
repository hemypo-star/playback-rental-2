// Shared query-string helpers for every catalog filter/pagination link
// (category, sort, search, kit-type, page). Added alongside C5/C6 (design_
// handoff_swiss_bento/08-instruction.md) so CategorySidebar's category/sort
// links and CatalogPage's own search form and pager all agree on exactly
// which filters a given link carries forward — two independently hand-
// rolled query builders is exactly how the search form (N8) ended up
// silently dropping `type=kit` while `sort` and `q` survived; a second,
// slightly different copy in the new pager risked the same class of bug in
// brand new code the moment C5 added pagination.
export interface CatalogFilters {
  q?: string
  sort?: string
  kit?: boolean
  free?: boolean
  page?: number
}

export function buildCatalogUrl(basePath: string, filters: CatalogFilters = {}): string {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.sort) params.set('sort', filters.sort)
  if (filters.kit) params.set('type', 'kit')
  if (filters.free) params.set('free', '1')
  // A pager link sets its own target page explicitly. Every other filter
  // link (category, sort, a new search) omits `page` entirely on purpose —
  // changing what's being filtered should land back on page 1, not wherever
  // the visitor happened to have paged to under the old filter.
  if (filters.page && filters.page > 1) params.set('page', String(filters.page))
  const qs = params.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

// Parses the ?page= query param into a safe page number for Payload's
// find({ page }) — anything missing, non-numeric, fractional, zero, or
// negative (a hand-edited URL, mainly) falls back to page 1 rather than
// reaching the Local API call unvalidated.
export function parsePageParam(raw?: string): number {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : 1
}
