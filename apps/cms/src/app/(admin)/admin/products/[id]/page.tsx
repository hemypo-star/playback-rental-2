import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import AdminPageHeader from '../../../../../components/admin/AdminPageHeader'
import ProductForm from '../../../../../components/admin/ProductForm'
import { getProductById } from '../../../../../lib/data/products'

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const product = await loadProduct(id)
  return { title: product.title }
}

export default async function AdminProductDetailPage({ params }: Props) {
  const { id } = await params
  const product = await loadProduct(id)
  const categoryName = typeof product.category === 'object' ? product.category.name : '—'

  return (
    <>
      <AdminPageHeader title={product.title} subtitle={categoryName} />
      <Link href="/admin/stock" className="text-[12.5px] font-semibold text-subtle hover:text-foreground">← Весь склад</Link>
      <ProductForm product={product} categoryName={categoryName} />
    </>
  )
}
