// Shared cache tags for storefront data that is expensive enough to reuse
// across requests but safe to refresh on a short cadence. Keep these tags
// centralized so Server Actions can invalidate the exact same entries the
// read layer creates.
export const STOREFRONT_CACHE_TAGS = {
  categories: 'storefront:categories',
  siteSettings: 'storefront:site-settings',
  catalogFacets: 'storefront:catalog-facets',
} as const

// External writers (notably the standalone MoySklad sync/reconcile process)
// do not run inside a Next Server Action and therefore cannot call updateTag
// in this process. A short TTL is the fallback that bounds stale aggregate
// data after those writes while still removing repeated DB work under normal
// storefront traffic.
export const STOREFRONT_CACHE_REVALIDATE_SECONDS = 60
