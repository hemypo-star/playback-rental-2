'use server'

// Server Action for SiteSettings (docs/PLAN-next-migration.md Stage 3.4/
// 3.5) — same requireAdmin()-before-overrideAccess pattern as every other
// actions file in (admin)/admin/**. A single POST-the-whole-object save,
// same as the Astro source's fetch('/api/globals/site-settings') — the
// real risk here (per the 2026-08-14 dev log's Step 7 entry) is a save
// that silently omits a key on a Payload global, so this always sends
// every field, never a partial patch.
import { getPayload } from 'payload'
import { APIError } from 'payload'
import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { getAdminUser } from '../../../../lib/admin/auth'

export interface ActionResult {
  success: boolean
  error?: string
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof APIError ? error.message : fallback
}

async function requireAdmin() {
  const user = await getAdminUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export interface SiteSettingsInput {
  heroBannerImage: number | null
  heroBannerImageMobile: number | null
  heroKicker: string
  heroCity: string
  heroHeadline: string
  heroSubtext: string
  depositLabel: string
  depositCaption: string
  pickupTimeLabel: string
  pickupTimeCaption: string
  howItWorksSteps: { title: string; text: string }[]
  ctaKicker: string
  ctaHeadline: string
  ctaSubtext: string
  contactPhone: string
  contactEmail: string
  contactTelegram: string
  contactTelegramUrl: string
  contactVkUrl: string
  contactAddress: string
  contactHours: string
  businessHoursOpen: number
  businessHoursClose: number
  yandexMapsUrl: string
  twoGisUrl: string
}

export async function saveSiteSettings(data: SiteSettingsInput): Promise<ActionResult> {
  try {
    await requireAdmin()
    const payload = await getPayload({ config })
    await payload.updateGlobal({ slug: 'site-settings', data, overrideAccess: true })
    revalidatePath('/admin/settings')
    // B4 (design_handoff_swiss_bento/08-instruction.md, audit N5) — SiteSettings
    // (including businessHoursOpen/Close) now also feeds (frontend)/layout.tsx
    // itself (Navbar's hours label, and every RentalDatePicker instance via
    // BusinessHoursContext), not just the individual pages that already called
    // getSiteSettings() directly. 'layout' revalidates every route under that
    // shared segment in one call — including statically-generated routes like
    // /checkout that don't otherwise re-render on their own — so this replaces
    // the previous '/' + '/contact' pair rather than adding a third path.
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Не удалось сохранить') }
  }
}
