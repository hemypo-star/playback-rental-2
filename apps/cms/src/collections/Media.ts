import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
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
