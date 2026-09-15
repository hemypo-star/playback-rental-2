import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { SiteSetting } from '../../payload-types'

// Server-only data layer (docs/PLAN-next-migration.md Stage 2 "Данные") —
// Local API instead of apps/web/src/lib/payload.ts's REST client. No
// `mutate()`/`{ doc, message }` unwrapping needed: that shape is a REST-only
// artifact, `payload.findGlobal()` returns the document directly.
//
// `cache()`-wrapped (B4, design_handoff_swiss_bento/08-instruction.md) since
// (frontend)/layout.tsx now calls this too, alongside every page.tsx and
// Footer.tsx that already did — without the wrap, a single request would
// fire this same Local API query 2-3x independently (layout.tsx, the page's
// own page.tsx, Footer.tsx), same duplicate-call risk
// `lib/data/promotions.ts`'s `getPromotionBySlug()` was fixed for on
// 2026-08-20 (Stage 2 part 6's dev log entry).
export const getSiteSettings = cache(async (): Promise<SiteSetting> => {
  const payload = await getPayload({ config })
  return payload.findGlobal({ slug: 'site-settings', depth: 1 })
})
