import type { Metadata } from 'next'
import CatalogPage from '../../../components/CatalogPage'
import { buildMetadata } from '../../../lib/seo'
import { parsePageParam } from '../../../lib/catalogQuery'

// Ported from apps/web/src/pages/catalog/index.astro (docs/PLAN-next-
// migration.md Stage 2). searchParams is a Promise in the App Router
// (Next 15+) — unlike Astro.url.searchParams, which was synchronous.
export const metadata: Metadata = buildMetadata({ title: 'Каталог техники', path: '/catalog' })

// Search/sort/kit-filter results depend entirely on the query string, which
// Next can't know ahead of time — same reasoning as the homepage's
// force-dynamic, applied here via the request-time searchParams read itself
// (using searchParams already opts a route into dynamic rendering).
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ q?: string; sort?: string; type?: string; page?: string }>
}

export default async function CatalogIndexPage({ searchParams }: Props) {
  const { q, sort, type, page } = await searchParams
  const kitOnly = type === 'kit'

  return <CatalogPage searchQuery={q} sort={sort} kitOnly={kitOnly} page={parsePageParam(page)} />
}
