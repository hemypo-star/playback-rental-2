import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import AdminPageHeader from '../../../../../components/admin/AdminPageHeader'
import ProductForm from '../../../../../components/admin/ProductForm'
import { getProductById } from '../../../../../lib/data/products'
import { getProductOrderStats } from '../../../../../lib/data/popularity'
import { rub } from '../../../../../lib/admin/format'

// Ported from apps/web/src/pages/admin/products/[id].astro (docs/PLAN-next-
// migration.md Stage 3.5, page group 5) — edit-only, no create form
// (products only ever originate from sync:moysklad). Reuses lib/data/
// products.ts's existing getProductById() as-is — it already does exactly
// what this page needs (depth:1, disableErrors instead of a REST 404), no
// admin-specific wrapper required.
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

async function loadProduct(idParam: string) {
  const id = Number(idParam)
  if (!Number.isFinite(id)) redirect('/admin/stock')
  const product = await getProductById(id)
  if (!product) redirect('/admin/stock')
  return product
}

// Picker source for "Совместимые аксессуары" — every non-kit product
// (kits compose their parts via /admin/kits, not this list). Same shape as
// getKitComponentOptions() in lib/admin/data/kits.ts.
async function loadAccessoryOptions(): Promise<{ id: number; title: string; price: number; listingType: string }[]> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'products',
    where: { isKit: { not_equals: true } },
    sort: 'title',
    limit: 0,
    depth: 0,
    select: { title: true, listingType: true, price: true },
  })
  return result.docs.map((p) => ({
    id: p.id,
    title: p.title,
    listingType: String(p.listingType ?? ''),
    price: Number(p.price ?? 0),
  }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const product = await loadProduct(id)
  return { title: product.title }
}

export default async function AdminProductDetailPage({ params }: Props) {
  const { id } = await params
  const [product, accessoryOptions, orderStats] = await Promise.all([
    loadProduct(id),
    loadAccessoryOptions(),
    getProductOrderStats(),
  ])
  const categoryName = typeof product.category === 'object' ? product.category.name : '—'
  const stats = orderStats.get(product.id)

  return (
    <>
      <AdminPageHeader title={product.title} subtitle={categoryName} />
      <Link href="/admin/stock" className="text-[12.5px] font-semibold text-subtle hover:text-foreground">← Весь склад</Link>
      {/* Per-product demand (live aggregate over orders/orderItems — see
          lib/data/popularity.ts for the counting rules). */}
      <div className="flex flex-wrap gap-3 rounded-3xl border border-border bg-card px-6 py-4 text-[13px]">
        <span className="text-subtle">Заказов: <b className="text-foreground tabular-nums">{stats?.timesOrdered ?? 0}</b></span>
        <span className="text-subtle">Штук в заказах: <b className="text-foreground tabular-nums">{stats?.unitsOrdered ?? 0}</b></span>
        <span className="text-subtle">Дней аренды: <b className="text-foreground tabular-nums">{stats?.revenueDays ?? 0}</b></span>
        <span className="text-subtle">Выручка: <b className="text-foreground tabular-nums">{rub(stats?.revenue ?? 0)}</b></span>
      </div>
      <ProductForm product={product} categoryName={categoryName} accessoryOptions={accessoryOptions} />
    </>
  )
}
