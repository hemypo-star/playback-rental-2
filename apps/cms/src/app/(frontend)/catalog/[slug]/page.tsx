import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import CatalogPage from '../../../../components/CatalogPage'
import { getCategoryBySlug } from '../../../../lib/data/categories'
import { mediaUrl } from '../../../../lib/mediaUrl'
import { buildMetadata } from '../../../../lib/seo'
import { parsePageParam } from '../../../../lib/catalogQuery'

// Ported from apps/web/src/pages/catalog/[slug].astro (docs/PLAN-next-
// migration.md Stage 2). Astro.redirect() -> next/navigation's redirect().
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  if (!category) return buildMetadata({ title: 'Каталог', path: `/catalog/${slug}` })
  return buildMetadata({
    title: category.name,
    description: category.description ?? undefined,
    path: `/catalog/${slug}`,
    image: mediaUrl(category.image),
  })
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)

  if (!category) {
    redirect('/catalog')
  }

  const { q, sort, page } = await searchParams

  return <CatalogPage activeCategory={category} searchQuery={q} sort={sort} page={parsePageParam(page)} />
}
