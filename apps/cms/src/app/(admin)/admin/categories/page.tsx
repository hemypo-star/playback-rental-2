import type { Metadata } from 'next'
import Link from 'next/link'
import AdminPageHeader from '../../../../components/admin/AdminPageHeader'
import { getAdminCategories } from '../../../../lib/admin/data/categories'
import { buildCategoryTree, flattenCategoryTree } from '../../../../lib/categoryTree'

// Ported from apps/web/src/pages/admin/categories/index.astro (docs/PLAN-
// next-migration.md Stage 3.5, page group 5). Категории isn't in the
// delivered mockup (it never designed a catalog-editing screen at all —
// see docs/PLAN-docker-admin.md Step 6) but needs somewhere to live,
// styled identically to the designed tabs rather than bolted on visually
// differently — same reasoning AdminSidebar.tsx's comment already covers.
export const metadata: Metadata = { title: 'Категории' }
export const dynamic = 'force-dynamic'

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories()
  const orderedCategories = flattenCategoryTree(buildCategoryTree(categories))

  return (
    <>
      <AdminPageHeader title="Категории" subtitle={`${categories.length} категорий`} actionLabel="Новая категория" actionHref="/admin/categories/new" />

      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="grid grid-cols-[2fr_1.2fr_1fr_90px] gap-3.5 px-2.5 pb-3 text-[10px] font-semibold tracking-[0.13em] text-subtle uppercase">
          <span>Название</span><span>Slug</span><span>Тег</span><span>Порядок</span>
        </div>
        {orderedCategories.map(({ category: c, depth }) => (
          <Link
            key={c.id}
            href={`/admin/categories/${c.id}`}
            className="grid grid-cols-[2fr_1.2fr_1fr_90px] items-center gap-3.5 rounded-2xl px-2.5 py-3.5 text-[13.5px] transition-colors duration-240 ease-expo hover:bg-muted"
          >
            <span className="truncate font-medium" style={{ paddingLeft: `${depth * 20}px` }}>
              {depth > 0 && <span className="mr-1.5 text-subtle">└</span>}
              {c.name}
            </span>
            <span className="truncate text-[12.5px] text-subtle">{c.slug}</span>
            <span className="truncate text-[12.5px] text-subtle">{c.tag ?? '—'}</span>
            <span>{c.order}</span>
          </Link>
        ))}
        {categories.length === 0 ? <div className="px-2.5 py-8 text-center text-[13.5px] text-subtle">Пока нет категорий</div> : null}
      </div>
    </>
  )
}
