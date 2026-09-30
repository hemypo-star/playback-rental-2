import type { MetadataRoute } from 'next'
import { siteOrigin } from '../lib/seo'

// Ported from apps/web/src/pages/robots.txt.ts (pre-Next.js-migration
// `im9cfz` branch) to Next's native MetadataRoute.Robots convention.
// Disallows the same three surfaces the old file did: /admin (this app's
// own custom admin UI), /checkout (a real form/mutation, no reason to be
// indexed), and /api (Payload's REST surface, not page content).
export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin()
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/checkout', '/api/'],
    },
    sitemap: `${origin}/sitemap.xml`,
  }
}
