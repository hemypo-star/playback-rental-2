import type { GlobalConfig } from 'payload'

// Replaces the old app's generic key/value `settings` table — the only key
// that was ever actually read from it (grepped the old codebase) was
// 'hero_banner_image'. Payload Globals are the right fit for this kind of
// singleton site config, vs. a collection of arbitrary rows.
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  admin: {
    description: 'Site-wide settings (homepage banner, etc).',
  },
  fields: [
    {
      name: 'heroBannerImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Homepage hero background image.',
      },
    },
  ],
}
