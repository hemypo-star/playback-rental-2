import type { Metadata } from 'next'
import Link from 'next/link'
import AdminPageHeader from '../../../../components/admin/AdminPageHeader'
import { getAdminStock } from '../../../../lib/admin/data/stock'
import { rub, STOCK_STATUS_TONE } from '../../../../lib/admin/format'

// Ported from apps/web/src/pages/admin/stock.astro (docs/PLAN-next-
// migration.md Stage 3.5, page group 4). Read-only listing — editing
// (price/quantity/available) is page group 5 (products/[id]); products
// can't be created manually regardless, they only exist via
// sync:moysklad (moySkladId is required + readOnly on Products).
export const metadata: Metadata = { title: 'Склад и цены' }
export const dynamic = 'force-dynamic'

export default async function AdminStockPage() {
  const products = await getAdminStock()

  return (
    <>
      <AdminPageHeader title="Склад и цены" subtitle={`${products.length} позиций`} />

      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="grid grid-cols-[2fr_1.2fr_90px_110px_130px] gap-3.5 px-2.5 pb-3 text-[10px] font-semibold tracking-[0.13em] text-subtle uppercase">
          <span>Позиция</span><span>Категория</span><span>Остаток</span><span>Цена</span><span>Статус</span>
        </div>
        {products.map((p, i) => {
          const tone = STOCK_STATUS_TONE[p.status]
          return (
            <Link
              key={p.id}
              href={`/admin/products/${p.id}`}
              className="grid grid-cols-[2fr_1.2fr_90px_110px_130px] items-center gap-3.5 rounded-2xl px-2.5 py-3.5 text-[13.5px] transition-colors duration-240 ease-expo hover:bg-muted"
              style={{ animation: 'bnIn 560ms cubic-bezier(0.16,1,0.3,1) both', animationDelay: `${Math.min(i * 55, 400)}ms` }}
            >
              <span className="truncate font-medium">{p.title}</span>
              <span className="truncate text-[12.5px] text-subtle">{p.category ?? '—'}</span>
              <span>{p.quantity}</span>
              <span className="font-semibold">{rub(p.price)}</span>
              <span
                className="justify-self-start rounded-full px-3 py-1.5 text-[10px] font-semibold tracking-[0.1em] uppercase"
                style={{ background: tone.bg, color: tone.color }}
              >
                {tone.label}
              </span>
            </Link>
          )
        })}
        {products.length === 0 ? <div className="px-2.5 py-8 text-center text-[13.5px] text-subtle">Пока нет товаров</div> : null}
      </div>
    </>
  )
}
