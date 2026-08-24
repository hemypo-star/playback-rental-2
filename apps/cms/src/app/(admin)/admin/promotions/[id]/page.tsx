import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import AdminPageHeader from '../../../../../components/admin/AdminPageHeader'
import PromotionForm from '../../../../../components/admin/PromotionForm'
import { getAdminPromotionById } from '../../../../../lib/admin/data/promotions'
import { getAdminCategories } from '../../../../../lib/admin/data/categories'
import { getAdminProducts } from '../../../../../lib/admin/data/products'

// Ported from apps/web/src/pages/admin/promotions/[id].astro (docs/PLAN-
// next-migration.md Stage 3.5, page group 5) — id === 'new' branch, same
// pattern as categories/[id]/page.tsx.
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

async function loadPromotion(idParam: string) {
  if (idParam === 'new') return { isNew: true as const, promo: null }
  const id = Number(idParam)
  if (!Number.isFinite(id)) redirect('/admin/promotions')
  const promo = await getAdminPromotionById(id)
  if (!promo) redirect('/admin/promotions')
  return { isNew: false as const, promo }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const { isNew, promo } = await loadPromotion(id)
  return { title: isNew ? 'Новая акция' : promo!.title }
}

export default async function AdminPromotionDetailPage({ params }: Props) {
  const { id } = await params
  const { isNew, promo } = await loadPromotion(id)

  const [allCategories, allProducts] = await Promise.all([getAdminCategories(), getAdminProducts()])

  return (
    <>
      <AdminPageHeader title={isNew ? 'Новая акция' : promo!.title} subtitle={isNew ? undefined : (promo!.slug ?? undefined)} />
      <Link href="/admin/promotions" className="text-[12.5px] font-semibold text-subtle hover:text-foreground">← Все акции</Link>
      <PromotionForm promo={promo} allCategories={allCategories} allProducts={allProducts} />
    </>
  )
}
