import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import AdminPageHeader from '../../../../../components/admin/AdminPageHeader'
import CategoryForm from '../../../../../components/admin/CategoryForm'
import { getAdminCategories, getAdminCategoryById } from '../../../../../lib/admin/data/categories'
import { buildCategoryTree, flattenCategoryTree, getSubtreeIds } from '../../../../../lib/categoryTree'

// Ported from apps/web/src/pages/admin/categories/[id].astro (docs/PLAN-
// next-migration.md Stage 3.5, page group 5) — id === 'new' branch handles
// both create and edit from one page, same as the Astro source, rather
// than two near-duplicate routes.
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

async function loadCategory(idParam: string) {
  if (idParam === 'new') return { isNew: true as const, category: null }
  const id = Number(idParam)
  if (!Number.isFinite(id)) redirect('/admin/categories')
  const category = await getAdminCategoryById(id)
  if (!category) redirect('/admin/categories')
  return { isNew: false as const, category }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const { isNew, category } = await loadCategory(id)
  return { title: isNew ? 'Новая категория' : category!.name }
}

export default async function AdminCategoryDetailPage({ params }: Props) {
  const { id } = await params
  const { isNew, category } = await loadCategory(id)

  const allCategories = await getAdminCategories()
  // A category can't become its own descendant's parent (a cycle) —
  // exclude itself and its whole subtree from the picker entirely.
  const excludedIds = category ? new Set(getSubtreeIds(category.id, allCategories)) : new Set<number>()
  const parentOptions = flattenCategoryTree(buildCategoryTree(allCategories)).filter(({ category: c }) => !excludedIds.has(c.id))
  const currentParentId = category?.parent == null ? null : typeof category.parent === 'object' ? category.parent.id : category.parent

  return (
    <>
      <AdminPageHeader title={isNew ? 'Новая категория' : category!.name} subtitle={isNew ? undefined : category!.slug} />
      <Link href="/admin/categories" className="text-[12.5px] font-semibold text-subtle hover:text-foreground">← Все категории</Link>
      <CategoryForm category={category} parentOptions={parentOptions} currentParentId={currentParentId} />
    </>
  )
}
