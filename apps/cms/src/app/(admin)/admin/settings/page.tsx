import type { Metadata } from 'next'
import AdminPageHeader from '../../../../components/admin/AdminPageHeader'
import SettingsForm from '../../../../components/admin/SettingsForm'
import { getSiteSettingsRaw } from '../../../../lib/data/siteSettings'

// Ported from apps/web/src/pages/admin/settings.astro (docs/PLAN-next-
// migration.md Stage 3.5, page group 6 — last of Stage 3). Reuses
// lib/data/siteSettings.ts's existing getSiteSettings() as-is, same
// reasoning as the product edit page reusing getProductById() in the
// previous commit.
export const metadata: Metadata = { title: 'Настройки сайта' }
export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  // Raw: the form edits the text as typed, without storefront typography.
  const settings = await getSiteSettingsRaw()

  return (
    <>
      <AdminPageHeader title="Тексты и контакты сайта" subtitle="Главная страница, контакты и часы работы. Товары и цены приходят из МойСклад." />
      <SettingsForm settings={settings} />
    </>
  )
}
