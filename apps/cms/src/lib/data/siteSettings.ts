import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { SiteSetting } from '../../payload-types'
import { STOREFRONT_CACHE_REVALIDATE_SECONDS, STOREFRONT_CACHE_TAGS } from './cacheTags'
import { typoFields } from '../text/typography'

// Server-only data layer (docs/PLAN-next-migration.md Stage 2 "Данные") —
// Local API instead of apps/web/src/lib/payload.ts's REST client. No
// `mutate()`/`{ doc, message }` unwrapping needed: that shape is a REST-only
// artifact, `payload.findGlobal()` returns the document directly.
const getSiteSettingsCached = unstable_cache(
  async (): Promise<SiteSetting> => {
    const payload = await getPayload({ config })
    return payload.findGlobal({ slug: 'site-settings', depth: 1 })
  },
  ['storefront-site-settings-v1'],
  {
    revalidate: STOREFRONT_CACHE_REVALIDATE_SECONDS,
    tags: [STOREFRONT_CACHE_TAGS.siteSettings],
  },
)

// React cache still dedupes concurrent reads inside one render tree; the
// persistent Next data cache underneath removes the same global query from
// subsequent requests as well.
//
// The admin edits the text as typed (getSiteSettingsRaw); the storefront gets
// it with Russian typography applied (lib/text/typography.ts) to the text
// fields only — phones, e-mails, URLs and hours numbers are left alone.
export const getSiteSettingsRaw = cache(getSiteSettingsCached)

const TEXT_FIELDS = [
  'heroKicker',
  'heroCity',
  'heroHeadline',
  'heroSubtext',
  'depositLabel',
  'depositCaption',
  'pickupTimeLabel',
  'pickupTimeCaption',
  'ctaKicker',
  'ctaHeadline',
  'ctaSubtext',
  'contactAddress',
  'contactHours',
] as const satisfies readonly (keyof SiteSetting)[]

export const getSiteSettings = cache(async (): Promise<SiteSetting> => {
  const settings = typoFields(await getSiteSettingsRaw(), TEXT_FIELDS)
  return {
    ...settings,
    howItWorksSteps: settings.howItWorksSteps?.map((step) => typoFields(step, ['title', 'text'])),
  }
})
