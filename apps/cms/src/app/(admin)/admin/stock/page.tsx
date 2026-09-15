import type { Metadata } from 'next'
import { Fragment } from 'react'
import Link from 'next/link'
import AdminPageHeader from '../../../../components/admin/AdminPageHeader'
import AdminMobileCard from '../../../../components/admin/AdminMobileCard'
import { getAdminStock } from '../../../../lib/admin/data/stock'
import { getAdminCategories } from '../../../../lib/admin/data/categories'
import { rub, STOCK_STATUS_TONE } from '../../../../lib/admin/format'

// Ported from apps/web/src/pages/admin/stock.astro (docs/PLAN-next-
// migration.md Stage 3.5, page group 4). Read-only listing — editing
// (price/quantity/available) is page group 5 (products/[id]); products
// can't be created manually regardless, they only exist via
// sync:moysklad (moySkladId is required + readOnly on Products).
// D5 (search/filters) added the GET form below — same plain-form/
// searchParams pattern as /admin/orders, no client island needed.
export const metadata: Metadata = { title: 'Склад и цены' }
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ q?: string; category?: string }>
}

export default async function AdminStockPage({ searchParams }: Props) {
  const { q: qParam, category: categoryParam } = await searchParams
  const q = qParam?.trim() || undefined
  const category = categoryParam ? Number(categoryParam) : undefined
  const categoryFilter = category !== undefined && Number.isFinite(category) ? category : undefined
  const hasFilters = Boolean(q || categoryFilter !== undefined)

  const [products, categories] = await Promise.all([getAdminStock({ q, category: categoryFilter }), getAdminCategories()])

  return (
    <>
      <AdminPageHeader title="Склад и цены" subtitle={hasFilters ? `${products.length} позиций по фильтру` : `${products.length} позиций`} />

      <form method="GET" className="flex flex-wrap items-end gap-3 rounded-3xl border border-border bg-card p-6">
        <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
          <label htmlFor="stock-q" className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">
            Поиск
          </label>
          <input
            id="stock-q"
            type="text"
            name="q"
            defaultValue={qParam ?? ''}
            placeholder="Название"
            className="h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="stock-category" className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">
            Категория
          </label>
          <select
            id="stock-category"
            name="category"
            defaultValue={categoryFilter !== undefined ? String(categoryFilter) : ''}
            className="h-11 min-w-[190px] rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground"
          >
            <option value="">Все категории</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary h-11">
          Найти
        </button>
      </form>

      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="hidden grid-cols-[2fr_1.2fr_90px_110px_130px] gap-3.5 px-2.5 pb-3 text-[10px] font-semibold tracking-[0.13em] text-subtle uppercase lg:grid">
          <span>Позиция</span><span>Категория</span><span>Остаток</span><span>Цена</span><span>Статус</span>
        </div>
        <div className="flex flex-col gap-2.5 lg:contents">
          {products.map((p, i) => {
            const tone = STOCK_STATUS_TONE[p.status]
            const badge = (
              <span
                className="justify-self-start rounded-full px-3 py-1.5 text-[10px] font-semibold tracking-[0.1em] uppercase"
                style={{ background: tone.bg, color: tone.color }}
              >
                {tone.label}
              </span>
            )
            return (
              <Fragment key={p.id}>
                <Link
                  href={`/admin/products/${p.id}`}
                  className="hidden grid-cols-[2fr_1.2fr_90px_110px_130px] items-center gap-3.5 rounded-2xl px-2.5 py-3.5 text-[13.5px] transition-colors duration-240 ease-expo hover:bg-muted lg:grid"
                  style={{ animation: 'bnIn 560ms var(--ease-expo) both', animationDelay: `${Math.min(i * 55, 400)}ms` }}
                >
                  <span className="truncate font-medium">{p.title}</span>
                  <span className="truncate text-[12.5px] text-subtle">{p.category ?? '—'}</span>
                  <span>{p.quantity}</span>
                  <span className="font-semibold">{rub(p.price)}</span>
                  {badge}
                </Link>
                <AdminMobileCard
                  href={`/admin/products/${p.id}`}
                  title={p.title}
                  badge={badge}
                  fields={[
                    { label: 'Категория', value: p.category ?? '—' },
                    { label: 'Остаток', value: p.quantity },
                    { label: 'Цена', value: rub(p.price) },
                  ]}
                />
              </Fragment>
            )
          })}
        </div>
        {products.length === 0 ? (
          <div className="px-2.5 py-8 text-center text-[13.5px] text-subtle">
            {hasFilters ? 'По этому фильтру ничего не найдено' : 'Пока нет товаров'}
          </div>
        ) : null}
      </div>
    </>
  )
}
