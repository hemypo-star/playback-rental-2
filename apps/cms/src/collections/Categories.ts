import type { CollectionConfig } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'moySkladFolderId', 'order'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-friendly identifier, e.g. "kamery" for /catalog/kamery',
      },
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Sort order in the catalog sidebar.',
      },
    },
    // Sync bookkeeping: this category mirrors a productfolder under the
    // "PlayBack Rental" subtree in МойСклад (see the Phase 0 folder audit
    // in the project plan — the account is shared with unrelated businesses,
    // so only that subtree syncs). Null for categories created manually in Payload.
    {
      name: 'moySkladFolderId',
      type: 'text',
      unique: true,
      admin: {
        readOnly: true,
        description: 'МойСклад productfolder id, set only for synced categories.',
      },
    },
  ],
}
