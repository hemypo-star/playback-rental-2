import type { Metadata } from 'next'
import AdminPageHeader from '../../../../components/admin/AdminPageHeader'
import SettingsForm from '../../../../components/admin/SettingsForm'
import { getSiteSettings } from '../../../../lib/data/siteSettings'

// Ported from apps/web/src/pages/admin/settings.astro (docs/PLAN-next-
// migration.md Stage 3.5, page group 6 — last of Stage 3). Reuses
// lib/data/siteSettings.ts's existing getSiteSettings() as-is, same
// reasoning as the product edit page reusing getProductById() in the
// previous commit.
export const metadata: Metadata = { title: 'Настройки сайта' }
export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings()

  return (
    <>
      <AdminPageHeader title="Настройки сайта" subtitle="Весь некаталожный текст и картинки сайта" />
      <SettingsForm settings={settings} />
    </>
  )
}
