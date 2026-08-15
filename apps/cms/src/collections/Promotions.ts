import type { CollectionConfig } from 'payload'
import { slugify } from '../lib/text/slugify'

export const Promotions: CollectionConfig = {
  slug: 'promotions',
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'active', 'order'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      // Powers /promotions/:slug (the standalone landing page — ported from
      // the prod branch, absent on the stale main branch; see CLAUDE.md dev
      // log). Auto-generated from title on create if left blank, same as
      // prod's promotionService.ts.
      name: 'slug',
      type: 'text',
      unique: true,
      admin: {
        description: 'URL-friendly identifier for /promotions/:slug. Auto-generated from the title if left blank.',
      },
    },
    {
      name: 'kicker',
      type: 'text',
      admin: {
        description: 'Small label above the title on the homepage carousel (e.g. "Акция месяца").',
      },
    },
    {
      name: 'text',
      type: 'textarea',
      admin: {
        description: 'Short body text shown under the title on the homepage carousel.',
      },
    },
    {
      // Longer body shown on the standalone /promotions/:slug page — `text`
      // above stays the short carousel blurb.
      name: 'content',
      type: 'textarea',
      admin: {
        description: 'Longer body text shown on the standalone promotion page (/promotions/:slug).',
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'linkUrl',
      type: 'text',
    },
    {
      name: 'linkedProducts',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      admin: {
        description: 'Products featured on the standalone promotion page.',
      },
    },
    {
      name: 'linkedCategories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      admin: {
        description: 'Categories featured on the standalone promotion page.',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (data && !data.slug) {
          const source = (data.title as string) || (originalDoc?.title as string) || ''
          data.slug = slugify(source)
        }
        return data
      },
    ],
  },
}
