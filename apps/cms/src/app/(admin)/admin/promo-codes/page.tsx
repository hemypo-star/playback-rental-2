import type { Metadata } from 'next'
import AdminPageHeader from '../../../../components/admin/AdminPageHeader'
import PromoCodesPanel from '../../../../components/admin/PromoCodesPanel'
import { getAdminPromoCodes } from '../../../../lib/admin/data/promoCodes'

// Промокоды (backlog item 5, docs/ROADMAP-2.0.md) — not in the delivered
// mockup either, same reasoning as Категории/Акции/Медиатека/Пользователи/
// Настройки (AdminSidebar.tsx's own comment). Single-page inline-editing
// shape per the owner's own correction: one panel lists and mutates rows in
// place (UsersPanel.tsx's precedent), not a list+[id] detail-page pair.
export const metadata: Metadata = { title: 'Промокоды' }
export const dynamic = 'force-dynamic'

export default async function AdminPromoCodesPage() {
  const promoCodes = await getAdminPromoCodes()

  return (
    <>
      <AdminPageHeader title="Промокоды" subtitle={`${promoCodes.length} промокодов`} />
      <PromoCodesPanel promoCodes={promoCodes} />
    </>
  )
}
