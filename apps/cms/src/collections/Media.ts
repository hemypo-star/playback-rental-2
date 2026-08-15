import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  admin: {
    useAsTitle: 'alt',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
    {
      // Set when this media was pulled in from МойСклад (product/category images),
      // so the sync job can skip re-downloading images it has already imported.
      name: 'moySkladImageHref',
      type: 'text',
      unique: true,
      admin: {
        readOnly: true,
        description: 'Source МойСклад image URL, set only for synced images.',
      },
    },
  ],
  upload: {
    // Relative (resolved against cwd, i.e. apps/cms — matches local dev)
    // unless overridden with an absolute path, which Docker does to point
    // at a mounted volume (see compose.yaml) so uploads survive container
    // recreation independently of the image.
    staticDir: process.env.MEDIA_STATIC_DIR || 'media',
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 400,
        position: 'centre',
      },
    ],
    mimeTypes: ['image/*'],
  },
}
